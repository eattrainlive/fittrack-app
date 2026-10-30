// Staff-side read/write of a member's calorie & macro targets.
// Read uses the mm_staff_read policy; write uses the staff_set_member_macros
// SECURITY DEFINER RPC (member_macros is own-row RLS otherwise).
// See supabase/sql/member_macros_staff.sql.
import { supabase } from "@/lib/supabase";
import type { MacroTargets } from "@/components/MacroTargetEditor";

export interface MemberMacrosRow extends MacroTargets {
  coach_set: boolean;
  tracking_enabled: boolean;
}

export const getMemberMacrosFor = async (
  memberId: string,
): Promise<MemberMacrosRow | null> => {
  const { data, error } = await supabase
    .from("member_macros")
    .select(
      "calorie_target,protein_target,carb_target,fat_target,coach_set,tracking_enabled",
    )
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) {
    console.warn("getMemberMacrosFor failed", error);
    return null;
  }
  if (!data) return null;
  return {
    calorie_target: data.calorie_target ?? 0,
    protein_target: data.protein_target ?? 0,
    carb_target: data.carb_target ?? 0,
    fat_target: data.fat_target ?? 0,
    coach_set: !!data.coach_set,
    tracking_enabled: !!data.tracking_enabled,
  };
};

export const staffSetMemberMacros = async (
  memberId: string,
  v: MacroTargets,
): Promise<{ success: boolean; error?: any }> => {
  const { error } = await supabase.rpc("staff_set_member_macros", {
    p_member_id: memberId,
    p_calorie: Math.round(v.calorie_target) || 0,
    p_protein: Math.round(v.protein_target) || 0,
    p_carb: Math.round(v.carb_target) || 0,
    p_fat: Math.round(v.fat_target) || 0,
  });
  return { success: !error, error };
};
