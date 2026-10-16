-- Garwan Law Chamber case manager: run this once in the Supabase SQL editor.

create table associates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text
);

create table chamber_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('superadmin', 'associate')),
  associate_id uuid references associates(id) on delete set null,
  created_at timestamptz default now(),
  session_version integer not null default 1
);

create or replace function bootstrap_chamber_admin(
  p_username text,
  p_email text,
  p_password_hash text,
  p_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('garwan-chamber-first-admin')::bigint);
  if exists (select 1 from chamber_users) then
    raise exception 'Initial admin is already configured';
  end if;

  insert into chamber_users (username, email, password_hash, name, role)
  values (lower(trim(p_username)), lower(trim(p_email)), p_password_hash, trim(p_name), 'superadmin')
  returning id into new_user_id;

  return new_user_id;
end;
$$;

revoke all on function bootstrap_chamber_admin(text, text, text, text) from public, anon, authenticated;
grant execute on function bootstrap_chamber_admin(text, text, text, text) to service_role;

create table cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
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
  status text not null default 'active' check (status in ('active','decided')),
  next_hearing date,          -- active cases
  decided_on date,            -- decided cases
  outcome text,               -- Acquitted, Convicted, Bail granted, Dismissed, Compromise
  created_at timestamptz default now()
);

create table case_associates (
  case_id uuid references cases(id) on delete cascade,
  associate_id uuid references associates(id) on delete cascade,
  primary key (case_id, associate_id)
);

create table settings (
  key text primary key,
  value text
);

-- One row per reminder SMS sent. The unique key stops duplicates.
create table reminder_log (
  id bigserial primary key,
  case_id uuid references cases(id) on delete cascade,
  hearing_date date not null,
  phone text not null,
  recipient text,
  body text,
  provider_response text,
  sent_at timestamptz default now(),
  unique (case_id, hearing_date, phone)
);

-- The app accesses these tables only through its server API using the service role.
-- Keep RLS enabled and do not add client-facing policies for anon or authenticated.
alter table associates enable row level security;
alter table chamber_users enable row level security;
alter table cases enable row level security;
alter table case_associates enable row level security;
alter table settings enable row level security;
alter table reminder_log enable row level security;

create table if not exists chamber_backups (
  id bigserial primary key,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table chamber_backups enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on
  associates,
  chamber_users,
  cases,
  case_associates,
  settings,
  reminder_log,
  chamber_backups
to service_role;
grant usage, select on all sequences in schema public to service_role;
