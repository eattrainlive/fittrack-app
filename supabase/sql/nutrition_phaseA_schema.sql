-- FitTrack — Habit nutrition, Phase A schema
-- Run this once in Supabase → SQL Editor. Creates 4 tables, RLS, and seeds the 28 habits.
-- Member id = auth user id (same convention as the members table).

create extension if not exists pgcrypto;

-- 1. Habit library (staff-managed; members read only)
create table if not exists public.habits (
  id             int primary key,
  sort_order     int,
  name           text not null,
  category       text,
  phase          int check (phase in (1,2,3)),
  coaching_cue   text,
  practice_label text,
  checkin_type   text check (checkin_type in ('tick','count')) default 'tick',
  count_unit     text,
  count_target   int,
  goal_fatloss     text,
  goal_performance text,
  goal_health      text,
  why            text,
  active         boolean default true
);

-- 2. Per-member nutrition state
create table if not exists public.member_nutrition (
  member_id     uuid primary key references auth.users(id) on delete cascade,
  goal          text check (goal in ('fat_loss','performance','health')),
  phase         int default 1,
  season        int default 1,
  coached       boolean default false,
  started_at    timestamptz default now(),
  last_review_at timestamptz
);

-- 3. Which habits a member is on
create table if not exists public.member_habits (
  id           bigint generated always as identity primary key,
  member_id    uuid references auth.users(id) on delete cascade,
  habit_id     int references public.habits(id),
  status       text check (status in ('active','queued','graduated')) default 'queued',
  position     int,
  started_at   timestamptz,
  graduated_at timestamptz
);
create index if not exists member_habits_member_idx on public.member_habits(member_id);

-- 4. Daily check-ins (one row per habit per day)
create table if not exists public.habit_checkins (
  id          bigint generated always as identity primary key,
  member_id   uuid references auth.users(id) on delete cascade,
  habit_id    int references public.habits(id),
  date        date not null,
  done        boolean default false,
  count_value int,
  unique (member_id, habit_id, date)
);
create index if not exists habit_checkins_member_idx on public.habit_checkins(member_id, date);

-- RLS
alter table public.habits            enable row level security;
alter table public.member_nutrition  enable row level security;
alter table public.member_habits     enable row level security;
alter table public.habit_checkins    enable row level security;

drop policy if exists habits_read on public.habits;
create policy habits_read on public.habits for select using (true);

drop policy if exists mn_own on public.member_nutrition;
create policy mn_own on public.member_nutrition for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists mh_own on public.member_habits;
create policy mh_own on public.member_habits for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists hc_own on public.habit_checkins;
create policy hc_own on public.habit_checkins for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

insert into public.habits (id,sort_order,name,category,phase,coaching_cue,practice_label,checkin_type,count_unit,count_target,goal_fatloss,goal_performance,goal_health,why) values
(1,1,'Protein at every meal','Protein',1,'Aim for a palm-sized portion of protein at each main meal — meat, fish, eggs, dairy or a plant source.','Protein at each main meal','tick',NULL,NULL,'Core','Core','Core','Protein keeps you full, protects muscle in a deficit and fuels recovery — the highest-leverage habit.'),
(2,2,'Veg at 2+ meals','Vegetables',1,'Add a fist of vegetables to at least two meals a day. Colour and variety, kept simple.','Veg at 2+ meals','tick',NULL,NULL,'Core','Support','Core','Volume, fibre and micronutrients — fills the plate and the stomach for very few calories.'),
(3,3,'Hydration target','Hydration',1,'Drink to a daily water target (roughly 2L). Start each meal with a glass of water.','Hit water target','count','glasses',8,'Support','Core','Core','Thirst masquerades as hunger; hydration supports energy, training and appetite control.'),
(4,4,'Daily steps baseline','Movement',1,'Hit a daily step goal (start around 7–8k and build). Movement outside the gym counts most.','Reach step goal','count','steps',8000,'Core','Support','Core','Daily activity is a bigger driver of fat loss and health than most single workouts.'),
(5,5,'Three structured meals','Meal structure',1,'Anchor the day with three real meals instead of skipping then grazing.','Ate 3 structured meals','tick',NULL,NULL,'Support','Core','Core','Structure removes decision fatigue and the extreme hunger that drives overeating.'),
(6,6,'Goal-friendly food shop','Planning',1,'Keep the kitchen stocked with foods that support your goal, so the easy choice is the right one.','Shopped/prepped to goal','tick',NULL,NULL,'Core','Support','Support','You eat what''s in the house. Win the shop and you win most of the week.'),
(7,7,'Protein-forward breakfast','Protein',1,'Eat a protein-led breakfast within a couple of hours of waking.','Protein breakfast','tick',NULL,NULL,'Support','Core','Support','Sets the tone for appetite and protein intake across the whole day.'),
(8,8,'Consistent sleep window','Sleep',1,'Keep a regular bed and wake time, aiming for 7–8 hours.','Slept in window','tick',NULL,NULL,'Core','Core','Core','Sleep governs hunger hormones, cravings, recovery and training quality — the silent multiplier.'),
(9,9,'Eat slowly','Mindful eating',2,'Put the fork down between bites; aim for meals to last 15–20 minutes.','Ate slowly','tick',NULL,NULL,'Core','Support','Core','Slower eating lets fullness signals catch up, so you naturally eat less without trying.'),
(10,10,'Eat to 80% full','Mindful eating',2,'Stop at comfortably satisfied, not stuffed. Leave a little in the tank.','Stopped at satisfied','tick',NULL,NULL,'Core','Support','Support','The simplest portion control there is — read the body instead of the plate.'),
(11,11,'Weekly meal prep','Planning',2,'Prep 2–3 meals or components ahead each week (protein, veg, a carb base).','Prepped ahead','tick',NULL,NULL,'Core','Core','Support','Removes friction on busy days, the exact moments habits usually break.'),
(12,12,'Veg at every meal','Vegetables',2,'Extend vegetables to every meal, breakfast included.','Veg at every meal','tick',NULL,NULL,'Core','Support','Core','Progresses the foundation — more volume, fibre and fullness across the day.'),
(13,13,'Mindful snacking','Mindful eating',2,'Snack on purpose and seated, not on autopilot from the cupboard.','Snacked mindfully','tick',NULL,NULL,'Core','Optional','Support','Unconscious grazing is where hidden calories live; awareness alone cuts them.'),
(14,14,'Alcohol awareness','Lifestyle',2,'Notice and set a weekly cap on drinks; plan them rather than default to them.','Within drink plan','tick',NULL,NULL,'Core','Support','Core','Alcohol adds easy calories and derails sleep, choices and recovery.'),
(15,15,'Bigger protein target (2 palms)','Protein',2,'If training hard or a larger frame, build to two palms of protein at main meals.','Hit protein target','tick',NULL,NULL,'Support','Core','Support','Enough total protein is what actually builds and holds muscle.'),
(16,16,'Whole-food carb swap','Food quality',2,'Swap one refined carb a day for a whole-food source (oats, potatoes, fruit, rice).','Made a whole-food swap','tick',NULL,NULL,'Support','Support','Core','Better fibre, fullness and steadier energy without banning anything.'),
(17,17,'Hunger check before eating','Mindful eating',2,'Pause and rate hunger 1–10 before meals and snacks. Eat at real hunger.','Checked hunger first','tick',NULL,NULL,'Core','Optional','Support','Separates true hunger from boredom, stress and habit.'),
(18,18,'Screen-free meals','Mindful eating',2,'Eat at least one meal a day without phone or TV.','Ate screen-free','tick',NULL,NULL,'Support','Optional','Support','Attention on the meal improves fullness and satisfaction.'),
(19,19,'Pre-training fuel','Fuelling',3,'Have a carb-and-protein snack or meal before training sessions.','Fuelled before training','tick',NULL,NULL,'Support','Core','Support','Better energy in the session means better output and results.'),
(20,20,'Post-training recovery meal','Fuelling',3,'Get protein and carbs in within a couple of hours after training.','Recovery meal after','tick',NULL,NULL,'Support','Core','Support','Refuels and repairs — turns the work you did into adaptation.'),
(21,21,'Carbs around training','Fuelling',3,'Place more of your daily carbs around your sessions.','Timed carbs to training','tick',NULL,NULL,'Support','Core','Optional','Puts fuel where it''s used, supporting performance and body composition.'),
(22,22,'Eating-out game plan','Lifestyle',3,'Have a simple strategy for restaurants and social meals before you go.','Had a plan eating out','tick',NULL,NULL,'Core','Support','Core','Real life includes eating out; a plan keeps progress and enjoyment together.'),
(23,23,'Weekend consistency','Lifestyle',3,'Carry the habits Friday to Sunday, not just on weekdays.','Kept habits at weekend','tick',NULL,NULL,'Core','Support','Core','Weekends are where most weekly progress quietly unravels.'),
(24,24,'Portion targets (hand portions)','Portions',3,'Dial portions to your goal using hand sizes — palm protein, fist veg, cupped carbs, thumb fats. [Unlock]','Hit portion targets','tick',NULL,NULL,'Core','Core','Support','Adds precision without weighing food or counting calories — the natural next level.'),
(25,25,'Plan the week ahead','Planning',3,'Take five minutes on a Sunday to plan meals, training and steps for the week.','Planned the week','tick',NULL,NULL,'Support','Core','Core','A short plan makes the whole week''s good choices near-automatic.'),
(26,26,'Manage stress eating','Mindset',3,'Build one non-food response to stress or emotion (walk, breathe, message a mate).','Used a non-food response','tick',NULL,NULL,'Core','Optional','Core','Addresses the real trigger behind most ''willpower'' slips.'),
(27,27,'Maintenance mindset','Mindset',3,'Practise holding your weight and habits steady without swinging on and off plans.','Held habits steady','tick',NULL,NULL,'Support','Support','Core','Knowing you can maintain is what makes results last — and what keeps people here.'),
(28,28,'Weekly reflect & adjust','Mindset',3,'Each week, review what worked, what didn''t, and pick one small adjustment.','Did weekly review','tick',NULL,NULL,'Support','Core','Core','Turns the journey into a skill they own — the deepest form of retention.')
on conflict (id) do nothing;
