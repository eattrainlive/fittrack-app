-- ============================================================================
-- Newsletters: staff build an issue from blocks; it renders as a nice on-brand
-- page in the app AND on a public shareable URL (/n/<slug>) the GHL email links
-- to. Published issues are PUBLIC-readable (no login) so email recipients read
-- instantly; drafts and editing are staff-only.
-- Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.newsletters (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,          -- URL: /n/<slug>
  title        text not null,
  subtitle     text,
  cover_image  text,
  blocks       jsonb not null default '[]'::jsonb,  -- ordered array of content blocks
  published    boolean not null default false,
  published_at timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists newsletters_pub_idx on public.newsletters(published, published_at desc);

alter table public.newsletters enable row level security;

-- Read: published issues are readable by ANYONE (incl. not-logged-in / anon, for
-- the email links); staff can read drafts too. (No `to` clause = applies to all
-- roles including anon.)
drop policy if exists newsletters_read on public.newsletters;
create policy newsletters_read on public.newsletters
  for select using (published or public.is_staff());

-- Write: staff only.
drop policy if exists newsletters_write on public.newsletters;
create policy newsletters_write on public.newsletters
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
