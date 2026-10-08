-- Lightweight app usage events — "who opened what". Powers feature-view reporting.
-- Members insert their own events; staff can read everything for reports.
create table if not exists public.app_events (
  id         bigserial primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event      text not null,            -- 'feature_view' (extendable: 'programme_view', etc.)
  feature    text,                     -- 'recipes' | 'leaderboard' | 'community' | 'stronger' | 'performance' | 'habits' | 'nutrition' | 'progress' | ...
  meta       jsonb,                    -- optional extra (e.g. { programme_id, name })
  created_at timestamptz not null default now()
);
create index if not exists app_events_created_idx on public.app_events(created_at desc);
create index if not exists app_events_feature_idx on public.app_events(feature, created_at desc);
create index if not exists app_events_user_idx    on public.app_events(user_id, created_at desc);

alter table public.app_events enable row level security;

-- Members log their own events; staff read all.
drop policy if exists app_events_insert_own on public.app_events;
create policy app_events_insert_own on public.app_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists app_events_staff_read on public.app_events;
create policy app_events_staff_read on public.app_events
  for select to authenticated using (public.is_staff());

notify pgrst, 'reload schema';
