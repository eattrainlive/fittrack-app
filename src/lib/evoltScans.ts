// Evolt body-scan history + member alternate-email matching.
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authUser";

export interface EvoltScan {
  id: string;
  scan_at: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  weight: number | null;
  body_fat_pct: number | null;
  bmi: number | null;
  bio_age: number | null;
  lbm: number | null;
  smm: number | null;
  smm_rating: string | null;
  protein: number | null;
  tbw: number | null;
  body_fat: number | null;
  subcutaneous_fat: number | null;
  visceral_fat: number | null;
  visceral_fat_area: number | null;
  whr: number | null;
  raw: any;
}

/**
 * The signed-in person's OWN scans, oldest-first. Filters explicitly to their
 * login email + any linked emails — we can't rely on RLS alone here because a
 * staff account can read everyone's scans (for coaching tools), which would
 * otherwise show the whole gym on their personal Progress tab.
 */
export async function getMyScans(): Promise<EvoltScan[]> {
  const {
    data: { user },
  } = await getCurrentUser();
  if (!user) return [];
  const emails = new Set<string>();
  if (user.email) emails.add(String(user.email).toLowerCase().trim());
  try {
    const linked = await listMemberEmails(user.id);
    for (const m of linked) emails.add(m.email.toLowerCase().trim());
  } catch {
    /* ignore — login email alone is fine */
  }
  const list = [...emails].filter(Boolean);
  if (!list.length) return [];
  const { data, error } = await supabase
    .from("evolt_scans")
    .select(
      "id, scan_at, email, first_name, last_name, weight, body_fat_pct, bmi, bio_age, lbm, smm, smm_rating, protein, tbw, body_fat, subcutaneous_fat, visceral_fat, visceral_fat_area, whr, raw",
    )
    .in("email", list)
    .order("scan_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EvoltScan[];
}

/** Staff: scans for a set of emails (e.g. a member + their linked emails). */
export async function getScansForEmails(emails: string[]): Promise<EvoltScan[]> {
  const list = emails.map((e) => e.toLowerCase().trim()).filter(Boolean);
  if (!list.length) return [];
  const { data, error } = await supabase
    .from("evolt_scans")
    .select("*")
    .in("email", list)
    .order("scan_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EvoltScan[];
}

// ── Linked alternate emails (staff-managed) ──────────────────────────────────
export interface MemberEmail {
  id: string;
  user_id: string;
  email: string;
  label: string | null;
  added_by: string | null;
  created_at: string;
}

export async function listMemberEmails(userId: string): Promise<MemberEmail[]> {
  const { data, error } = await supabase
    .from("member_emails")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as MemberEmail[];
}

export async function addMemberEmail(
  userId: string,
  email: string,
  label?: string,
  addedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("member_emails").insert({
    user_id: userId,
    email: email.toLowerCase().trim(),
    label: label?.trim() || null,
    added_by: addedBy || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeMemberEmail(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("member_emails").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
