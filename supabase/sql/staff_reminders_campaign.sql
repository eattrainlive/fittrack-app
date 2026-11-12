-- Let a staff reminder (task) belong to a campaign, so campaign jobs flow into
-- the reminders system — "My jobs", the calendar and the team agenda — assigned
-- to a coach. Run once in the Supabase SQL editor.

alter table public.staff_reminders
  add column if not exists campaign_id uuid
    references public.staff_events(id) on delete set null;

create index if not exists staff_reminders_campaign_idx
  on public.staff_reminders(campaign_id);

notify pgrst, 'reload schema';
