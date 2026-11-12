-- Let a staff event be a CAMPAIGN (kind='campaign') that other events hang off.
-- A child event references its campaign via campaign_id; both the campaign and
-- its children are normal staff_events, so they already render on the calendar.
-- Run once in the Supabase SQL editor.

alter table public.staff_events
  add column if not exists campaign_id uuid
    references public.staff_events(id) on delete set null;

create index if not exists staff_events_campaign_idx
  on public.staff_events(campaign_id);

notify pgrst, 'reload schema';
