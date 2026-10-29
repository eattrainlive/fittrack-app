-- ============================================================================
-- Let members grow the food library organically: when a member Quick-Adds a
-- food that came from the Open Food Facts fallback (not already in our library),
-- the app calls this function to save it into `foods` for everyone next time.
--
-- Members CANNOT write to `foods` directly (that stays staff-only). This
-- SECURITY DEFINER function is the only member-facing way in, and it:
--   • only INSERTS (never updates/deletes existing rows),
--   • skips anything already present (dedupe on name+brand),
--   • flags it verified=false + source='member' so it ranks below your trusted
--     rows and shows as "unverified" in the admin screen for you to confirm,
--   • sanity-checks the macros so junk can't land.
-- Requires foods_add_source.sql (the `source` column) to have been run first.
-- Run in Supabase SQL editor.
-- ============================================================================

create or replace function public.add_member_food(
  p_name text,
  p_brand text default null,
  p_calories numeric default 0,
  p_protein numeric default 0,
  p_carbs numeric default 0,
  p_fats numeric default 0,
  p_fibre numeric default null,
  p_serving_desc text default null,
  p_serving_g numeric default null,
  p_category text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(p_name), '');
  v_brand text := nullif(btrim(p_brand), '');
begin
  -- Must be signed in.
  if auth.uid() is null then
    return;
  end if;

  -- Basic sanity: real name, sane macros. Silently ignore otherwise.
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then
    return;
  end if;
  if p_calories is null or p_calories < 0 or p_calories > 900 then
    return;
  end if;
  if coalesce(p_protein,0) < 0 or coalesce(p_carbs,0) < 0 or coalesce(p_fats,0) < 0 then
    return;
  end if;
  if coalesce(p_protein,0) > 100 or coalesce(p_carbs,0) > 100 or coalesce(p_fats,0) > 100 then
    return;
  end if;

  -- Skip if we already have it (case-insensitive name + brand match).
  if exists (
    select 1 from public.foods f
    where lower(f.name) = lower(v_name)
      and coalesce(lower(f.brand), '') = coalesce(lower(v_brand), '')
  ) then
    return;
  end if;

  insert into public.foods
    (name, brand, calories, protein, carbs, fats, fibre,
     serving_desc, serving_g, category, verified, source, created_by)
  values
    (v_name, v_brand, p_calories, coalesce(p_protein,0), coalesce(p_carbs,0),
     coalesce(p_fats,0), p_fibre, nullif(btrim(p_serving_desc),''), p_serving_g,
     coalesce(nullif(btrim(p_category),''), 'Member added'), false, 'member', auth.uid());
end;
$$;

grant execute on function public.add_member_food(
  text, text, numeric, numeric, numeric, numeric, numeric, text, numeric, text
) to authenticated;

notify pgrst, 'reload schema';
