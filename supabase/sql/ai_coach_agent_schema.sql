-- AI Coach Agent — schema. Run in Supabase after exercises_enrich_v2_UPDATE.sql. Staff-only. Idempotent.

-- 1) Coaching preferences (the "learns on the go" store) -----------------------
-- Rules the agent must follow, accumulated from Michael's corrections + house style.
create table if not exists public.coaching_preferences (
  id         uuid primary key default gen_random_uuid(),
  scope      text not null default 'global',   -- 'global' or a stream name (Stronger/Fusion/GroupPT/Foundations)
  rule       text not null,                     -- plain-English rule the agent respects
  source     text default 'coach',             -- coach | learned
  active     boolean default true,
  created_at timestamptz default now()
);
create index if not exists coaching_prefs_scope_idx on public.coaching_preferences(scope) where active;

insert into public.coaching_preferences (scope, rule) values
  ('global', 'Cap any single movement_family to once per week unless the coach asks otherwise; glute bridge max once per week.'),
  ('global', 'Never put two isolations of the same joint action in one session (e.g. two triceps, two rear-delt).'),
  ('global', 'Every session must be balanced across the week: cover squat, hinge, horizontal & vertical push, horizontal & vertical pull.'),
  ('global', 'Warm Up starts with ~3 min easy cardio, then mobility/activation. Finishers are engaging and short.'),
  ('global', 'Respect member injuries: never program an exercise whose contraindications include a flagged injury.'),
  ('global', 'Vary warm-up and activation choices week to week; do not repeat the same finisher across days.')
on conflict do nothing;

-- 2) Per-stream recipes (each programme type's philosophy + structure) ----------
create table if not exists public.stream_recipes (
  stream       text primary key,                -- Stronger | Fusion | Performance | Foundations | GroupPT
  system_prompt text,                           -- the stream's programming philosophy + session shape
  structure    jsonb default '{}'::jsonb,        -- section names + slot rules
  updated_at   timestamptz default now()
);

insert into public.stream_recipes (stream, system_prompt) values
 ('Stronger','Strength & hypertrophy, Push/Pull/Legs split. Session: Warm Up/Mobility -> Fire Up (2 activation) -> Strength Blocks (heavy compound matched to the day''s pattern first, then accessories descending in load) -> Pump City or Core. Progress load week to week. No contrast pairing.'),
 ('Fusion','Functional/hybrid. Lower/Upper/Full Body/Engine/Conditioning days. Warm Up -> Fire Up -> ONE heavy compound (%1RM) -> antagonist AMRAP couplet blocks (loaded push<->pull or squat<->hinge) -> short erg finisher. Rotate the pair + Block 1 week to week.'),
 ('GroupPT','12-week PT-area block over 3 rounds (base week 1->1,5,9 etc). Session: Warm Up (3 solo) -> Fire Up (1 activation pair) -> Lift (heavy compound + core) -> Burn 1 (upper PUSH + lower HINGE, rotate the hinge, glute bridge max once/week) -> Burn 2 (upper PULL + lower KNEE, always a real pull never core) -> Finisher (two option supersets: accessory+accessory, cardio+core). No fixed machines. Vary every movement across the week.'),
 ('Foundations','Beginner-friendly full body. Simple structure, machine/bodyweight bias, proactive regression cues. No barbell olympic lifts, no advanced movements. Prioritise technique and confidence.')
on conflict (stream) do nothing;

-- 3) Programme chats (conversation history per draft; iterative + auditable) -----
create table if not exists public.programme_chats (
  id         uuid primary key default gen_random_uuid(),
  coach_user_id uuid,
  title      text,
  stream     text,
  messages   jsonb default '[]'::jsonb,          -- [{role, content, tool_calls...}]
  draft      jsonb,                              -- the current structured programme draft
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists programme_chats_coach_idx on public.programme_chats(coach_user_id, updated_at desc);

-- RLS: staff-only across the board.
alter table public.coaching_preferences enable row level security;
alter table public.stream_recipes       enable row level security;
alter table public.programme_chats       enable row level security;
drop policy if exists cp_staff on public.coaching_preferences;
create policy cp_staff on public.coaching_preferences for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists sr_staff on public.stream_recipes;
create policy sr_staff on public.stream_recipes for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists pc_staff on public.programme_chats;
create policy pc_staff on public.programme_chats for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
