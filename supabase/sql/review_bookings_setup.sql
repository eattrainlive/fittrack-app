-- Review bookings — mirror of the end-of-trial REVIEW appointment status from GHL.
-- Lets the app show "review booked ✓" vs "needs booking" on the Members tab / coach view.
-- One row per member (their current review), matched by email. Fed by a GHL workflow webhook.

create table if not exists public.review_bookings (
  email          citext primary key,            -- one current review per member (upsert on email)
  appointment_at timestamptz,                    -- the booked review date/time
  status         text not null default 'booked'
                   check (status in ('booked','cancelled','completed','no_show')),
  ghl_contact_id text,
  source         text default 'ghl',
  raw            jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Staff app reads this to badge cards; the webhook writes via service role.
alter table public.review_bookings enable row level security;
drop policy if exists review_bookings_read on public.review_bookings;
create policy review_bookings_read on public.review_bookings
  for select to authenticated using (true);
