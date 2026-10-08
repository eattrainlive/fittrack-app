-- Staff-only "How-to guides" for using the app. Lives in the Coaching/Staff Hub.
-- Readable AND editable only by staff (public.is_staff() = in staff_users). Safe to re-run.

create table if not exists public.staff_guides (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text default 'General',        -- group guides into folders, e.g. 'Getting started', 'Programming', 'Check-in'
  body        text default '',               -- markdown how-to content
  video_url   text,                          -- optional Loom/YouTube link to embed
  sort_order  int default 0,                 -- manual ordering within a category
  updated_by  uuid,                          -- staff user who last edited (auth.uid())
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists staff_guides_cat_idx on public.staff_guides(category, sort_order);

alter table public.staff_guides enable row level security;

-- Staff-only for everything (select/insert/update/delete). Non-staff can't even read.
drop policy if exists staff_guides_staff_all on public.staff_guides;
create policy staff_guides_staff_all on public.staff_guides
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

notify pgrst, 'reload schema';
