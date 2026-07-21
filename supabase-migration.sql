-- Supabase SQL Editor migration
-- Run this in your Supabase project: SQL Editor > New query > Paste > Run

-- Main key-value store for all app data
create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Separate table for live activity feed (append-only)
create table if not exists public.live_activity (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Enable row-level security (allow all for now; restrict later if needed)
alter table public.app_state enable row level security;
alter table public.live_activity enable row level security;

drop policy if exists "Allow all" on public.app_state;
drop policy if exists "Allow all" on public.live_activity;

create policy "Allow all" on public.app_state for all using (true) with check (true);
create policy "Allow all" on public.live_activity for all using (true) with check (true);

-- Enable real-time replication
alter table public.app_state replica identity full;
alter table public.live_activity replica identity full;
alter publication supabase_realtime add table public.app_state;
alter publication supabase_realtime add table public.live_activity;

-- Seed rows for every app data key
insert into public.app_state (key, data, version) values
  ('printing_db_jobs', '[]'::jsonb, 0),
  ('printing_db_inventory', '[]'::jsonb, 0),
  ('printing_db_expenditures', '[]'::jsonb, 0),
  ('printing_db_miscellaneous', '[]'::jsonb, 0),
  ('printing_db_sales_reports', '[]'::jsonb, 0),
  ('printing_db_gpo', '[]'::jsonb, 0),
  ('printing_db_audit_logs', '[]'::jsonb, 0),
  ('printing_db_notifications', '[]'::jsonb, 0),
  ('printing_db_settings', '{}'::jsonb, 0),
  ('printing_db_staff_accounts', '[]'::jsonb, 0),
  ('printing_db_staff_notes', '[]'::jsonb, 0),
  ('printing_db_staff_attendance', '[]'::jsonb, 0),
  ('printing_db_deleted_jobs', '[]'::jsonb, 0),
  ('printing_db_live_activity', '[]'::jsonb, 0)
on conflict (key) do nothing;
