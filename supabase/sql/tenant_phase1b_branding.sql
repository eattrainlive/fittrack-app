-- MULTI-TENANT PHASE 1b — seed ETL's full branding object.
-- Run AFTER tenant_phase1_foundations.sql (which creates the gyms table + ETL row).
-- Fills ETL's branding to the shape the app's BrandingProvider reads. Values are
-- ETL's current look, so the app is visually unchanged. Colours are HSL triples
-- matching index.css CSS variables (lime green). Safe to re-run.
update public.gyms
set branding = jsonb_build_object(
  'app_name',   'FitTrack',
  'brand_name', 'Eat Train Live',
  'tagline',    'Powered by Eat Train Live',
  'logo_light', 'https://vibe.filesafe.space/1783496939163756206/attachments/43e3e84e-8d06-4052-93d2-8ba0c5f1ea44.png',
  'logo_dark',  'https://vibe.filesafe.space/1783496939163756206/attachments/ca530c1e-8f9e-4207-b3c5-8979aab63404.png',
  'theme', jsonb_build_object(
    'primary',         '84.8 100% 46.5%',
    'accent',          '84.8 100% 46.5%',
    'ring',            '84.8 100% 46.5%',
    'sidebar_primary', '84.8 100% 46.5%'
  )
)
where id = 'etl';
