-- ============================================================================
-- Staff access to member_macros (calorie/macro targets).
-- Members keep their own-row RLS (mm_macros_own) and can always self-edit.
-- This adds: staff SELECT (to view any member's targets) + a SECURITY DEFINER
-- RPC so staff can SET a member's targets (own-only RLS would otherwise block
-- writing another member's row). coach_set = true marks a staff override.
-- Run in Supabase SQL editor.
-- ============================================================================

drop policy if exists mm_staff_read on public.member_macros;
create policy mm_staff_read on public.member_macros
  for select to authenticated
  using (public.is_staff());

create or replace function public.staff_set_member_macros(
  p_member_id uuid,
  p_calorie int,
  p_protein int,
  p_carb int,
  p_fat int
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    return;
  end if;
  insert into public.member_macros
    (member_id, calorie_target, protein_target, carb_target, fat_target,
     coach_set, tracking_enabled, updated_at)
  values
    (p_member_id, p_calorie, p_protein, p_carb, p_fat, true, true, now())
  on conflict (member_id) do update set
    calorie_target  = excluded.calorie_target,
    protein_target  = excluded.protein_target,
    carb_target     = excluded.carb_target,
    fat_target      = excluded.fat_target,
    coach_set       = true,
    tracking_enabled = true,
    updated_at      = now();
end;
$$;

grant execute on function public.staff_set_member_macros(uuid, int, int, int, int)
  to authenticated;

notify pgrst, 'reload schema';
