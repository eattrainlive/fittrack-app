-- Staff job plan — "Steady" cadence. Seeds the Planner with the recurring staff
-- jobs: private client-page posts, member celebrations, content planning and a
-- weekly check-in sweep (weekly reminders, each anchored to a weekday), plus the
-- daily social operation as a "Content & social" checklist.
--
-- Assigned to 'Michael' for now. If your app profile name is different, run:
--   update public.staff_reminders set assigned_to = 'Your Name' where assigned_to = 'Michael';
-- Safe to re-run — each job is guarded so it won't duplicate.
-- Requires staff_planner.sql + staff_hub_boards.sql to have been run first.

-- Helper: next date (today or later) whose Postgres dow (Sun=0..Sat=6) = target.
--   current_date + (((target - dow_today) + 7) % 7) days

-- ── Weekly reminders ─────────────────────────────────────────────────────────
-- Mon/Wed/Fri — private client-page posts (dow 1 / 3 / 5)
insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Private client-page post',
       'Post value / behind-the-scenes / a win on the members'' private page.',
       'Michael',
       current_date + (((1 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Private client-page post' and repeat = 'weekly' and extract(dow from due_date) = 1);

insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Private client-page post',
       'Post value / behind-the-scenes / a win on the members'' private page.',
       'Michael',
       current_date + (((3 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Private client-page post' and repeat = 'weekly' and extract(dow from due_date) = 3);

insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Private client-page post',
       'Post value / behind-the-scenes / a win on the members'' private page.',
       'Michael',
       current_date + (((5 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Private client-page post' and repeat = 'weekly' and extract(dow from due_date) = 5);

-- Tue/Thu — celebrate a member (story + client page) (dow 2 / 4)
insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Celebrate a member (story + client page)',
       'Pick a member win (PB, streak, transformation) — shout out on a story and the client page. Check the Today "Wins to celebrate" feed.',
       'Michael',
       current_date + (((2 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Celebrate a member (story + client page)' and repeat = 'weekly' and extract(dow from due_date) = 2);

insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Celebrate a member (story + client page)',
       'Pick a member win (PB, streak, transformation) — shout out on a story and the client page. Check the Today "Wins to celebrate" feed.',
       'Michael',
       current_date + (((4 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Celebrate a member (story + client page)' and repeat = 'weekly' and extract(dow from due_date) = 4);

-- Mon — weekly member check-in sweep (dow 1)
insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Member check-in sweep',
       'Work the retention board: message at-risk + slipping members, and check in with anyone new. Clear "waiting for reply".',
       'Michael',
       current_date + (((1 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Member check-in sweep' and repeat = 'weekly');

-- Fri — plan next week's content (dow 5)
insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Plan next week''s content',
       'Draft + schedule next week''s posts in the content calendar. Use the AI idea generator for captions.',
       'Michael',
       current_date + (((5 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Plan next week''s content' and repeat = 'weekly');

-- Sun — new-follower catch-up (dow 0)
insert into public.staff_reminders (title, detail, assigned_to, due_date, repeat, created_by)
select 'Review new followers — all DM''d?',
       'Catch-up: make sure every new Instagram follower this week got a welcome DM.',
       'Michael',
       current_date + (((0 - extract(dow from current_date)::int) + 7) % 7) * interval '1 day',
       'weekly', 'job-plan'
where not exists (select 1 from public.staff_reminders
  where title = 'Review new followers — all DM''d?' and repeat = 'weekly');

-- ── Daily "Content & social" checklist ───────────────────────────────────────
insert into public.checklist_templates (title, section, sort_order)
select v.title, 'content', v.ord
from (values
  ('Post 1–2 stories', 1),
  ('DM new Instagram followers', 2),
  ('Reply to DMs & story replies', 3),
  ('Reply to member check-in submissions', 4)
) as v(title, ord)
where not exists (
  select 1 from public.checklist_templates t where t.title = v.title and t.section = 'content'
);

notify pgrst, 'reload schema';
