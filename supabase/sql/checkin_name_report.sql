-- Check-in: store WHO checked in (name + user id) on the scan, and allow a "no_membership" result
-- so a known app user with no roster row still shows their name (not a nameless "Member").
-- Also underpins the exportable check-in report. Safe to re-run.

alter table public.scan_events add column if not exists member_name text;
alter table public.scan_events add column if not exists user_id uuid;
-- What they checked in FOR (booked session type, "Open gym", or "24 Hour Gym"), the matched booking
-- time, and where the scan came from ('kiosk' | 'paxton').
alter table public.scan_events add column if not exists checkin_for text;
alter table public.scan_events add column if not exists booking_at timestamptz;
alter table public.scan_events add column if not exists source text default 'kiosk';

-- Allow the new result value. Drop + re-add the check constraint (name may vary; this finds it).
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.scan_events'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%result%';
  if c is not null then execute format('alter table public.scan_events drop constraint %I', c); end if;
end $$;

alter table public.scan_events
  add constraint scan_events_result_check
  check (result in ('granted','denied_lapsed','unknown_code','no_membership'));

create index if not exists scan_events_ts_report_idx on public.scan_events(ts desc);

notify pgrst, 'reload schema';
