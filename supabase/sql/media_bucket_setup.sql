-- Creates the "media" storage bucket the app uploads progress/nutrition photos to.
-- Without this, photo uploads fail with "bucket not found".

-- 1. Create the bucket the app uploads to (public read, matching the app's getPublicUrl).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 2. Policies: authenticated members can upload/update; anyone can read.
--    (If any policy name already exists, skip that statement.)
create policy "media_auth_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
create policy "media_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'media');
create policy "media_public_read" on storage.objects
  for select to public using (bucket_id = 'media');
