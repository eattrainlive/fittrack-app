import { supabase } from "@/lib/supabase";

export interface RosterStats {
  total: number;
  onApp: number;
  invited: number;
  notInvited: number;
}

export interface RosterMember {
  id: string;
  gym_member_id?: string;
  email: string;
  full_name: string;
  product?: string | null;
  membership?: string | null;
  membership_status?: string | null;
  joined_on?: string | null;
  allowed_access?: string[];
  online_client?: boolean;
  is_staff?: boolean;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  onApp?: boolean;
  invitedPending?: boolean;
  notInvited?: boolean;
  status?: "onApp" | "invitedPending" | "notInvited";
}

const ALL_ACCESS = [
  "Foundations",
  "Stronger",
  "Fusion",
  "Performance",
  "Group PT",
];

/** Default app access per membership bucket (used when inviting). */
export const accessForProduct = (product?: string | null): string[] => {
  const s = (product || "").toLowerCase();
  if (/trial/.test(s)) return ["Foundations", "Stronger", "Group PT"];
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s))
    return ["Stronger", "Performance"];
  if (/team\s*training|classes?/.test(s)) return ["Group PT"];
  if (/core|open\s*gym|24\s*hour|gym\s*member/.test(s)) return ["Foundations"];
  return ALL_ACCESS;
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
 * Falls back to the app-user-only `list` action if rosterStatus isn't
 * deployed yet. Returns the members array + adoption stats.
 */
export const loadRosterMembers = async (
  staffSecret: string,
): Promise<{ members: RosterMember[]; stats: RosterStats }> => {
  let data: any = null;
  try {
    data = await manageMembers({ action: "rosterStatus", staffSecret });
  } catch {
    data = await manageMembers({ action: "list", staffSecret });
  }
  if (data?.roster) {
    return {
      members: data.roster as RosterMember[],
      stats: {
        total: data.total ?? data.roster.length,
        onApp: data.onApp ?? 0,
        invited: data.invited ?? 0,
        notInvited: data.notInvited ?? 0,
      },
    };
  }
  const members = (data?.members ?? []) as RosterMember[];
  const onApp = members.filter((m) => m.onApp || m.last_sign_in_at).length;
  return {
    members,
    stats: { total: members.length, onApp, invited: 0, notInvited: 0 },
  };
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

/** Bulk invite a list of roster members. */
export const bulkInviteRoster = async (
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
