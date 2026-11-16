-- Manual "this person has left" flag on the roster.
-- Quoox is the source of truth for membership status, but it doesn't always fire
-- a cancellation (or fires it late), so staff need a way to move someone to the
-- inactive bucket by hand — and have it STICK even if the webhook later re-mirrors
-- them as 'active'. manual_inactive_at wins over the Quoox status everywhere.
-- Reactivating simply clears it (status then follows Quoox again).
alter table public.gym_members
  add column if not exists manual_inactive_at timestamptz,
  add column if not exists manual_inactive_by text;

create index if not exists gym_members_manual_inactive_idx
  on public.gym_members(manual_inactive_at)
  where manual_inactive_at is not null;

notify pgrst, 'reload schema';
