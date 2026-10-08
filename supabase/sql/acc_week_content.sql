-- Accountability programme — week content template (author once, reused every cohort).
-- Staff-editable, member-readable. Run in Supabase after accountability_schema.sql.

create table if not exists public.acc_week_content (
  week_number int primary key,               -- 0 = onboarding info, 1..6 = programme weeks
  title       text,
  theme       text,
  habit       text,                          -- the new keystone habit introduced this week
  teaching    text,                          -- lesson / notes (client-facing body copy)
  video_url   text,                          -- Loom / YouTube lesson for the week
  resources   jsonb default '[]'::jsonb,     -- [{ "title": "...", "url": "..." }] (e.g. Week 5 knowledge layer)
  updated_at  timestamptz default now()
);

alter table public.acc_week_content enable row level security;
drop policy if exists acc_week_content_read on public.acc_week_content;
create policy acc_week_content_read on public.acc_week_content for select to authenticated using (true);
drop policy if exists acc_week_content_staff on public.acc_week_content;
create policy acc_week_content_staff on public.acc_week_content for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the 6-week skeleton (themes + habits from the programme spec) — teaching/video blank to fill in.
insert into public.acc_week_content (week_number, title, theme, habit) values
  (0, 'Onboarding', 'Baseline & your why', 'Capture baseline, photos, and your why'),
  (1, 'Foundations', 'Build your plate', 'Balanced plate + hydration'),
  (2, 'Fuel', 'Protein & portions', 'Protein at every meal + hand portions'),
  (3, 'Move', 'Steps & your SOS plan', 'Daily step target + build your Motivation SOS plan'),
  (4, 'Real life', 'The dip zone', 'Smarter snacking, cravings, alcohol'),
  (5, 'Refine', 'Knowledge layer', 'Labels, fats/carbs, fibre, protein — optional tracking'),
  (6, 'Lock it in', 'Maintenance & results', 'Sliding Scale of Motivation + results capture')
on conflict (week_number) do nothing;

notify pgrst, 'reload schema';
