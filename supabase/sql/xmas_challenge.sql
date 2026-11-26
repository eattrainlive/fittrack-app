-- Christmas challenge — 12 active days between 1 and 24 December. A day counts if the member
-- has a granted gym/24hr scan OR a (non-cancelled) class/PT booking that day; one per day.
-- Hit 12 → entered in the hoodie raffle. Config in feature_settings; winner recorded in a table.

insert into public.feature_settings (key, value) values (
  'xmas_challenge',
  '{"enabled": true, "title": "12 Days of Christmas", "start": "2026-12-01", "end": "2026-12-24", "target": 12, "prize": "free ETL hoodie"}'::jsonb
) on conflict (key) do nothing;

-- Raffle draw result (staff draw a winner from everyone who qualified).
create table if not exists public.xmas_raffle (
  id          uuid primary key default gen_random_uuid(),
  drawn_at    timestamptz not null default now(),
  winner_email text,
  winner_name  text,
  entrants     int,
  drawn_by     text
);
alter table public.xmas_raffle enable row level security;
drop policy if exists xmas_raffle_staff on public.xmas_raffle;
create policy xmas_raffle_staff on public.xmas_raffle
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
-- Members may READ the winner (so the app can show "winner announced").
drop policy if exists xmas_raffle_read on public.xmas_raffle;
create policy xmas_raffle_read on public.xmas_raffle for select to authenticated using (true);

notify pgrst, 'reload schema';
