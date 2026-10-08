-- In-app Schedule link (class timetable). Run in Supabase. Idempotent.
-- Uses the existing feature_settings table (key/value jsonb, read-all / staff-write).

insert into public.feature_settings (key, value) values (
  'schedule',
  '{"url": "https://eattrainlive.fitnesshub.net/schedule/?hf=1", "enabled": true}'::jsonb
) on conflict (key) do nothing;

-- If the row already existed, make sure the url/enabled are set:
update public.feature_settings
  set value = value
    || '{"url": "https://eattrainlive.fitnesshub.net/schedule/?hf=1", "enabled": true}'::jsonb
  where key = 'schedule';

notify pgrst, 'reload schema';
