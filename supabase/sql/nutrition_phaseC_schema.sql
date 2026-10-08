-- FitTrack — Habit nutrition, Phase C schema (coach notes)
-- Run once in Supabase → SQL Editor. `member_nutrition.coached` already exists (Phase A).
-- Staff reads/writes happen through the service-role `manage-nutrition` function, so no staff RLS needed.

create table if not exists public.coach_notes (
  id         bigint generated always as identity primary key,
  member_id  uuid references auth.users(id) on delete cascade,
  habit_id   int references public.habits(id),
  note       text not null,
  created_by text,
  created_at timestamptz default now()
);
create index if not exists coach_notes_member_idx on public.coach_notes(member_id, created_at desc);

alter table public.coach_notes enable row level security;

-- A member can read the notes written to them (so coached members see their coach's note).
drop policy if exists cn_read_own on public.coach_notes;
create policy cn_read_own on public.coach_notes for select
  using (member_id = auth.uid());
