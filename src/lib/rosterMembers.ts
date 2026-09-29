import { supabase } from "@/lib/supabase";

export type AppStatusFilter = "all" | "onApp" | "invitedPending" | "notInvited";

export interface AdoptionStats {
  total: number;
  onApp: number;
  invitedPending: number;
  invited: number; // alias for invitedPending (used by the search/filter bar)
  notInvited: number;
}

export const APP_STATUS_OPTIONS: { value: AppStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "onApp", label: "On app" },
  { value: "invitedPending", label: "Invited" },
  { value: "notInvited", label: "Not on app" },
];

/**
 * Compute adoption stats from a roster of members.
 * Each member may carry onApp / invitedPending / notInvited flags
 * (set by the rosterStatus edge action) — fall back to derived values.
 */
export const computeAdoption = (members: any[]): AdoptionStats => {
  let onApp = 0;
  let invitedPending = 0;
  let notInvited = 0;
  for (const m of members) {
    if (m.onApp) onApp++;
    else if (m.invitedPending) invitedPending++;
    else if (m.notInvited) notInvited++;
    else if (m.last_sign_in_at) onApp++;
    else if (m.invited_at) invitedPending++;
    else notInvited++;
  }
  return {
    total: members.length,
    onApp,
    invitedPending,
    invited: invitedPending,
    notInvited,
  };
};

/**
 * Default stream access based on membership product bucket.
 */
export const accessForProduct = (product?: string | null): string[] => {
  const s = (product || "").toLowerCase();
  if (/trial/.test(s)) return ["Foundations", "Stronger", "Group PT"];
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s)) {
    return ["Stronger", "Performance", "Group PT"];
  }
  if (/team\s*training|classes?/.test(s)) {
    return ["Group PT", "Stronger"];
  }
  if (/core|open\s*gym|24\s*hour|gym\s*member/.test(s)) {
    return ["Foundations", "Stronger", "Fusion"];
  }
  return ["Foundations", "Stronger", "Fusion", "Performance", "Group PT"];
};

const manageMembers = async (body: any) => {
  const { data, error } = await supabase.functions.invoke("manage-members", {
    body,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

/**
 * Load every roster member (gym_members) enriched with app-account status.
 * Uses the `rosterStatus` edge action so all imported members appear (not
 * just app users). Falls back to the app-user-only `list` action.
 * Returns the members array + adoption stats.
 */
export const loadRosterMembers = async (
  staffSecret: string,
): Promise<{ members: any[]; adoption: AdoptionStats }> => {
  let data: any = null;
  try {
    data = await manageMembers({ action: "rosterStatus", staffSecret });
  } catch {
    data = await manageMembers({ action: "list", staffSecret });
  }
  if (data?.roster) {
    const roster = data.roster as any[];
    const invited = data.invited ?? 0;
    return {
      members: roster,
      adoption: {
        total: data.total ?? roster.length,
        onApp: data.onApp ?? 0,
        invited,
        invitedPending: invited,
        notInvited: data.notInvited ?? 0,
      },
    };
  }
  const members = (data?.members ?? []) as any[];
  return { members, adoption: computeAdoption(members) };
};

/** Bulk invite the not-on-app members. Returns the edge function result. */
export const bulkInviteNotOnApp = async (
  staffSecret: string,
  list: { full_name: string; email: string; product?: string | null }[],
) => {
  const members = list.map((m) => ({
    name: m.full_name,
    email: m.email,
    allowed: accessForProduct(m.product),
  }));
  return manageMembers({ action: "bulkInvite", staffSecret, members });
};

/** Send (or re-send) an app invite to a roster member. */
export const inviteRosterMember = async (
  staffSecret: string,
  member: { full_name: string; email: string; product?: string | null },
  allowed?: string[],
) => {
  return manageMembers({
    action: "invite",
    staffSecret,
    name: member.full_name,
    email: member.email,
    allowed: allowed ?? accessForProduct(member.product),
  });
};
