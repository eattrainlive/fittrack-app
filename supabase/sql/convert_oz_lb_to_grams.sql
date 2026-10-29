-- ============================================================================
-- Convert oz / lb (pounds) to grams in EVERY recipe's ingredients + method text.
-- Macros are NOT touched (they're stored separately) — this only rewrites the
-- displayed text. oz = 28.35g, lb = 453.592g, rounded to the nearest gram.
-- Leaves "fl oz" (liquid volume) and existing gram amounts alone.
--
-- HOW TO USE:
--   1. Run the whole file. It creates a helper function, shows a PREVIEW of what
--      will change, then UPDATEs the rows.
--   2. If you want to see the preview WITHOUT changing anything first, run only
--      down to the "PREVIEW" select, check it, then run the UPDATE block.
-- Re-runnable: converted text has no oz/lb left, so running again changes nothing.
-- ============================================================================

create or replace function public.to_grams(src text)
returns text language plpgsql immutable as $$
declare
  t text := src;
  m text[];
  grams int;
begin
  if t is null then return null; end if;

  -- 1) Normalise fractions to decimals (pure string work, no maths needed).
  --    Unicode fractions, mixed ("1½"→"1.5") and standalone ("½"→"0.5").
  t := regexp_replace(t, '([0-9])\s*½', '\1.5', 'g');  t := replace(t,'½','0.5');
  t := regexp_replace(t, '([0-9])\s*¼', '\1.25','g');  t := replace(t,'¼','0.25');
  t := regexp_replace(t, '([0-9])\s*¾', '\1.75','g');  t := replace(t,'¾','0.75');
  t := regexp_replace(t, '([0-9])\s*⅓', '\1.333','g'); t := replace(t,'⅓','0.333');
  t := regexp_replace(t, '([0-9])\s*⅔', '\1.667','g'); t := replace(t,'⅔','0.667');
  t := regexp_replace(t, '([0-9])\s*⅛', '\1.125','g'); t := replace(t,'⅛','0.125');
  --    ASCII fractions: mixed first ("1 1/2"→"1.5"), then standalone ("1/2"→"0.5").
  t := regexp_replace(t, '([0-9])\s+1/2', '\1.5',  'g');
  t := regexp_replace(t, '([0-9])\s+1/4', '\1.25', 'g');
  t := regexp_replace(t, '([0-9])\s+3/4', '\1.75', 'g');
  t := regexp_replace(t, '([0-9])\s+1/3', '\1.333','g');
  t := regexp_replace(t, '([0-9])\s+2/3', '\1.667','g');
  t := replace(t,'1/2','0.5'); t := replace(t,'1/4','0.25'); t := replace(t,'3/4','0.75');
  t := replace(t,'1/3','0.333'); t := replace(t,'2/3','0.667'); t := replace(t,'1/8','0.125');

  -- 2) Protect "fl oz" (liquid volume) so we don't convert it as a weight.
  t := regexp_replace(t, '([0-9.]+)\s*fl\.?\s*oz', '\1 ##FLOZ##', 'gi');

  -- 3) Convert ounces → grams (loop: replace one at a time, computing each).
  loop
    m := regexp_match(t, '([0-9]+(?:\.[0-9]+)?)\s*(ounces|ounce|oz)\y', 'i');
    exit when m is null;
    grams := round(m[1]::numeric * 28.35);
    t := regexp_replace(t, '[0-9]+(?:\.[0-9]+)?\s*(ounces|ounce|oz)\y', grams::text || 'g', 'i');
  end loop;

  -- 4) Convert pounds → grams.
  loop
    m := regexp_match(t, '([0-9]+(?:\.[0-9]+)?)\s*(pounds|pound|lbs|lb)\y', 'i');
    exit when m is null;
    grams := round(m[1]::numeric * 453.592);
    t := regexp_replace(t, '[0-9]+(?:\.[0-9]+)?\s*(pounds|pound|lbs|lb)\y', grams::text || 'g', 'i');
  end loop;

  -- 5) Restore fl oz.
  t := replace(t, '##FLOZ##', 'fl oz');
  return t;
end $$;

-- ---- PREVIEW: rows that will change (run this on its own to check first) ----
select name,
       ingredients as ingredients_before,
       public.to_grams(ingredients) as ingredients_after
from public.recipes
where (ingredients ~* '[0-9][^a-z]{0,3}(oz|ounce|lb|pound)'
    or method       ~* '[0-9][^a-z]{0,3}(oz|ounce|lb|pound)')
order by name
limit 100;

-- ---- APPLY: convert ingredients + method everywhere ----
update public.recipes
set ingredients = public.to_grams(ingredients),
    method      = public.to_grams(method)
where (ingredients ~* '[0-9][^a-z]{0,3}(oz|ounce|lb|pound)'
    or method       ~* '[0-9][^a-z]{0,3}(oz|ounce|lb|pound)');

-- optional cleanup:
-- drop function public.to_grams(text);
