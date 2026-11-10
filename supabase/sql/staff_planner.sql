-- Staff Hub — Planner: recurring staff reminders + a content scheduler.
-- Both are team-wide (all staff see and action them) and surface on the Today
-- feed when due. Staff-only. Run once in the Supabase SQL editor.

-- ── Reminders / recurring tasks ──────────────────────────────────────────────
create table if not exists public.staff_reminders (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                 -- "Post the week's timetable"
  detail      text,
  assigned_to text,                           -- optional free-text owner (null = anyone)
  due_date    date not null,
  repeat      text not null default 'none',   -- none | daily | weekly | monthly
  done        boolean not null default false, -- done for the CURRENT cycle
  done_at     timestamptz,
  done_by     text,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists staff_reminders_due_idx
  on public.staff_reminders(done, due_date);

alter table public.staff_reminders enable row level security;
drop policy if exists staff_reminders_staff on public.staff_reminders;
create policy staff_reminders_staff on public.staff_reminders
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── Content scheduler ────────────────────────────────────────────────────────
create table if not exists public.content_posts (
  id            uuid primary key default gen_random_uuid(),
  caption       text not null,
  destination   text not null default 'main', -- private | stories | main
  media_url     text,                          -- optional image (content-media bucket)
  scheduled_for date not null,
  status        text not null default 'scheduled', -- draft | scheduled | posted
  notes         text,
  created_by    text,
  posted_by     text,
  posted_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists content_posts_sched_idx
  on public.content_posts(status, scheduled_for);

alter table public.content_posts enable row level security;
drop policy if exists content_posts_staff on public.content_posts;
create policy content_posts_staff on public.content_posts
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── Storage bucket for content images (public read, staff write, 25MB) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('content-media', 'content-media', true, 26214400)
on conflict (id) do update
  set public = true, file_size_limit = 26214400;

drop policy if exists content_media_read on storage.objects;
create policy content_media_read on storage.objects
  for select to public using (bucket_id = 'content-media');

drop policy if exists content_media_write on storage.objects;
create policy content_media_write on storage.objects
  for all to authenticated
  using (bucket_id = 'content-media' and public.is_staff())
  with check (bucket_id = 'content-media' and public.is_staff());

notify pgrst, 'reload schema';
