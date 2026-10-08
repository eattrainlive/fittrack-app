-- Staff Hub — contact cadence progress for the Reach out & Win back call lists.
-- -----------------------------------------------------------------------------
-- Tracks where a coach is in the call cadence for each person on the Reach out
-- (milestone check-in) and Win back (lapsed) lists:
--   attempts       — number of "no answer" calls logged (0..3)
--   whatsapp_sent  — a reach-out WhatsApp has been sent after the calls
--   status         — which bucket the card sits in
--   last_note/outcome — the most recent note + outcome (full history is the
--                       append-only Actions tab via logStaffActions)
--
-- One row per person per list (email + list_type). Staff-only, like the other
-- ops tables. Terminal statuses: reachout -> 'done'; lapsed -> 'joined' /
-- 'not_interested'.

create table if not exists public.staff_contact_progress (
  email         citext not null,
  list_type     text   not null check (list_type in ('reachout','lapsed')),
  attempts      int    not null default 0 check (attempts between 0 and 3),
  whatsapp_sent boolean not null default false,
  status        text   not null default 'todo'
                   check (status in ('todo','in_progress','done','joined','not_interested')),
  last_note     text,
  last_outcome  text,
  owner         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  primary key (email, list_type)
);

alter table public.staff_contact_progress enable row level security;

-- READ: staff only (matches the other ops tables).
drop policy if exists staff_contact_progress_read on public.staff_contact_progress;
create policy staff_contact_progress_read on public.staff_contact_progress
  for select to authenticated using (public.is_staff());

-- WRITE (insert / update / delete): staff only. Coaches work the list in-app.
drop policy if exists staff_contact_progress_write on public.staff_contact_progress;
create policy staff_contact_progress_write on public.staff_contact_progress
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Keep updated_at fresh on change.
create or replace function public.touch_staff_contact_progress()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_staff_contact_progress on public.staff_contact_progress;
create trigger trg_touch_staff_contact_progress
  before update on public.staff_contact_progress
  for each row execute function public.touch_staff_contact_progress();
