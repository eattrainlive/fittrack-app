-- Community Wall: in-app Facebook-group-style feed. Posts, comments, reactions, with staff moderation.
-- Run after you've created a public Storage bucket named "community-images" (Dashboard → Storage).

-- ---------- POSTS ----------
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid(),
  body       text,
  image_url  text,                         -- optional; from the community-images bucket
  pinned     boolean not null default false,
  hidden     boolean not null default false,   -- staff moderation (soft hide)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists community_posts_feed_idx on public.community_posts(pinned desc, created_at desc);

-- ---------- COMMENTS ----------
create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null default auth.uid(),
  body       text not null,
  hidden     boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);

-- ---------- REACTIONS (one per user per post per type) ----------
create table if not exists public.community_reactions (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null default auth.uid(),
  type       text not null default 'like',      -- 'like' | 'strong' | 'fire' ... (app decides set)
  created_at timestamptz default now(),
  primary key (post_id, user_id, type)
);

-- ---------- RLS ----------
alter table public.community_posts    enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;

-- Posts: everyone signed in reads non-hidden (staff read all); author or staff can edit/delete;
-- staff can pin/hide.
drop policy if exists cposts_read on public.community_posts;
create policy cposts_read on public.community_posts
  for select to authenticated using (not hidden or public.is_staff());
drop policy if exists cposts_insert on public.community_posts;
create policy cposts_insert on public.community_posts
  for insert to authenticated with check (author_id = auth.uid());
drop policy if exists cposts_update on public.community_posts;
create policy cposts_update on public.community_posts
  for update to authenticated using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());
drop policy if exists cposts_delete on public.community_posts;
create policy cposts_delete on public.community_posts
  for delete to authenticated using (author_id = auth.uid() or public.is_staff());

-- Comments: same shape.
drop policy if exists ccomments_read on public.community_comments;
create policy ccomments_read on public.community_comments
  for select to authenticated using (not hidden or public.is_staff());
drop policy if exists ccomments_insert on public.community_comments;
create policy ccomments_insert on public.community_comments
  for insert to authenticated with check (author_id = auth.uid());
drop policy if exists ccomments_update on public.community_comments;
create policy ccomments_update on public.community_comments
  for update to authenticated using (author_id = auth.uid() or public.is_staff())
  with check (author_id = auth.uid() or public.is_staff());
drop policy if exists ccomments_delete on public.community_comments;
create policy ccomments_delete on public.community_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_staff());

-- Reactions: anyone reads; you add/remove your own.
drop policy if exists creactions_read on public.community_reactions;
create policy creactions_read on public.community_reactions
  for select to authenticated using (true);
drop policy if exists creactions_insert on public.community_reactions;
create policy creactions_insert on public.community_reactions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists creactions_delete on public.community_reactions;
create policy creactions_delete on public.community_reactions
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

notify pgrst, 'reload schema';
