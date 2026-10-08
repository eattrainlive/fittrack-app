-- FitTrack — Habit nutrition, Phase B schema (results tracking)
-- Run once in Supabase → SQL Editor. Adds measurements + photos tables.
-- (member_nutrition.last_review_at already exists from Phase A; bodyweight reuses fittrack_bodyweight.)

create table if not exists public.member_measurements (
  id        bigint generated always as identity primary key,
  member_id uuid references auth.users(id) on delete cascade,
  date      date not null default current_date,
  waist     numeric,
  hips      numeric,
  chest     numeric,
  thigh     numeric,
  arm       numeric,
  notes     text
);
create index if not exists member_measurements_idx on public.member_measurements(member_id, date);

create table if not exists public.member_photos (
  id        bigint generated always as identity primary key,
  member_id uuid references auth.users(id) on delete cascade,
  date      date not null default current_date,
  url       text not null,
  pose      text
);
create index if not exists member_photos_idx on public.member_photos(member_id, date);

alter table public.member_measurements enable row level security;
alter table public.member_photos       enable row level security;

drop policy if exists mm_own on public.member_measurements;
create policy mm_own on public.member_measurements for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists mp_own on public.member_photos;
create policy mp_own on public.member_photos for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());
