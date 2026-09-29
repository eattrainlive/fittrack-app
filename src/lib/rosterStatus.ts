import { supabase } from "@/lib/supabase";
import type { Adoption, AppStatus } from "@/components/MemberAppStatusFilter";

export interface RosterMember {
  id: string;
  full_name: string;
  email: string;
  product?: string | null;
  status?: string | null;
  joined_on?: string | null;
  membership?: string | null;
  membership_type?: string | null;
  membership_status?: string | null;
  allowed_access?: string[];
  is_staff?: boolean;
  online_client?: boolean;
  appStatus: AppStatus;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
}

/**
 * Load the full Quoox roster (gym_members) and overlay app-account status.
 * Every imported member appears — even those who've never signed up — because
 * gym usage (scan_events / member_bookings) keys on gym_members.id, not on an
 * auth account.
 *
 * appStatus:
 *   onApp        — has an auth.users row (signed in / linked)
 *   invited      — invited (member_invites row) but never signed in
 *   notInvited   — no account, no pending invite
 */
export async function loadRosterStatus(): Promise<{
  members: RosterMember[];
  adoption: Adoption;
}> {
  // 1. The full roster.
  const { data: roster, error } = await supabase
    .from("gym_members")
    .select("id,email,full_name,product,joined_on,status");
  if (error || !roster)
    return {
      members: [],
      adoption: { onApp: 0, invited: 0, notInvited: 0, total: 0 },
    };

  // 2. Existing app users (auth users) matched by email.
  const { data: appUsers } = await supabase
    .from("members")
    .select("email,full_name,is_staff,online_client,allowed_access");
  const appEmails = new Set(
    (appUsers || []).map((u: any) =>
      String(u.email || "")
        .toLowerCase()
        .trim(),
    ),
  );
  const appUserMap = new Map<string, any>();
  for (const u of appUsers || []) {
    appUserMap.set(
      String(u.email || "")
        .toLowerCase()
        .trim(),
      u,
    );
  }

  // 3. Pending invites (invited but never signed in).
  const { data: invites } = await supabase
    .from("member_invites")
    .select("email,created_at");
  const inviteMap = new Map<string, string>();
  for (const inv of invites || []) {
    const key = String(inv.email || "")
      .toLowerCase()
      .trim();
    if (key && !inviteMap.has(key)) inviteMap.set(key, inv.created_at);
  }

  const members: RosterMember[] = [];
  let onApp = 0;
  let invited = 0;
  let notInvited = 0;

  for (const r of roster) {
    const email = String(r.email || "")
      .toLowerCase()
      .trim();
    const appUser = appUserMap.get(email);
    const inviteAt = inviteMap.get(email);
    let appStatus: AppStatus;
    if (appEmails.has(email)) {
      appStatus = "onApp";
      onApp++;
    } else if (inviteAt) {
      appStatus = "invited";
      invited++;
    } else {
      appStatus = "notInvited";
      notInvited++;
    }
    members.push({
      id: r.id,
      full_name: r.full_name || appUser?.full_name || "Unknown",
      email: r.email || "",
      product: r.product,
      status: r.status,
      joined_on: r.joined_on,
      membership: r.product,
      membership_type: r.product,
      allowed_access: appUser?.allowed_access || [],
      is_staff: appUser?.is_staff || false,
      online_client: appUser?.online_client || false,
      appStatus,
      invited_at: inviteAt || null,
    });
  }

  return {
    members,
    adoption: { onApp, invited, notInvited, total: members.length },
  };
}

/** Default access streams per membership bucket (used on invite). */
export function accessForProduct(product?: string | null): string[] {
  const s = (product || "").toLowerCase();
  if (/trial/.test(s)) return ["Foundations", "Stronger", "Group PT"];
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s))
    return ["Stronger", "Performance"];
  if (/team\s*training|classes?/.test(s)) return ["Fusion", "Group PT"];
  if (/core|open\s*gym|24\s*hour|gym\s*member/.test(s)) return ["Foundations"];
  return ["Foundations"];
}
