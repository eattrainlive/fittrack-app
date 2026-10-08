-- ============================================================================
-- Per-page resources with SECTIONS (categories) + a Storage bucket for files.
-- Staff add sections and resources inline on each page; members read them.
-- Run in Supabase SQL editor. (Bucket can also be made in the dashboard.)
-- ============================================================================

-- 1) Sections (categories) within a page
create table if not exists public.resource_sections (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,            -- 'calculator','recipes','meal_plans','nutrition_education', ...
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) Resources, optionally filed under a section
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  page        text not null,
  section_id  uuid references public.resource_sections(id) on delete set null,
  title       text not null,
  url         text not null,
  type        text not null default 'link',  -- 'video' | 'file' | 'link'
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
-- (if resources already exists, add the column)
alter table public.resources add column if not exists section_id uuid references public.resource_sections(id) on delete set null;

-- RLS: everyone reads, staff (email allowlist) writes.
alter table public.resource_sections enable row level security;
alter table public.resources enable row level security;

drop policy if exists resource_sections_read on public.resource_sections;
create policy resource_sections_read on public.resource_sections for select to authenticated using (true);
drop policy if exists resource_sections_write on public.resource_sections;
create policy resource_sections_write on public.resource_sections for all to authenticated
  using ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') )
  with check ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') );

drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources for select to authenticated using (true);
drop policy if exists resources_write on public.resources;
create policy resources_write on public.resources for all to authenticated
  using ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') )
  with check ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') );

-- 3) Public storage bucket for uploaded files (PDFs, books, images).
insert into storage.buckets (id, name, public) values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists resources_files_read on storage.objects;
create policy resources_files_read on storage.objects for select to public using ( bucket_id = 'resources' );
drop policy if exists resources_files_write on storage.objects;
create policy resources_files_write on storage.objects for all to authenticated
  using ( bucket_id = 'resources' and lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') )
  with check ( bucket_id = 'resources' and lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') );

-- add more staff emails to the allowlists above as needed.
notify pgrst, 'reload schema';
