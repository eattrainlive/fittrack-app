// Member-facing "credits left this period", derived from what we already sync
// from GymOS/Quoox (no Quoox API call): the membership PRODUCT (gym_members,
// member-readable by own email) gives the allowance, and member_bookings give
// what they've used in the current cycle.
//
// Allowance rules (per Michael):
//   • Open gym        → no class credits
//   • Core+           → 5 classes / cycle
//   • Team training   → unlimited classes
//   • PT              → unlimited classes + a numeric PT-session allowance (PT-10 → 10)
// PT (semi-private) session usage is counted separately from classes.
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authUser";

const isCoached = (st: any) => /semi\s*private\s*pt/i.test(String(st || ""));

type Allow = { classes: number | "unlimited" | null; pt: number | null };

/**
 * Allowances per Quoox membership plan, matched by name in PRIORITY order (first
 * match wins). Explicit so day/week counts in a name (e.g. "6 Weeks") are never
 * mistaken for a credit count. classes: number | "unlimited" | null(none);
 * pt: number of semi-private PT sessions | null. Update here when plans change.
 */
function allowancesFor(product: any): Allow {
  const p = String(product || "");
  const num = (re: RegExp): number | null => {
    const m = p.match(re);
    return m ? Number(m[1]) : null;
  };

  if (/open\s*gym/i.test(p)) return { classes: null, pt: null }; // no credits
  if (/progress\s*project/i.test(p)) return { classes: null, pt: null }; // ignore

  if (/core\s*\+|core\s*plus/i.test(p)) return { classes: 5, pt: null };

  // Couples PT: each partner gets the full PT number; unlimited classes.
  const couplesPt = num(/couples\s*(\d+)\s*pt/i);
  if (couplesPt != null) return { classes: "unlimited", pt: couplesPt };
  // Team training (incl. Couples Team Training): unlimited classes, no PT.
  if (/team\s*training/i.test(p)) return { classes: "unlimited", pt: null };

  // Fixed-PT plans (number in the name is days/weeks, NOT the PT count).
  if (/pt\s*&\s*classes\s*bolt\s*on/i.test(p)) return { classes: "unlimited", pt: 10 };
  if (/6\s*week/i.test(p)) return { classes: "unlimited", pt: 18 };
  if (/kickstart/i.test(p)) return { classes: "unlimited", pt: 10 };
  if (/forever\s*strong|30\s*day\s*trial/i.test(p)) return { classes: "unlimited", pt: 12 };

  // Unlimited classes, no PT.
  if (/classes\s*bolt\s*on/i.test(p)) return { classes: "unlimited", pt: null };
  if (/classes\s*trial/i.test(p)) return { classes: "unlimited", pt: null };
  if (/performance/i.test(p)) return { classes: "unlimited", pt: null }; // ETL Performance
  if (/first\s*month/i.test(p)) return { classes: "unlimited", pt: null }; // £1 First Month
  if (/14\s*day/i.test(p)) return { classes: "unlimited", pt: null };
  if (/7\s*day\s*free/i.test(p)) return { classes: "unlimited", pt: null };
  if (/21\s*days?\s*for/i.test(p)) return { classes: "unlimited", pt: null }; // 21 Days For £21

  // Individual PT plan: "5 Pt", "Pt- 10", "PT-15" → that many PT, unlimited classes.
  const indivPt = num(/(\d+)\s*pt\b/i) ?? num(/pt[-\s]*(\d+)/i);
  if (indivPt != null) return { classes: "unlimited", pt: indivPt };
  if (/semi\s*private\s*pt/i.test(p)) return { classes: "unlimited", pt: null };

  return { classes: null, pt: null }; // unknown plan → hide the card
}

const daysInMonth = (y: number, m: number) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Current allowance cycle start (join-day anchored), clamped for short months. */
function cycleStart(joinedOn: string | null, now: Date): Date {
  const j = joinedOn ? new Date(joinedOn + "T00:00:00Z") : null;
  // Fallback: calendar month start if we don't have a join day.
  if (!j || isNaN(j.getTime())) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  const anchor = j.getUTCDate();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  let start = new Date(Date.UTC(y, m, Math.min(anchor, daysInMonth(y, m))));
  if (start.getTime() > now.getTime()) {
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    start = new Date(Date.UTC(y, m, Math.min(anchor, daysInMonth(y, m))));
  }
  return start;
}

export interface CreditLine {
  allowance: number | "unlimited";
  used: number;
  remaining: number | null; // null when unlimited
}
export interface MemberCredits {
  product: string;
  resetDate: string; // ISO date the period rolls over
  classes: CreditLine | null;
  pt: CreditLine | null;
}

/** The signed-in member's credits for the current period, or null if none apply. */
export const getMyCredits = async (): Promise<MemberCredits | null> => {
  try {
    const {
      data: { user },
    } = await getCurrentUser();
    if (!user?.email) return null;
    const email = user.email.toLowerCase();

    // Resolve the roster row: prefer the confirmed member-link (handles a Quoox
    // email that differs from the login email), else fall back to email match.
    let row: any = null;
    try {
      const { data: link } = await supabase
        .from("member_links")
        .select("member_id")
        .maybeSingle();
      if (link?.member_id) {
        const { data } = await supabase
          .from("gym_members")
          .select("product, status, joined_on")
          .eq("id", link.member_id)
          .maybeSingle();
        row = data ?? null;
      }
    } catch {
      /* no link / not readable — fall back to email */
    }
    if (!row) {
      const { data: rows } = await supabase
        .from("gym_members")
        .select("product, status, joined_on")
        .ilike("email", email);
      if (!rows || rows.length === 0) return null;
      row =
        rows.find((r: any) => r.status === "active") ??
        rows.find((r: any) => r.status === "paused") ??
        rows[0];
    }
    const product = String(row?.product || "");
    if (!product) return null;

    const { classes: classAllow, pt: ptAllow } = allowancesFor(product);
    if (classAllow === null && ptAllow === null) return null; // nothing to show

    const now = new Date();
    const cs = cycleStart(
      row?.joined_on ? String(row.joined_on).slice(0, 10) : null,
      now,
    );
    const reset = new Date(
      Date.UTC(cs.getUTCFullYear(), cs.getUTCMonth() + 1, cs.getUTCDate()),
    );

    // Bookings this cycle (member_bookings is readable by the member).
    const { data: bk } = await supabase
      .from("member_bookings")
      .select("session_type, session_at, status")
      .eq("email", email)
      .gte("session_at", cs.toISOString())
      .lt("session_at", reset.toISOString());
    const booked = (bk ?? []).filter((b: any) => b.status !== "cancelled");
    const classesUsed = booked.filter(
      (b: any) => !isCoached(b.session_type),
    ).length;
    const ptUsed = booked.filter((b: any) => isCoached(b.session_type)).length;

    const line = (
      allowance: number | "unlimited" | null,
      used: number,
    ): CreditLine | null => {
      if (allowance === null) return null;
      if (allowance === "unlimited")
        return { allowance: "unlimited", used, remaining: null };
      if (allowance <= 0) return null;
      return { allowance, used, remaining: Math.max(0, allowance - used) };
    };

    return {
      product,
      resetDate: reset.toISOString().slice(0, 10),
      classes: line(classAllow, classesUsed),
      pt: line(ptAllow, ptUsed),
    };
  } catch (e) {
    console.warn("getMyCredits", e);
    return null;
  }
};
