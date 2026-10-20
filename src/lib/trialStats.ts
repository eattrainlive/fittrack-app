/**
 * Trial conversion dashboard stats for the consolidated Trials hub.
 *
 * Split out of trialNurture.ts (which is at capacity). Reads trial_cohort +
 * member_bookings + scan_events to compute conversion rates, a funnel, and
 * average time-to-first-session for trials that DECIDED in the last
 * `periodDays`. Self-contained — the dashboard just renders the numbers.
 */
import { supabase } from "./supabase";

export type TrialType = "coached30" | "kickstart21";

const MS_DAY = 86400000;

function dayNum(iso: string | null): number {
  if (!iso) return 0;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 0;
    return Math.floor(
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / MS_DAY,
    );
  } catch {
    return 0;
  }
}

function todayDayNum(): number {
  return dayNum(new Date().toISOString());
}

function trialType(trialProduct: string | null | undefined): TrialType {
  const s = String(trialProduct || "").toLowerCase();
  if (/kick|21/.test(s)) return "kickstart21";
  return "coached30";
}

function trialLengthDays(t: TrialType): number {
  return t === "kickstart21" ? 21 : 30;
}

export interface TrialTypeStat {
  rate: number; // 0..1
  converted: number;
  completed: number;
}
export interface TrialStats {
  periodDays: number;
  activeNow: number;
  activeByType: Record<TrialType, number>;
  overall: TrialTypeStat;
  byType: Record<TrialType, TrialTypeStat>;
  prevRate: number; // conversion rate for the previous equal window (for a delta)
  funnel: {
    started: number;
    attended1st: number;
    attended3plus: number;
    reviewBooked: number;
    converted: number;
  };
  avgDaysToFirstSession: number | null;
}

/**
 * Conversion stats for trials that DECIDED (ended or converted) in the last
 * `periodDays`. Attendance = past bookings + kiosk scans (same signal the
 * board uses).
 */
export async function getTrialStats(periodDays = 30): Promise<TrialStats> {
  const emptyType = (): TrialTypeStat => ({
    rate: 0,
    converted: 0,
    completed: 0,
  });
  const empty: TrialStats = {
    periodDays,
    activeNow: 0,
    activeByType: { coached30: 0, kickstart21: 0 },
    overall: emptyType(),
    byType: { coached30: emptyType(), kickstart21: emptyType() },
    prevRate: 0,
    funnel: {
      started: 0,
      attended1st: 0,
      attended3plus: 0,
      reviewBooked: 0,
      converted: 0,
    },
    avgDaysToFirstSession: null,
  };
  try {
    const { data: cohort } = await supabase
      .from("trial_cohort")
      .select("email, trial_start, trial_product, converted")
      .not("trial_start", "is", null);
    const rows = (cohort as any[]) ?? [];
    if (!rows.length) return empty;
    const emails = rows.map((r) => r.email);

    const [{ data: bookings }, { data: gmRows }] = await Promise.all([
      supabase
        .from("member_bookings")
        .select("email, session_at, status, session_type")
        .in("email", emails),
      supabase.from("gym_members").select("id, email").in("email", emails),
    ]);
    const refToEmail = new Map<string, string>();
    const refs: string[] = [];
    for (const m of (gmRows as any[]) ?? [])
      if (m?.id && m?.email) {
        refToEmail.set(String(m.id), String(m.email).toLowerCase());
        refs.push(String(m.id));
      }
    const [{ data: scans }, { data: reviewRows }] = await Promise.all([
      refs.length
        ? supabase.from("scan_events").select("member_ref, ts").in("member_ref", refs)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("review_bookings")
        .select("email, status, appointment_at")
        .in("email", emails),
    ]);

    const now = Date.now();
    const actBy = new Map<string, number[]>(); // email → activity day-numbers
    const reviewBy = new Set<string>();
    const pushAct = (em: string, ms: number) => {
      if (isNaN(ms) || ms > now) return;
      const d = Math.floor(ms / MS_DAY);
      (actBy.get(em) ?? actBy.set(em, []).get(em)!).push(d);
    };
    // Review bookings come from the synced review_bookings table (GHL calendar),
    // not member_bookings.
    for (const r of (reviewRows as any[]) ?? []) {
      const st = String(r?.status ?? "").toLowerCase().trim();
      const live =
        (st === "booked" || st === "completed") &&
        (!r?.appointment_at || new Date(r.appointment_at).getTime() >= now);
      if (live && r?.email) reviewBy.add(String(r.email).toLowerCase());
    }
    for (const b of (bookings as any[]) ?? []) {
      const em = String(b.email).toLowerCase();
      if (b.status !== "cancelled" && b.session_at)
        pushAct(em, new Date(b.session_at).getTime());
    }
    for (const s of (scans as any[]) ?? []) {
      const em = refToEmail.get(String(s?.member_ref));
      if (em && s?.ts) pushAct(em, new Date(s.ts).getTime());
    }

    const today = todayDayNum();
    const f = {
      started: 0,
      attended1st: 0,
      attended3plus: 0,
      reviewBooked: 0,
      converted: 0,
    };
    let ttfsSum = 0;
    let ttfsN = 0;
    let prevConv = 0;
    let prevDone = 0;

    for (const r of rows) {
      const em = String(r.email).toLowerCase();
      const tType = trialType(r.trial_product);
      const startNum = dayNum(r.trial_start);
      const len = trialLengthDays(tType);
      const endNum = startNum + len - 1;
      const converted = !!r.converted;
      const acts = (actBy.get(em) ?? []).slice().sort((a, b) => a - b);

      // active now
      if (!converted && today >= startNum && today <= endNum) {
        empty.activeNow++;
        empty.activeByType[tType]++;
      }

      // decision day: converted → now-ish; else trial end.
      const completed = converted || today >= endNum;
      if (!completed) continue;
      const decisionDay = converted ? Math.min(endNum, today) : endNum;
      const ago = today - decisionDay;

      if (ago >= periodDays && ago < periodDays * 2) {
        prevDone++;
        if (converted) prevConv++;
        continue;
      }
      if (ago < 0 || ago >= periodDays) continue;

      // in current period
      empty.byType[tType].completed++;
      empty.overall.completed++;
      if (converted) {
        empty.byType[tType].converted++;
        empty.overall.converted++;
      }

      // funnel
      f.started++;
      const attended = acts.length;
      const attendedWk1 = acts.filter((d) => d - startNum < 7).length;
      if (attended >= 1) f.attended1st++;
      if (attendedWk1 >= 3) f.attended3plus++;
      if (reviewBy.has(em)) f.reviewBooked++;
      if (converted) f.converted++;
      if (attended >= 1) {
        ttfsSum += acts[0] - startNum + 1;
        ttfsN++;
      }
    }

    const rate = (s: TrialTypeStat) =>
      s.completed ? s.converted / s.completed : 0;
    empty.overall.rate = rate(empty.overall);
    empty.byType.coached30.rate = rate(empty.byType.coached30);
    empty.byType.kickstart21.rate = rate(empty.byType.kickstart21);
    empty.prevRate = prevDone ? prevConv / prevDone : 0;
    empty.funnel = f;
    empty.avgDaysToFirstSession = ttfsN
      ? Math.round((ttfsSum / ttfsN) * 10) / 10
      : null;
    return empty;
  } catch (e) {
    console.warn("[trialStats] getTrialStats:", e);
    return empty;
  }
}
