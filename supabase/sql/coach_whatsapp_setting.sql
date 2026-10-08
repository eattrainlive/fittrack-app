-- "Message a coach" WhatsApp button settings (routes into GHL). Run in Supabase. Idempotent.
-- Uses the existing feature_settings table (key/value jsonb, read-all / staff-write).
--   number  = the GHL-connected WhatsApp number, E.164 digits only, NO "+" (e.g. 447700900123)
--   enabledOnTrial   = show on the trial hub
--   enabledEverywhere = show on the Coaching tab / profile for all members (flip on later)

-- Number seeded: 07562 928263 → 447562928263 (E.164, no leading 0, no "+").
insert into public.feature_settings (key, value) values (
  'coach_whatsapp',
  '{"number": "447562928263", "enabledOnTrial": true, "enabledEverywhere": false}'::jsonb
) on conflict (key) do nothing;

-- If the row already existed (blank number), set it now:
update public.feature_settings
  set value = jsonb_set(value, '{number}', '"447562928263"')
  where key = 'coach_whatsapp';

notify pgrst, 'reload schema';
