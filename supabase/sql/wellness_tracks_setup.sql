-- "Listen & Let Go" — audio recordings (sound baths now; Carla's wider wellness
-- hub later). A small table of tracks + a public audio storage bucket. Members
-- read published tracks; staff manage them. Run once in the Supabase SQL editor.

create table if not exists public.wellness_tracks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  audio_url      text not null,              -- public URL (wellness-audio bucket or external)
  duration_label text,                       -- optional, e.g. "32 min"
  sort_order     int  not null default 0,
  published      boolean not null default true,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists wellness_tracks_order_idx
  on public.wellness_tracks(published, sort_order, created_at);

alter table public.wellness_tracks enable row level security;

-- Read: published tracks for any signed-in member; staff also see unpublished.
drop policy if exists wellness_tracks_read on public.wellness_tracks;
create policy wellness_tracks_read on public.wellness_tracks
  for select to authenticated
  using (published or public.is_staff());

-- Write: staff only.
drop policy if exists wellness_tracks_write on public.wellness_tracks;
create policy wellness_tracks_write on public.wellness_tracks
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── Storage bucket for the audio files (public read, staff write, 200MB cap) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('wellness-audio', 'wellness-audio', true, 209715200)
on conflict (id) do update
  set public = true, file_size_limit = 209715200;

drop policy if exists wellness_audio_read on storage.objects;
create policy wellness_audio_read on storage.objects
  for select to public using (bucket_id = 'wellness-audio');

drop policy if exists wellness_audio_write on storage.objects;
create policy wellness_audio_write on storage.objects
  for all to authenticated
  using (bucket_id = 'wellness-audio' and public.is_staff())
  with check (bucket_id = 'wellness-audio' and public.is_staff());

notify pgrst, 'reload schema';
