-- Trial weekly education + tasks — staff-authored once, reused for every trialist.
-- Mirrors acc_week_content (accountability). Keyed by week-of-trial (1..4), NOT a date,
-- because trials start on rolling days. Run in Supabase after trial_hub_setup.sql. Safe to re-run.

-- ── Weekly content template (staff-editable, member-readable) ────────────────
create table if not exists public.trial_week_content (
  week_number int primary key,               -- 1..4 (days 1-7, 8-14, 15-21, 22-30)
  title       text,
  theme       text,
  teaching    text,                          -- client-facing lesson copy
  video_url   text,                          -- Loom / YouTube lesson for the week
  tasks       jsonb default '[]'::jsonb,      -- [{ "id": "w2_book3", "label": "Book 3 sessions for next week" }]
  updated_at  timestamptz default now()
);

alter table public.trial_week_content enable row level security;
drop policy if exists trial_week_content_read on public.trial_week_content;
create policy trial_week_content_read on public.trial_week_content
  for select to authenticated using (true);
drop policy if exists trial_week_content_staff on public.trial_week_content;
create policy trial_week_content_staff on public.trial_week_content
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the 4-week skeleton (themes + task ids; teaching/video blank to fill in the editor).
insert into public.trial_week_content (week_number, title, theme, tasks) values
  (1, 'Find your feet',     'Getting started',      '[{"id":"w1_watch","label":"Watch this week''s lesson"},{"id":"w1_baseline","label":"Set your starting point (weight + photo)"},{"id":"w1_first","label":"Get your first session in"}]'::jsonb),
  (2, 'Build the habit',    'Making it stick',      '[{"id":"w2_watch","label":"Watch this week''s lesson"},{"id":"w2_book3","label":"Book 3 sessions for next week"},{"id":"w2_class","label":"Try one new class this week"}]'::jsonb),
  (3, 'Push on',            'Momentum & progress',  '[{"id":"w3_watch","label":"Watch this week''s lesson"},{"id":"w3_pb","label":"Beat one of your first-week numbers"},{"id":"w3_photo","label":"Take a mid-trial progress photo"}]'::jsonb),
  (4, 'Decide & commit',    'Your next 90 days',    '[{"id":"w4_watch","label":"Watch this week''s lesson"},{"id":"w4_review","label":"Book your 30-day review"},{"id":"w4_after","label":"Take your after photo"}]'::jsonb)
on conflict (week_number) do nothing;

-- ── Per-member task completion (lightweight; owner-scoped) ───────────────────
-- Map of task id -> completed timestamp, on the member's trial_goals row.
alter table public.trial_goals
  add column if not exists task_state jsonb not null default '{}'::jsonb;  -- {"w1_watch":"2026-10-02T..."}

notify pgrst, 'reload schema';
