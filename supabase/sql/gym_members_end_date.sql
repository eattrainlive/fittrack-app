-- Scheduled membership end date, mirrored from Quoox's membership.endDateUtc.
-- Distinct from ended_on (which marks an ACTUAL cancellation event). end_date is the
-- date a fixed-term membership or an end-of-period cancellation is due to lapse. When it
-- passes, the member is treated as expired (out of reports, access cut after grace) WITHOUT
-- needing a cancellation webhook — which Quoox doesn't reliably send.
-- autoRenew/recurring memberships carry no endDateUtc, so their end_date stays null = never expires.
alter table public.gym_members
  add column if not exists end_date date;

create index if not exists gym_members_end_date_idx
  on public.gym_members(end_date)
  where end_date is not null;

notify pgrst, 'reload schema';
