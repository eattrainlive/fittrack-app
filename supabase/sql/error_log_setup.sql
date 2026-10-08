-- Error log — captures failed cloud writes (and any client errors) from ALL users, so we can
-- see save problems the moment they happen instead of catching them live in DevTools.

create table if not exists public.error_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz default now(),
  user_email  citext,
  user_id     uuid,
  action      text,        -- e.g. 'savePrograms', 'saveExercise', 'saveWorkoutHistory'
  table_name  text,        -- e.g. 'programs', 'exercises'
  code        text,        -- Supabase/Postgres error code (e.g. 42P10, 22P02, 400)
  message     text,
  details     text,
  url         text,        -- window.location at the time
  user_agent  text,
  raw         jsonb
);

create index if not exists error_log_time_idx on public.error_log(occurred_at desc);

alter table public.error_log enable row level security;
-- Any signed-in user can record an error; staff (the app) can read them.
drop policy if exists error_log_insert on public.error_log;
create policy error_log_insert on public.error_log for insert to authenticated with check (true);
drop policy if exists error_log_read on public.error_log;
create policy error_log_read on public.error_log for select to authenticated using (true);
