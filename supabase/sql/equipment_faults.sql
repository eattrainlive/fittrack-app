-- Fault / equipment report centre for the Staff Hub. Anyone on the team logs a
-- piece of broken kit (title, location, severity, optional photo); it becomes a
-- tracked ticket (open → in_progress → fixed) that shows on the Today feed until
-- resolved. Staff-only. Run once in the Supabase SQL editor.

create table if not exists public.equipment_faults (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                    -- "Treadmill 3 — belt slipping"
  location    text,                             -- "Main floor", "Studio", "Changing rooms"
  severity    text not null default 'medium',   -- low | medium | high | out_of_order
  status      text not null default 'open',     -- open | in_progress | fixed
  photo_url   text,                             -- optional (equipment-faults bucket)
  notes       text,
  reported_by text,                             -- staff display name
  resolved_by text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists equipment_faults_status_idx
  on public.equipment_faults(status, severity, created_at desc);

alter table public.equipment_faults enable row level security;

-- Staff can do everything; nobody else sees the board.
drop policy if exists equipment_faults_staff on public.equipment_faults;
create policy equipment_faults_staff on public.equipment_faults
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── Storage bucket for fault photos (public read so the <img> loads, staff write) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('equipment-faults', 'equipment-faults', true, 10485760)   -- 10 MB cap
on conflict (id) do update
  set public = true, file_size_limit = 10485760;

drop policy if exists equipment_faults_photo_read on storage.objects;
create policy equipment_faults_photo_read on storage.objects
  for select to public using (bucket_id = 'equipment-faults');

drop policy if exists equipment_faults_photo_write on storage.objects;
create policy equipment_faults_photo_write on storage.objects
  for all to authenticated
  using (bucket_id = 'equipment-faults' and public.is_staff())
  with check (bucket_id = 'equipment-faults' and public.is_staff());

notify pgrst, 'reload schema';
