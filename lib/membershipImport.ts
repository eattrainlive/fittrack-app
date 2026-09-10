import { supabase } from "./supabase";

const normEmail = (e: string) => e.toLowerCase().trim();

export interface ImportResults {
  matched: number;
  created: number;
  unmatched: number;
  flagged: number;
  unmatchedEmails: string[];
}

// Normalise a Quoox date (dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd) to ISO YYYY-MM-DD.
// Returns null if it won't parse — never a malformed date (which would 22008 the insert).
function toISODate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date)
    return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  let y: number, mo: number, d: number;
  let m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/); // dd/mm/yyyy (UK)
  if (m) {
    d = +m[1];
    mo = +m[2];
    y = +m[3];
  } else if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
  } else {
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; // reject impossible dates (e.g. 2026-28-05)
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Backfill / sync the `gym_members` roster from a Quoox export.
 *
 * - Rows whose email already exists in `gym_members` are UPDATED (matched).
 * - Rows whose email is NOT yet in `gym_members` are INSERTED (created) — the
 *   old implementation skipped these, so a first import created nothing.
 * - Rows absent from both the active and ended uploads but previously active
 *   are flagged `pending_review`.
 *
 * Uses the client (anon) key, so it relies on the staff-write RLS policy
 * (see supabase/gym_members_staff_write.sql).
 */
export const importMemberships = async (
  activeRows: {
    email: string;
    full_name?: string;
    product?: string;
    joined_on?: string;
  }[],
  endedRows: {
    email: string;
    full_name?: string;
    product?: string;
    ended_on?: string;
  }[],
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const results: ImportResults = {
    matched: 0,
    created: 0,
    unmatched: 0,
    flagged: 0,
    unmatchedEmails: [],
  };

  // Fetch existing gym_members
  const { data: existingMembers } = await supabase
    .from("gym_members")
    .select("*");
  const existingByEmail = new Map(
    (existingMembers || []).map((m: any) => [normEmail(m.email), m]),
  );

  const activeEmails = new Set(activeRows.map((r) => normEmail(r.email)));
  const endedEmails = new Set(endedRows.map((r) => normEmail(r.email)));

  // Process active rows
  for (const row of activeRows) {
    const email = normEmail(row.email);
    const existing = existingByEmail.get(email);

    if (existing) {
      // Update to active
      const { error } = await supabase
        .from("gym_members")
        .update({
          status: "active",
          product: row.product || existing.product,
          full_name: row.full_name || existing.full_name,
          joined_on: toISODate(row.joined_on) || existing.joined_on,
          last_import_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (!error) {
        results.matched++;
        // Write status history if status changed
        if (existing.status !== "active") {
          await supabase.from("membership_status_history").insert({
            gym_member_id: existing.id,
            status: "active",
            effective_date: new Date().toISOString().split("T")[0],
            product: row.product || existing.product,
          });
        }
      } else {
        results.unmatched++;
        results.unmatchedEmails.push(row.email);
      }
    } else {
      // Not in roster yet — INSERT a new gym_members row so the roster is
      // backfilled. gym_members.id has NO default, so we build it from the
      // email (stable, matches the webhook's fallback id). Skip rows with no
      // email (can't build an id). joined_on is normalised to ISO or null.
      const em = normEmail(row.email);
      if (!em) {
        results.unmatched++;
        results.unmatchedEmails.push(row.email);
        continue;
      }
      const nowIso = new Date().toISOString();
      const { data: inserted, error } = await supabase
        .from("gym_members")
        .insert({
          id: `email:${em}`,
          email: em,
          full_name: row.full_name ?? null,
          product: row.product ?? null,
          status: "active",
          joined_on: toISODate(row.joined_on),
          last_import_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .maybeSingle();

      if (!error && inserted) {
        results.created++;
        existingByEmail.set(em, inserted); // keep map in sync for the flag pass
      } else {
        results.unmatched++;
        results.unmatchedEmails.push(row.email);
      }
    }
  }

  // Process ended rows
  for (const row of endedRows) {
    const email = normEmail(row.email);
    const existing = existingByEmail.get(email);

    if (existing) {
      const endedISO =
        toISODate(row.ended_on) || new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("gym_members")
        .update({
          status: "cancelled",
          ended_on: endedISO,
          last_import_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (!error) {
        results.matched++;
        if (existing.status !== "cancelled") {
          await supabase.from("membership_status_history").insert({
            gym_member_id: existing.id,
            status: "cancelled",
            effective_date: endedISO,
            product: row.product || existing.product,
          });
        }
      }
    }
  }

  // Flag members active before, but absent from Active upload and not in Ended
  for (const [email, member] of existingByEmail) {
    if (
      member.status === "active" &&
      !activeEmails.has(email) &&
      !endedEmails.has(email)
    ) {
      await supabase
        .from("gym_members")
        .update({
          status: "pending_review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);
      results.flagged++;
    }
  }

  // Record the import batch
  await supabase.from("import_batches").insert({
    matched_count: results.matched,
    unmatched_count: results.unmatched,
    flagged_count: results.flagged,
  });

  return { success: true, results };
};
