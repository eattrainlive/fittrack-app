-- "Online client" flag: remote members who don't attend the physical gym.
-- Excludes them from gym attendance reports + the attendance at-risk board (they'd otherwise
-- show 0 visits and look at-risk). Run in the Supabase SQL editor. Safe to re-run.

alter table public.members add column if not exists online_client boolean default false;

notify pgrst, 'reload schema';
