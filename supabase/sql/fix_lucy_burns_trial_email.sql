-- Lucy Burns: her trial_cohort row has a typo email (lucyburns95@homail.com)
-- so it never matched her real account / membership (lucyburns95@hotmail.com)
-- and she never showed as a conversion. This corrects the trial record onto the
-- right email and marks her converted, pulling the membership product from
-- gym_members if present. Safe if a correct-email row already exists.
-- Run once in the Supabase SQL editor.

do $$
declare
  v_typo citext := 'lucyburns95@homail.com';
  v_real citext := 'lucyburns95@hotmail.com';
  v_prod text;
begin
  -- The paid membership product she's on (if we can see it), for the record.
  select product into v_prod
  from public.gym_members
  where email = v_real and lower(status) = 'active'
  order by updated_at desc nulls last
  limit 1;

  if exists (select 1 from public.trial_cohort where email = v_real) then
    -- A correct-email trial row already exists → mark it converted, drop the typo.
    update public.trial_cohort
      set converted = true,
          converted_product = coalesce(converted_product, v_prod),
          converted_at = coalesce(converted_at, now()),
          updated_at = now()
      where email = v_real;
    delete from public.trial_cohort where email = v_typo;
  else
    -- Move the typo row onto the real email and mark it converted.
    update public.trial_cohort
      set email = v_real,
          converted = true,
          converted_product = coalesce(converted_product, v_prod),
          converted_at = coalesce(converted_at, now()),
          updated_at = now()
      where email = v_typo;
  end if;
end $$;
