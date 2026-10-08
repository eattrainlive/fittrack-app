-- "Add to home screen" help videos (staff-editable). Run in Supabase. Idempotent.
-- iOS video seeded (Vimeo 1227342553); Android added when recorded.
-- The install prompt reads these and shows the matching platform's video.

insert into public.feature_settings (key, value) values (
  'install_help',
  '{"iosVideoUrl": "https://player.vimeo.com/video/1227342553", "androidVideoUrl": ""}'::jsonb
) on conflict (key) do nothing;

-- If the row already existed, set the iOS URL:
update public.feature_settings
  set value = jsonb_set(value, '{iosVideoUrl}', '"https://player.vimeo.com/video/1227342553"')
  where key = 'install_help';

notify pgrst, 'reload schema';

-- When the Android video is ready, set it with:
--   update public.feature_settings
--     set value = jsonb_set(value, '{androidVideoUrl}', '"https://player.vimeo.com/video/<ANDROID_ID>"')
--   where key = 'install_help';
