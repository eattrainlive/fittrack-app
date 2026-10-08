-- Turn the "Message a coach" WhatsApp button ON in the Coaching tab for all members.
-- Run in Supabase.

update public.feature_settings
  set value = jsonb_set(value, '{enabledEverywhere}', 'true')
  where key = 'coach_whatsapp';

notify pgrst, 'reload schema';

-- (Optional) to keep it ONLY in the Coaching tab and remove it from the trial hub:
--   update public.feature_settings
--     set value = jsonb_set(value, '{enabledOnTrial}', 'false')
--   where key = 'coach_whatsapp';
