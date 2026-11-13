import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const migrationUrl = new URL('../supabase/migrations/20261113000000_add_case_metadata_columns.sql', import.meta.url);
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const key = (number) => number.toString(16).padStart(64, '0');

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      case_no text,
      court text,
      judge text,
      client_name text,
      client_phone text,
      opposing_party text,
      case_type text,
      fir_no text,
      police_station text,
      sections text,
      stage text,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'decided')),
      next_hearing date,
      decided_on date,
      outcome text,
      created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.associates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      phone text
    );
    CREATE TABLE public.case_associates (
      case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
      associate_id uuid REFERENCES public.associates(id) ON DELETE CASCADE,
      PRIMARY KEY (case_id, associate_id)
    );
  `);
  const before = [];
  for (let i = 1; i <= 81; i++) {
    before.push({ id: uuid(i), title: `Existing case ${i}`, case_no: `CN-${i}` });
  }
  for (const row of before) {
    await db.query(
      'INSERT INTO public.cases (id, title, case_no) VALUES ($1, $2, $3)',
      [row.id, row.title, row.case_no],
    );
  }
  await db.exec(await readFile(migrationUrl, 'utf8'));
  return { db, before };
}

test('PostgreSQL migration preserves all 81 rows and adds nullable independent metadata columns', async (t) => {
  const { db, before } = await setup();
  t.after(() => db.close());
  const { rows } = await db.query(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases'
      AND column_name = ANY($1::text[])
  `, [['code_station', 'district', 'tehsil', 'type_other', 'stage_other']]);
  assert.equal(rows.length, 5);
  for (const column of rows) {
    assert.equal(column.is_nullable, 'YES');
    assert.equal(column.data_type, 'text');
  }
  const { rows: cases } = await db.query(
    'SELECT id, title, case_no, police_station, code_station, district, tehsil FROM public.cases ORDER BY id',
  );
  assert.equal(cases.length, 81);
  for (let i = 0; i < before.length; i++) {
    assert.equal(cases[i].id, before[i].id);
    assert.equal(cases[i].title, before[i].title);
    assert.equal(cases[i].case_no, before[i].case_no);
    assert.equal(cases[i].code_station, null);
    assert.equal(cases[i].district, null);
    assert.equal(cases[i].tehsil, null);
  }
});

test('privileged RPCs use invoker rights, explicit safe paths and service-role-only execute grants', async (t) => {
  const { db } = await setup();
  t.after(() => db.close());
  const { rows } = await db.query(`
    SELECT p.proname, p.prosecdef, p.proconfig,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_can_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
      pg_get_userbyid(p.proowner) AS owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('consume_login_attempt', 'reset_login_attempts', 'save_case_with_associates')
  `);
  assert.equal(rows.length, 3);
  for (const fn of rows) {
    assert.equal(fn.prosecdef, false, `${fn.proname} must not run as SECURITY DEFINER`);
    assert.ok(fn.proconfig.some((value) => value.includes('search_path=pg_catalog, public, pg_temp')));
    assert.equal(fn.service_can_execute, true);
    assert.equal(fn.anon_can_execute, false);
    assert.equal(fn.authenticated_can_execute, false);
    assert.equal(fn.owner, 'postgres');
  }
  const { rows: signatures } = await db.query(`
    SELECT p.proname, p.proargnames, pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_result(p.oid) AS result_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('consume_login_attempt', 'reset_login_attempts', 'save_case_with_associates')
  `);
  const consume = signatures.find((fn) => fn.proname === 'consume_login_attempt');
  assert.deepEqual(consume.proargnames, [
    'p_ip_key', 'p_account_key', 'p_ip_max_attempts', 'p_account_max_attempts',
  ]);
  assert.equal(consume.result_type, 'boolean');
  const reset = signatures.find((fn) => fn.proname === 'reset_login_attempts');
  assert.deepEqual(reset.proargnames, ['p_ip_key', 'p_account_key']);
  assert.equal(reset.result_type, 'void');
  const save = signatures.find((fn) => fn.proname === 'save_case_with_associates');
  assert.deepEqual(save.proargnames, ['p_case_id', 'p_case', 'p_associate_ids']);
  assert.equal(save.result_type, 'uuid');
  const { rows: table } = await db.query(`
    SELECT c.relrowsecurity AS rls_enabled,
      has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
      has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
    FROM pg_class c
    WHERE c.oid = 'public.login_rate_limits'::regclass
  `);
  assert.deepEqual(table[0], { rls_enabled: true, anon_select: false, authenticated_select: false });
});

test('case create, update and assignment changes are atomic on foreign-key failures', async (t) => {
  const { db } = await setup();
  t.after(() => db.close());
  const assigned = uuid(1000);
  const missing = uuid(2000);
  await db.query('INSERT INTO public.associates (id, name) VALUES ($1, $2)', [assigned, 'Assigned']);
  const caseRow = {
    title: 'RPC case',
    case_no: 'RPC-1',
    police_station: 'Central station',
    code_station: 'CENT-01',
    district: 'District',
    tehsil: 'Tehsil',
    type_other: 'Special type',
    stage_other: 'Waiting',
    status: 'active',
  };
  const payload = JSON.stringify(caseRow);

  await assert.rejects(db.query(
    'SELECT public.save_case_with_associates(NULL, $1::jsonb, $2::uuid[])',
    [payload, [assigned, missing]],
  ));
  let count = await db.query('SELECT count(*)::int AS count FROM public.cases');
  assert.equal(count.rows[0].count, 81, 'failed create must leave no partial case');
  let assignments = await db.query('SELECT count(*)::int AS count FROM public.case_associates');
  assert.equal(assignments.rows[0].count, 0);

  const caseId = uuid(3000);
  await db.query(
    'INSERT INTO public.cases (id, title, case_no) VALUES ($1, $2, $3)',
    [caseId, 'Before update', 'RPC-2'],
  );
  await db.query(
    'INSERT INTO public.case_associates (case_id, associate_id) VALUES ($1, $2)',
    [caseId, assigned],
  );
  await assert.rejects(db.query(
    'SELECT public.save_case_with_associates($1, $2::jsonb, $3::uuid[])',
    [caseId, JSON.stringify({ ...caseRow, title: 'Should roll back' }), [missing]],
  ));
  const existing = await db.query('SELECT title, case_no FROM public.cases WHERE id = $1', [caseId]);
  assert.deepEqual(existing.rows[0], { title: 'Before update', case_no: 'RPC-2' });
  const originalAssignment = await db.query(
    'SELECT associate_id FROM public.case_associates WHERE case_id = $1',
    [caseId],
  );
  assert.deepEqual(originalAssignment.rows, [{ associate_id: assigned }]);
});

test('login limits enforce separate IP/account thresholds, expiry, concurrency and bounded cleanup', async (t) => {
  const { db } = await setup();
  t.after(() => db.close());
  const consume = async (ip, account, ipLimit = 30, accountLimit = 10) => {
    const result = await db.query(
      'SELECT public.consume_login_attempt($1, $2, $3, $4) AS allowed',
      [ip, account, ipLimit, accountLimit],
    );
    return result.rows[0].allowed;
  };

  const accountIp = key(1);
  const account = key(2);
  for (let i = 0; i < 10; i++) assert.equal(await consume(accountIp, account), true);
  assert.equal(await consume(accountIp, account), false);
  await db.query('SELECT public.reset_login_attempts($1, $2)', [accountIp, account]);
  assert.equal(await consume(accountIp, account), true, 'successful authentication can clear failed attempts');

  const ipOnly = key(3);
  for (let i = 0; i < 30; i++) assert.equal(await consume(ipOnly, key(100 + i)), true);
  assert.equal(await consume(ipOnly, key(999)), false);
  const attackerAccount = await db.query(
    'SELECT count(*)::int AS count FROM public.login_rate_limits WHERE rate_key = $1',
    [key(999)],
  );
  assert.equal(attackerAccount.rows[0].count, 0, 'blocked IP must not create new account buckets');

  await db.query(
    "UPDATE public.login_rate_limits SET window_started_at = now() - interval '16 minutes' WHERE rate_key = $1",
    [account],
  );
  assert.equal(await consume(accountIp, account), true, 'expired account bucket allows login recovery');
  const reset = await db.query(
    'SELECT attempt_count FROM public.login_rate_limits WHERE rate_key = $1',
    [account],
  );
  assert.equal(reset.rows[0].attempt_count, 1);

  const parallelIp = key(4000);
  const parallelAccount = key(4001);
  const concurrent = await Promise.all(
    Array.from({ length: 20 }, () => consume(parallelIp, parallelAccount)),
  );
  assert.equal(concurrent.filter(Boolean).length, 10);
  assert.equal(concurrent.filter((value) => !value).length, 10);

  await db.query(`
    INSERT INTO public.login_rate_limits (rate_key, window_started_at, attempt_count)
    SELECT lpad(to_hex(n), 64, '0'), now() - interval '2 days', 1
    FROM generate_series(10000, 10699) AS n
    ON CONFLICT (rate_key) DO NOTHING
  `);
  await consume(key(5000), key(5001));
  const oldRows = await db.query(
    "SELECT count(*)::int AS count FROM public.login_rate_limits WHERE window_started_at < now() - interval '1 day'",
  );
  assert.equal(oldRows.rows[0].count, 200, 'cleanup removes at most 500 old rows per invocation');
});
