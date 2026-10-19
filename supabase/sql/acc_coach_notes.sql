-- Accountability — coach notes on a client's profile.
-- A dated timeline of free-text round-ups the coach writes after a conversation:
-- an in-person onboarding session, an in-person (non-Loom) check-in, or an
-- ad-hoc note. Separate from acc_checkins.coach_reply_note (which is the reply
-- attached to a specific weekly check-in) so coaches have a running log they can
-- copy out (e.g. to paste into a Claude project for a client-facing round-up).
-- Staff-only. Run in Supabase. Safe to re-run.

create table if not exists public.acc_coach_notes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.acc_clients(id) on delete cascade,
  coach_user_id uuid not null default auth.uid(),
  kind          text not null default 'general'
                  check (kind in ('onboarding','checkin','general')),
  week_number   int,                                   -- for kind='checkin' (0..6), else null
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists acc_coach_notes_client_idx
  on public.acc_coach_notes (client_id, created_at desc);

alter table public.acc_coach_notes enable row level security;

-- Staff-only: coaches read/write all notes; members never see this table.
drop policy if exists acc_coach_notes_staff on public.acc_coach_notes;
create policy acc_coach_notes_staff on public.acc_coach_notes
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

notify pgrst, 'reload schema';
