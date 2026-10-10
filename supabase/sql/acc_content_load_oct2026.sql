-- ============================================================================
-- ETL 6-Week Accountability — content load for the 19 Oct 2026 cohort
-- (App-owning-chat copy: identical to Michael's "App Content Load" file EXCEPT
--  the four programme habits 101–104 are inserted active = false, so they stay
--  out of the member habit pickers — paired with the getHabitLibrary active
--  filter in trialGoals.ts / memberGoals.ts.)
-- Run in the Supabase SQL editor AFTER acc_week_habits.sql (table must exist).
-- Safe to re-run. Do NOT re-run acc_week_habits.sql after this.
-- ============================================================================

begin;

-- ── PART 1: video links ─────────────────────────────────────────────────────
create temp table vids (code text primary key, url text) on commit drop;
insert into vids (code, url) values
  ('TOUR', ''),   -- NEW 2-min app tour (to film): home screen, notifications, habits, check-in
  ('V2',   'https://vimeo.com/740669361'),   -- Meet the scales
  ('V3',   'https://vimeo.com/560321641'),   -- Motivation SOS plan
  ('V4',   'https://vimeo.com/740659811/1e505697f6'),   -- Your why / bigger picture (mind-map)
  ('V5',   'https://vimeo.com/1017942117'),   -- Reading food labels
  ('V6',   'https://vimeo.com/809687911'),   -- Calories in alcohol
  ('V7',   'https://vimeo.com/809683505'),   -- Loss of motivation
  ('V8',   'https://vimeo.com/913595843'),   -- Importance of fibre
  ('V9',   'https://vimeo.com/748271372'),   -- Fats & carbs
  ('V10',  'https://vimeo.com/913591485'),   -- Protein deep-dive
  ('V13',  'https://vimeo.com/1012394089'),   -- Building your plate
  ('V14',  'https://vimeo.com/1012011826'),   -- The Power of Habits
  ('V15',  'https://vimeo.com/1021978017?tq=craving#t=131'),   -- Cravings
  ('V16',  'https://vimeo.com/1017903906'),   -- Nutrient density
  ('V17',  'https://vimeo.com/1017423995'),   -- Protein: the basics
  ('V18',  'https://vimeo.com/1017580452'),   -- Protein timing
  ('V19',  'https://vimeo.com/1017570117'),   -- Protein swaps
  ('V20',  'https://vimeo.com/1015118918'),   -- Smart snacking
  ('V21',  'https://vimeo.com/1014225831'),   -- Hand portion control
  ('V22',  'https://vimeo.com/1013410677'),   -- Hydration
  ('V23',  'https://vimeo.com/739617323'),   -- NEAT
  ('V24',  'https://vimeo.com/752061215'),   -- Sliding Scale of Motivation
  ('CALL', '');   -- Wednesday 12:00 live call link (Zoom/Meet)

-- ── PART 2: week content ────────────────────────────────────────────────────
with w (week_number, title, theme, habit, video, teaching) as (values
  (0, 'Get set up', 'Set up, switched on, committed', 'Finish your setup', 'TOUR',
$t$Welcome in. Six weeks from Monday 19 October you'll be eating better, moving more, and you'll know exactly how to keep it going through Christmas.

This week is about getting set up properly, because the people who finish setup before day one get the best results. Add the app to your home screen, then work through your onboarding.

The five that matter most: your why, front and side baseline photos, your weight and measurements, your average daily steps, and plate or tracking. Your photos are private. They're your data, and the best proof of progress when the scale plays games.

Your coach will be in touch this week to book your onboarding chat. Live call every Wednesday at 12:00.$t$),

  (1, 'Foundations: build your plate', 'Build your plate', 'Balanced plate + hit your water target', 'V14',
$t$This week is simple on purpose: two habits, ticked every evening.

The plate: half veg or salad, a quarter protein, a quarter carbs. No weighing, no tracking. If you ate like this most of the time, you'd get in shape.

Water: your bodyweight in kg × 0.033 gives your litres a day (80kg = about 2.6 litres). Get a big bottle, keep it in eyeline, and have a glass with every coffee.

Tick both off each evening. We add one habit each week and never drop the old ones. Small things done daily is the whole game.$t$),

  (2, 'Fuel: protein and portions', 'Protein & portions', 'Protein at every meal', 'V17',
$t$New habit: protein at every meal. It keeps you fuller, protects muscle while you lose fat, and stops the 3pm cupboard raid.

Your hand is the portion guide: a palm of protein, a fist of veg, a thumb of fats. If you like a number, aim for 1.2g per kg of bodyweight and build towards 1.5.

Plan the protein first and build the plate around it, then use the swaps video to upgrade one meal this week.

Half-term and Halloween both land this week, so decide now where the sweets live. Not on the worktop.$t$),

  (3, 'Move: steps and your SOS plan', 'Steps & your SOS plan', 'Hit your daily step target', 'V23',
$t$You're halfway. New habit: a daily step target. The movement you do outside the gym burns more than the session itself, and it's the easiest lever you have.

Your target is your recent average plus 1,500–2,000: a bump, not a leap to 10k. Your coach will set it with you this week and it'll show on your dashboard. Tick it off on the days you hit it.

The clocks have gone back, so plan it: a lunchtime walk, the stairs, or a treadmill walk at ETL 24 when it's dark and wet.

On Thursday, build your SOS plan: the three or four things you do when you're on it, and the early sign that tells you you're slipping. It goes in this week's check-in, ready for week 4.

Sunday is your midpoint photo: same spot, same pose, just for you.$t$),

  (4, 'Real life: the dip zone', 'The dip zone', 'Snacks planned, not grabbed', 'V20',
$t$Week 4 is where most people wobble, so we expect it and plan for it.

New habit: snacks planned, not grabbed. Pick two go-to snacks with protein or fibre, around 150 calories, and have them in before you need them.

Cravings are triggers, not failures: water first, then your planned option.

Drinking this week? It's not a ban. Know the numbers, decide if it's worth it, plan it in, enjoy it, move on.

Had a bad few days? The reset is today, not Monday. Open your SOS plan and do the one thing that's dropped off.$t$),

  (5, 'Refine: dial it in', 'Knowledge layer', 'Hold all five (optional: track in MyFitnessPal)', 'V5',
$t$Your habits are in, and you'll notice how much more automatic this feels than week 1. This week is the why behind it, for anyone who wants more precision.

Read labels: serving size is where people get caught. Keep protein high and let fats and carbs flex to what you enjoy. Aim for 25–35g of fibre a day, the partner to all that protein.

Fancy levelling up? A week of tracking in MyFitnessPal is optional, never required. Tell your coach if you want to try it.

Christmas invites will start landing, so next week we build your plan for December.$t$),

  (6, 'Lock it in: your December plan', 'Maintenance & results', 'Write your high / middle / low tiers', 'V24',
$t$Final week, and the aim now is keeping it. You finish days before the hardest month of the year to stay on track, so this matters.

Motivation rises and falls. People rebound when they try to run a high-effort plan on low-effort motivation, feel like they've failed, and pack it in. So you'll write three tiers: what you do when motivation is high, middle and low. Dropping a tier isn't failing; it's how you keep your results through December.

Saturday is after-photo day: same spot, pose and lighting as day 0. Sunday is your final check-in.

Bring it all to Wednesday's final call and we'll celebrate properly.$t$)
),
r (week_number, ord, code, label) as (values
  (0, 1, 'V2',  'Meet the scales'),
  (0, 2, 'V4',  'Your why'),
  (1, 1, 'V13', 'Tue — Building your plate'),
  (1, 2, 'V22', 'Thu — Hydration'),
  (1, 9, 'CALL','Live call — Wed 12:00'),
  (2, 1, 'V21', 'Tue — Hand portions'),
  (2, 2, 'V19', 'Wed — Protein swaps'),
  (2, 3, 'V16', 'Fri — Nutrient density'),
  (2, 9, 'CALL','Live call — Wed 12:00'),
  (3, 1, 'V3',  'Thu — Your SOS plan'),
  (3, 9, 'CALL','Live call — Wed 12:00'),
  (4, 1, 'V15', 'Wed — Cravings'),
  (4, 2, 'V7',  'Thu — Loss of motivation'),
  (4, 3, 'V6',  'Fri — Calories in alcohol'),
  (4, 9, 'CALL','Live call — Wed 12:00'),
  (5, 1, 'V9',  'Wed — Fats & carbs'),
  (5, 2, 'V8',  'Thu — Fibre'),
  (5, 3, 'V10', 'Fri — Protein deep-dive'),
  (5, 4, 'V18', 'Fri — Protein timing'),
  (5, 9, 'CALL','Live call — Wed 12:00'),
  (6, 9, 'CALL','Final live call — Wed 12:00')
)
insert into public.acc_week_content (week_number, title, theme, habit, teaching, video_url, resources, updated_at)
select
  w.week_number, w.title, w.theme, w.habit, w.teaching,
  nullif((select url from vids where code = w.video), ''),
  coalesce((
    select jsonb_agg(jsonb_build_object('title', r.label, 'url', v.url) order by r.ord)
    from r join vids v on v.code = r.code
    where r.week_number = w.week_number and coalesce(v.url, '') <> ''
  ), '[]'::jsonb),
  now()
from w
on conflict (week_number) do update set
  title = excluded.title, theme = excluded.theme, habit = excluded.habit,
  teaching = excluded.teaching, video_url = excluded.video_url,
  resources = excluded.resources, updated_at = now();

-- ── PART 3: programme habits + weekly stack ─────────────────────────────────
-- These 4 tick-habits use the programme's words. Protein (id 1) already matches
-- and stays. active = false keeps them OUT of the member habit pickers (the
-- getHabitLibrary active filter), while accountability still unlocks them.
-- Check ids 101–104 are free first:  select id, name from public.habits where id between 101 and 104;
insert into public.habits
  (id, sort_order, name, category, phase, coaching_cue, practice_label, checkin_type,
   count_unit, count_target, goal_fatloss, goal_performance, goal_health, why, active)
values
  (101, 101, 'Balanced plate', 'Vegetables', 1,
   'Half veg or salad, a quarter protein, a quarter carbs.', 'Built a balanced plate', 'tick',
   null, null, 'Core', 'Support', 'Core',
   'The no-tracking way to eat well: fills you up for fewer calories.', false),
  (102, 102, 'Hit my water target', 'Hydration', 1,
   'Bodyweight (kg) × 0.033 = litres a day. Bottle in eyeline.', 'Hit my water target', 'tick',
   null, null, 'Support', 'Core', 'Core',
   'More energy, fewer false hunger pangs, and less water retention.', false),
  (103, 103, 'Hit my step target', 'Movement', 1,
   'Your personal daily step target: your average plus 1,500–2,000.', 'Hit my step target', 'tick',
   null, null, 'Core', 'Support', 'Core',
   'Daily movement outside the gym is the easiest fat-loss lever you have.', false),
  (104, 104, 'Snacks planned, not grabbed', 'Mindful eating', 2,
   'Two planned snacks with protein or fibre, around 150 calories.', 'Snacks planned', 'tick',
   null, null, 'Core', 'Optional', 'Support',
   'Planned snacks stop the cupboard raid, which is where hidden calories live.', false)
on conflict (id) do nothing;

delete from public.acc_week_habits;
insert into public.acc_week_habits (week_number, habit_id, sort) values
  (1, 101, 1),  -- Balanced plate
  (1, 102, 2),  -- Water target
  (2, 1,   3),  -- Protein at every meal (existing)
  (3, 103, 4),  -- Step target
  (4, 104, 5);  -- Snacks planned

commit;

notify pgrst, 'reload schema';

-- Check:
-- select week_number, title, habit, video_url is not null as has_video, jsonb_array_length(resources) as n_resources from public.acc_week_content order by 1;
-- select w.week_number, h.name from public.acc_week_habits w join public.habits h on h.id = w.habit_id order by w.sort;
