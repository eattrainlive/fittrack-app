import { supabase } from "@/lib/supabase";

const manageMembers = async (body: any) => {
  const { data, error } = await supabase.functions.invoke("manage-members", {
    body,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

/**
 * Save a member's allowed streams. Server-side this also sets
 * `access_override = true` (manual override), so the GymOS webhook will no
 * longer auto-update this member's access on membership changes.
 */
export const setMemberAccess = async (
  staffSecret: string,
  memberId: string,
  allowed: string[],
) => {
  return manageMembers({
    action: "setAccess",
    memberId,
    allowed,
    staffSecret,
  });
};

/**
 * Clear a member's manual access override. Server-side this sets
 * `access_override = false` and recomputes `allowed_access` from the
 * member's current membership. Returns the new `allowed_access`.
 */
export const clearMemberAccessOverride = async (
  staffSecret: string,
  memberId: string,
): Promise<{ allowed_access?: string[] }> => {
  return manageMembers({
    action: "clearAccessOverride",
    memberId,
    staffSecret,
  });
};
