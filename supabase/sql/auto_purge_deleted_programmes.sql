-- FitTrack — AUTOMATIC cleanup of deleted programmes (Supabase pg_cron).
-- Runs nightly. Only purges programmes soft-deleted MORE THAN 7 DAYS ago
-- (a recovery window), plus orphaned prog_extras. Active programmes are never touched.
-- Run once in the Supabase SQL editor.

-- 1. Enable the scheduler (or enable "pg_cron" under Database → Extensions).
create extension if not exists pg_cron;

-- 2. Track WHEN a programme was soft-deleted (needed for the recovery window).
alter table public.programs add column if not exists deleted_at timestamptz;

-- 3. Auto-stamp deleted_at when is_deleted flips to true; clear it if a programme is restored.
create or replace function public.stamp_program_deleted_at()
returns trigger language plpgsql as $$
begin
  if new.is_deleted is true and (old.is_deleted is distinct from true) then
    new.deleted_at := now();
  elsif new.is_deleted is distinct from true then
    new.deleted_at := null;
  end if;
  return new;
end$$;

drop trigger if exists trg_stamp_program_deleted_at on public.programs;
create trigger trg_stamp_program_deleted_at
  before update on public.programs
  for each row execute function public.stamp_program_deleted_at();

-- 3b. Backfill any already-soft-deleted rows so they enter the 7-day window from now.
update public.programs set deleted_at = now()
 where is_deleted is true and deleted_at is null;

-- 4. The purge routine: hard-delete programmes deleted > 7 days ago + orphaned extras.
--    Change '7 days' to whatever recovery window you want (e.g. '1 day', '30 days').
create or replace function public.purge_deleted_programs()
returns void language plpgsql security definer as $$
begin
  delete from public.programs
   where is_deleted is true
     and deleted_at is not null
     and deleted_at < now() - interval '7 days';

  delete from public.user_settings us
   where us.key like 'prog_extras_%'
     and not exists (select 1 from public.programs p where p.id = replace(us.key,'prog_extras_',''));
end$$;

-- 5. Schedule it nightly at 03:00 UTC.
select cron.schedule('purge-deleted-programs', '0 3 * * *',
  $$select public.purge_deleted_programs();$$);

-- ── Handy management commands ───────────────────────────────────────────────
-- See scheduled jobs:      select * from cron.job;
-- Run the purge right now:  select public.purge_deleted_programs();
-- Stop the job:             select cron.unschedule('purge-deleted-programs');
