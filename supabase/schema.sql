-- Garwan Law Chamber case manager: run this once in the Supabase SQL editor.

create table associates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text
);

create table chamber_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text,
  password text not null,
  name text not null,
  role text not null check (role in ('superadmin', 'associate')),
  associate_id uuid references associates(id) on delete set null,
  created_at timestamptz default now()
);

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
  outcome text,               -- Acquitted, Convicted, Sentence reduced, Bail granted, Dismissed, Compromise
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

-- Only signed-in users (Mehtab and his team) can read or write.
alter table associates enable row level security;
alter table chamber_users enable row level security;
alter table cases enable row level security;
alter table case_associates enable row level security;
alter table settings enable row level security;
alter table reminder_log enable row level security;

create policy "team access" on associates for all to authenticated using (true) with check (true);
create policy "team access" on chamber_users for all to authenticated using (true) with check (true);
create policy "team access" on cases for all to authenticated using (true) with check (true);
create policy "team access" on case_associates for all to authenticated using (true) with check (true);
create policy "team access" on settings for all to authenticated using (true) with check (true);
create policy "team access" on reminder_log for all to authenticated using (true) with check (true);

-- Seed initial chamber users
insert into chamber_users (username, email, password, name, role)
values ('superadmin', 'admin@garwanlaw.com', 'admin123', 'Maher Mehtab Hassan Garwan', 'superadmin')
on conflict (username) do nothing;
