-- FitTrack — one-off cleanup of test leftovers. SAFE: only touches already
-- soft-deleted programmes and orphaned extras. Active programmes are NOT touched.
-- Run in the Supabase SQL editor. Do the SELECT previews first, confirm the
-- counts, then run the DELETEs.

-- ── PREVIEW (run these first) ───────────────────────────────────────────────
-- Active programmes that will be KEPT (expected: 2 — "PT Programme Test", "Stronger Test"):
select id, name from public.programs where is_deleted is distinct from true order by name;

-- Soft-deleted rows that will be removed (expected: ~53):
select count(*) as will_delete_programs from public.programs where is_deleted is true;

-- Orphaned prog_extras that will be removed (expected: ~50):
select count(*) as will_delete_extras
from public.user_settings us
where us.key like 'prog_extras_%'
  and not exists (select 1 from public.programs p where p.id = replace(us.key,'prog_extras_',''));

-- ── CLEANUP (run after confirming the previews) ─────────────────────────────
-- 1. Hard-delete only soft-deleted programmes. Active rows (is_deleted null/false) are untouched.
delete from public.programs where is_deleted is true;

-- 2. Remove prog_extras whose programme no longer exists (keeps any for a live programme).
delete from public.user_settings us
where us.key like 'prog_extras_%'
  and not exists (select 1 from public.programs p where p.id = replace(us.key,'prog_extras_',''));

-- ── VERIFY ──────────────────────────────────────────────────────────────────
select count(*) as programs_left from public.programs;                 -- expect 2
select count(*) as extras_left from public.user_settings where key like 'prog_extras_%'; -- expect 0
