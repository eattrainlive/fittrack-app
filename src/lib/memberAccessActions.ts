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
 * Staff set/reset a member's password directly (for someone who can't use the
 * email reset flow). The password is sent to the edge function, which uses the
 * service role to update the auth user — it never touches the browser's session.
 * Pass the member's AUTH user id (user_id ?? id); email is a fallback lookup.
 */
export const setMemberPassword = async (
  staffSecret: string,
  memberId: string,
  password: string,
  email?: string,
): Promise<{ ok?: boolean; email?: string }> => {
  return manageMembers({
    action: "setPassword",
    memberId,
    email,
    password,
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
