-- One-off cleanup: the old pricing-import sweep wrongly cancelled current trialists and new
-- joiners (they aren't in the paying-members pricing file). Restore anyone cancelled by that
-- sweep — i.e. status 'cancelled' with NO real leave date and NO manual flag — who is clearly
-- still current: on a trial product, or joined in the last 45 days.
-- Real leavers (ended_on set by the Lapsed-Members import) and manual "left" members are untouched.
update public.gym_members
set status = 'active', needs_review = false, updated_at = now()
where status = 'cancelled'
  and ended_on is null
  and manual_inactive_at is null
  and (
        product ilike '%trial%'
     or product ilike '%21 day%'
     or product ilike '%21 days%'
     or product ilike '%30 day%'
     or product ilike '%kickstart%'
     or product ilike '%forever strong%'
     or product ilike '%first month%'
     or product ilike '%£21%'
     or product ilike '%£1%'
     or (joined_on is not null and joined_on > current_date - interval '45 days')
  );

-- Show how many were restored.
select count(*) as reactivated
from public.gym_members
where status = 'active' and needs_review = false
  and (product ilike '%trial%' or product ilike '%21 day%' or product ilike '%kickstart%'
       or product ilike '%forever strong%' or product ilike '%first month%');
