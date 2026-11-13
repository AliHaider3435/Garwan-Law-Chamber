BEGIN;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS code_station text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS tehsil text,
  ADD COLUMN IF NOT EXISTS type_other text,
  ADD COLUMN IF NOT EXISTS stage_other text;

CREATE TABLE IF NOT EXISTS public.login_rate_limits (
  rate_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count > 0)
);

ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_rate_limits TO service_role;
CREATE INDEX IF NOT EXISTS login_rate_limits_window_started_at_idx
  ON public.login_rate_limits (window_started_at);

CREATE OR REPLACE FUNCTION public.consume_login_attempt(
  p_ip_key text,
  p_account_key text,
  p_ip_max_attempts integer DEFAULT 30,
  p_account_max_attempts integer DEFAULT 10
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_key text;
  v_count integer;
  v_limit integer;
  v_allowed boolean := true;
BEGIN
  IF p_ip_max_attempts < 1 OR p_ip_max_attempts > 1000
    OR p_account_max_attempts < 1 OR p_account_max_attempts > 100
    OR p_ip_key !~ '^[0-9a-f]{64}$'
    OR p_account_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid login limit request' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT p_ip_key LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
    v_limit := p_ip_max_attempts;
    INSERT INTO public.login_rate_limits AS limits (rate_key, window_started_at, attempt_count)
    VALUES (v_key, now(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET
      attempt_count = CASE
        WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
        ELSE LEAST(limits.attempt_count + 1, v_limit + 1)
      END,
      window_started_at = CASE
        WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
        ELSE limits.window_started_at
      END;

    SELECT attempt_count INTO v_count
    FROM public.login_rate_limits WHERE rate_key = v_key;
    IF v_count > v_limit THEN
      RETURN false;
    END IF;
  END LOOP;

  IF p_account_key <> p_ip_key THEN
    v_key := p_account_key;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));
    v_limit := p_account_max_attempts;
    INSERT INTO public.login_rate_limits AS limits (rate_key, window_started_at, attempt_count)
    VALUES (v_key, now(), 1)
    ON CONFLICT (rate_key) DO UPDATE SET
      attempt_count = CASE
        WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
        ELSE LEAST(limits.attempt_count + 1, v_limit + 1)
      END,
      window_started_at = CASE
        WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
        ELSE limits.window_started_at
      END;

    SELECT attempt_count INTO v_count
    FROM public.login_rate_limits WHERE rate_key = v_key;
    IF v_count > v_limit THEN
      v_allowed := false;
    END IF;
  END IF;

  WITH expired AS (
    SELECT ctid
    FROM public.login_rate_limits
    WHERE window_started_at < now() - interval '1 day'
    ORDER BY window_started_at
    LIMIT 500
  )
  DELETE FROM public.login_rate_limits limits
  USING expired
  WHERE limits.ctid = expired.ctid;

  RETURN v_allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_login_attempt(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_attempt(text, text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_login_attempts(
  p_ip_key text,
  p_account_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_ip_key !~ '^[0-9a-f]{64}$'
    OR p_account_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid login limit request' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_key, 0));
  IF p_account_key <> p_ip_key THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_account_key, 0));
  END IF;
  DELETE FROM public.login_rate_limits
  WHERE rate_key = p_ip_key OR rate_key = p_account_key;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_login_attempts(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_case_with_associates(
  p_case_id uuid,
  p_case jsonb,
  p_associate_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_case public.cases%ROWTYPE;
  v_case_id uuid;
BEGIN
  SELECT * INTO v_case FROM jsonb_populate_record(NULL::public.cases, p_case);
  IF v_case.title IS NULL OR length(btrim(v_case.title)) = 0 THEN
    RAISE EXCEPTION 'Case title is required' USING ERRCODE = '22023';
  END IF;
  IF coalesce(cardinality(p_associate_ids), 0) <>
     (SELECT count(DISTINCT id) FROM unnest(coalesce(p_associate_ids, ARRAY[]::uuid[])) AS ids(id)) THEN
    RAISE EXCEPTION 'Duplicate associate assignment' USING ERRCODE = '22023';
  END IF;

  IF p_case_id IS NULL THEN
    INSERT INTO public.cases (
      title, case_no, court, judge, client_name, client_phone, opposing_party,
      case_type, type_other, fir_no, police_station, code_station, district, tehsil,
      sections, stage, stage_other, status, next_hearing, decided_on, outcome
    ) VALUES (
      v_case.title, v_case.case_no, v_case.court, v_case.judge, v_case.client_name,
      v_case.client_phone, v_case.opposing_party, v_case.case_type, v_case.type_other,
      v_case.fir_no, v_case.police_station, v_case.code_station, v_case.district,
      v_case.tehsil, v_case.sections, v_case.stage, v_case.stage_other, v_case.status,
      v_case.next_hearing, v_case.decided_on, v_case.outcome
    ) RETURNING id INTO v_case_id;
  ELSE
    UPDATE public.cases SET
      title = v_case.title, case_no = v_case.case_no, court = v_case.court,
      judge = v_case.judge, client_name = v_case.client_name, client_phone = v_case.client_phone,
      opposing_party = v_case.opposing_party, case_type = v_case.case_type,
      type_other = v_case.type_other, fir_no = v_case.fir_no, police_station = v_case.police_station,
      code_station = v_case.code_station, district = v_case.district, tehsil = v_case.tehsil,
      sections = v_case.sections, stage = v_case.stage, stage_other = v_case.stage_other,
      status = v_case.status, next_hearing = v_case.next_hearing,
      decided_on = v_case.decided_on, outcome = v_case.outcome
    WHERE id = p_case_id
    RETURNING id INTO v_case_id;

    IF v_case_id IS NULL THEN
      RAISE EXCEPTION 'Case not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.case_associates WHERE case_id = v_case_id;
  BEGIN
    INSERT INTO public.case_associates (case_id, associate_id)
    SELECT v_case_id, id
    FROM unnest(coalesce(p_associate_ids, ARRAY[]::uuid[])) AS ids(id);
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'One or more assigned associates do not exist' USING ERRCODE = '22023';
  END;

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_case_with_associates(uuid, jsonb, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_case_with_associates(uuid, jsonb, uuid[]) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
