import { supabase } from "./supabase";
import { getMyGymMember } from "./store";
import { getTrialGoals } from "./trialGoals";

// ── Progress summary engine (trial pack + general monthly recap) ────────────
// Window-driven + parameterised so the same engine drives trial summaries,
// monthly recaps and retention flags for ALL member types, not just trialists.
// `memberType: "trial"` leads on coached PT; an open-gym member would lead on
// visits/classes/PBs (the caller can swap the hero stat later).

export const REVIEW_BOOKING_URL =
  "https://api.leadconnectorhq.com/widget/bookings/trial-reviews";

const COACHED_TRIAL_PT_ALLOWANCE = 12;

export type MemberType = "trial" | "openGym" | "coached" | "default";

export interface ProgressSummary {
  firstName: string;
  memberType: MemberType;
  start: string;
  end: string;
  dayCount: number;
  totalDays: number;
  // hero — coached PT
  coachedUsed: number;
  coachedTotal: number;
  coachedUpcoming: number;
  // other activity
  classesCount: number;
  // training volume + sessions
  totalVolumeKg: number;
  loggedSessions: number;
  // strength
  prs: { exercise: string; start: number; now: number; gain: number }[];
  // body
  weightStart?: number;
  weightNow?: number;
  weightDelta?: number;
  measurements?: {
    metric: string;
    start: number;
    now: number;
    delta: number;
  }[];
  // photos
  beforePhoto?: string;
  afterPhoto?: string;
  photos?: {
    url: string;
    created_at?: string | null;
    is_baseline?: boolean;
    phase?: string | null;
  }[];
  // review call booking (mirrored from the calendar webhook by email)
  reviewBooked?: boolean;
  reviewStatus?: string | null;
  reviewAt?: string | null;
  // habits + nutrition
  bestStreak: number;
  habitsBuilt: number;
  totalCheckins: number;
  daysLogged: number;
  // trial goals (from trial_goals) — present when captured
  goals?: {
    startWeight?: number | null;
    stepTarget?: number | null;
    sessionsPerWeek?: number | null;
    calorieTarget?: number | null;
    habitIds?: (number | null)[];
    capturedAt?: string | null;
  };
  sessionsPerWeekActual: number;
}

const longestStreak = (dates: string[]): number => {
  if (!dates.length) return 0;
  const days = Array.from(
    new Set(
      dates.filter(Boolean).map((d) => new Date(d).toISOString().split("T")[0]),
    ),
  ).sort();
  if (!days.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff =
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
};

export const getProgressSummary = async (opts: {
  email?: string | null;
  userId?: string;
  start?: string;
  end?: string;
  memberType?: MemberType;
  // Staff mode: when the coach opens another member's review, pass the roster
  // row (product/joined_on/full_name/email) so we don't fall back to
  // getMyGymMember(), which would return the *coach's* own record.
  memberRow?: {
    email?: string | null;
    full_name?: string | null;
    joined_on?: string | null;
    product?: string | null;
  } | null;
}): Promise<ProgressSummary | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const userId = opts.userId || user.id;

  // Prefer the explicitly-passed roster row (staff mode), then the member's own
  // gym_members row, so the window/name are correct for the *viewed* member.
  const member = opts.memberRow ? opts.memberRow : await getMyGymMember();
  const email = opts.email || user.email || member?.email || null;
  const firstName =
    (member?.full_name || "").split(" ")[0] ||
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  // Window: default to the 30-day trial window from the gym_members row
  const joined = opts.memberRow?.joined_on || member?.joined_on;
  let start = opts.start;
  let end = opts.end;
  if (joined) {
    const s = new Date(joined);
    const e30 = new Date(s.getTime() + 30 * 24 * 60 * 60 * 1000);
    start = start || s.toISOString();
    end = end || new Date(Math.min(e30.getTime(), Date.now())).toISOString();
  }
  if (!start) start = new Date(Date.now() - 30 * 86400000).toISOString();
  if (!end) end = new Date().toISOString();

  const totalDays = 30;
  const dayCount = Math.min(
    totalDays,
    Math.max(
      0,
      Math.round(
        (Math.min(new Date(end).getTime(), Date.now()) -
          new Date(start).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1,
    ),
  );

  const startDay = new Date(start).toISOString().split("T")[0];
  const endDay = new Date(end).toISOString().split("T")[0];
  const inWindow = (d?: string | null) =>
    !!d && d.slice(0, 10) >= startDay && d.slice(0, 10) <= endDay;

  // ── Coached PT + other activity (member_bookings, keyed by email) ─────────
  let coachedUsed = 0;
  let coachedUpcoming = 0;
  let classesCount = 0;
  if (email) {
    try {
      const { data: bookings } = await supabase
        .from("member_bookings")
        .select("email,status,session_type,session_at")
        .ilike("email", email.toLowerCase())
        .neq("status", "cancelled");
      const nowIso = new Date().toISOString();
      for (const b of bookings || []) {
        const at = b.session_at;
        if (!at) continue;
        if (!inWindow(at.slice(0, 10))) continue;
        const isCoached = /semi\s*private\s*pt/i.test(
          (b.session_type || "").toString(),
        );
        if (isCoached) {
          if (at <= nowIso) coachedUsed++;
          else coachedUpcoming++;
        } else {
          classesCount++;
        }
      }
    } catch {
      // member_bookings may not exist yet — soft-fail to zero
    }
  }

  // ── Training volume + sessions (workout_history, keyed by user_id) ────────
  let totalVolumeKg = 0;
  let loggedSessions = 0;
  let workoutRows: { date?: string; volume?: number }[] = [];
  try {
    const { data: history } = await supabase
      .from("workout_history")
      .select("date,volume")
      .eq("user_id", userId);
    workoutRows = history || [];
    for (const h of workoutRows) {
      const d = (h.date || "").slice(0, 10);
      if (!inWindow(d)) continue;
      loggedSessions++;
      totalVolumeKg += Number(h.volume || 0);
    }
  } catch {
    // ignore
  }

  // ── PBs (personal_records) ───────────────────────────────────────────────
  const prs: ProgressSummary["prs"] = [];
  try {
    const { data: prRows } = await supabase
      .from("personal_records")
      .select("exercise,weight,date")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    const byEx = new Map<
      string,
      { start: number; now: number; startSeen: boolean }
    >();
    for (const r of prRows || []) {
      const ex = String(r.exercise || "").trim();
      if (!ex) continue;
      const w = Number(r.weight || 0);
      const d = (r.date || "").slice(0, 10);
      const cur = byEx.get(ex);
      if (!cur) {
        byEx.set(ex, { start: w, now: w, startSeen: false });
      } else {
        cur.now = Math.max(cur.now, w);
      }
      if (inWindow(d) && !cur?.startSeen) {
        if (cur) {
          cur.start = w;
          cur.startSeen = true;
        }
      }
    }
    for (const [exercise, v] of byEx) {
      if (v.now <= 0) continue;
      const gain = +(v.now - v.start).toFixed(1);
      if (gain > 0) prs.push({ exercise, start: v.start, now: v.now, gain });
    }
    prs.sort((a, b) => b.gain - a.gain);
  } catch {
    // ignore
  }
  const topPrs = prs.slice(0, 3);

  // ── Bodyweight (bodyweight_history) ──────────────────────────────────────
  let weightStart: number | undefined;
  let weightNow: number | undefined;
  let weightDelta: number | undefined;
  try {
    const { data: bw } = await supabase
      .from("bodyweight_history")
      .select("date,weight")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    const inBw = (bw || [])
      .filter((b) => inWindow((b.date || "").slice(0, 10)))
      .map((b) => ({ date: b.date, weight: Number(b.weight || 0) }))
      .filter((b) => b.weight > 0);
    if (inBw.length >= 2) {
      weightStart = inBw[0].weight;
      weightNow = inBw[inBw.length - 1].weight;
      weightDelta = +(weightNow - weightStart).toFixed(1);
    }
  } catch {
    // ignore
  }

  // ── Measurements (member_measurements) ───────────────────────────────────
  let measurements: ProgressSummary["measurements"] | undefined;
  try {
    const { data: meas } = await supabase
      .from("member_measurements")
      .select("*")
      .eq("member_id", userId);
    const byMetric = new Map<string, { start: number; now: number }>();
    for (const m of meas || []) {
      const d = (m.date || "").slice(0, 10);
      if (!inWindow(d)) continue;
      for (const key of ["waist", "chest", "hips", "arm", "thigh", "weight"]) {
        const v = Number(m[key] || 0);
        if (v <= 0) continue;
        const cur = byMetric.get(key);
        if (!cur) byMetric.set(key, { start: v, now: v });
        else cur.now = v;
      }
    }
    const deltas: ProgressSummary["measurements"] = [];
    for (const [metric, v] of byMetric) {
      const delta = +(v.now - v.start).toFixed(1);
      if (delta !== 0)
        deltas.push({ metric, start: v.start, now: v.now, delta });
    }
    if (deltas.length) measurements = deltas;
  } catch {
    // ignore
  }

  // ── Photos (member_photos) — baseline + latest + full strip ───────────────
  let beforePhoto: string | undefined;
  let afterPhoto: string | undefined;
  let photoStrip: ProgressSummary["photos"] = [];
  try {
    const { data: photos } = await supabase
      .from("member_photos")
      .select("*")
      .eq("member_id", userId)
      .order("date", { ascending: true });
    const inPhotos = (photos || []).filter((p) =>
      inWindow((p.date || "").slice(0, 10)),
    );
    if (inPhotos.length) {
      beforePhoto =
        inPhotos.find((p) => p.is_baseline || p.phase === "before")?.url ||
        inPhotos[0].url;
      afterPhoto = inPhotos[inPhotos.length - 1].url;
      if (beforePhoto === afterPhoto) afterPhoto = undefined;
      // Full strip, newest-first. created_at may be absent — fall back to date.
      photoStrip = inPhotos
        .slice()
        .reverse()
        .map((p) => ({
          url: p.url,
          created_at: p.created_at || p.date || null,
          is_baseline: !!p.is_baseline,
          phase: p.phase || null,
        }));
    }
  } catch {
    // ignore
  }

  // ── Habits (habit_checkins) ──────────────────────────────────────────────
  let bestStreak = 0;
  let habitsBuilt = 0;
  let totalCheckins = 0;
  try {
    const { data: checkins } = await supabase
      .from("habit_checkins")
      .select("date,habit_id")
      .eq("member_id", userId);
    const inWin = (checkins || []).filter((c) =>
      inWindow((c.date || "").slice(0, 10)),
    );
    totalCheckins = inWin.length;
    if (inWin.length) {
      bestStreak = longestStreak(inWin.map((c) => c.date));
      const perHabit = new Map<string, number>();
      for (const c of inWin)
        perHabit.set(c.habit_id, (perHabit.get(c.habit_id) || 0) + 1);
      habitsBuilt = Array.from(perHabit.values()).filter((n) => n >= 5).length;
    }
  } catch {
    // ignore
  }

  // ── Nutrition (food_diary + macro_logs) — distinct days logged ────────────
  let daysLogged = 0;
  try {
    const [fd, ml] = await Promise.all([
      supabase
        .from("food_diary")
        .select("date")
        .eq("member_id", userId)
        .gte("date", startDay)
        .lte("date", endDay),
      supabase
        .from("macro_logs")
        .select("date")
        .eq("member_id", userId)
        .gte("date", startDay)
        .lte("date", endDay),
    ]);
    const days = new Set<string>();
    for (const r of fd.data || [])
      if (r.date) days.add(String(r.date).slice(0, 10));
    for (const r of ml.data || [])
      if (r.date) days.add(String(r.date).slice(0, 10));
    daysLogged = days.size;
  } catch {
    // ignore
  }

  // ── Review call booking (review_bookings, keyed by email) ───────────────
  let reviewBooked: boolean | undefined;
  let reviewStatus: string | null | undefined;
  let reviewAt: string | null | undefined;
  if (email) {
    try {
      const { data: rb } = await supabase
        .from("review_bookings")
        .select("email,appointment_at,status")
        .ilike("email", email.toLowerCase())
        .maybeSingle();
      if (rb) {
        reviewStatus =
          String(rb.status || "")
            .toLowerCase()
            .trim() || null;
        reviewAt = rb.appointment_at ?? null;
        // "booked" or "completed" counts as booked; "cancelled"/"no_show" resets.
        reviewBooked =
          reviewStatus === "booked" || reviewStatus === "completed";
      }
    } catch {
      // review_bookings may not exist yet — soft-fail (no booking data)
    }
  }

  // ── Trial goals (trial_goals) + sessions-per-week actual ─────────────────
  let goals: ProgressSummary["goals"];
  let sessionsPerWeekActual = 0;
  try {
    const g = await getTrialGoals();
    if (g) {
      goals = {
        startWeight: g.start_weight,
        stepTarget: g.step_target,
        sessionsPerWeek: g.sessions_per_week,
        calorieTarget: g.calorie_target,
        habitIds: [g.habit_1, g.habit_2, g.habit_3],
        capturedAt: g.captured_at,
      };
    }
  } catch {
    // ignore
  }
  // Sessions-per-week actual: count distinct weeks with a coached session or logged workout in window.
  try {
    const sessionDates: string[] = [];
    if (email) {
      const { data: bk } = await supabase
        .from("member_bookings")
        .select("session_at")
        .ilike("email", email.toLowerCase())
        .neq("status", "cancelled");
      for (const b of bk || [])
        if (b.session_at && inWindow(b.session_at.slice(0, 10)))
          sessionDates.push(b.session_at.slice(0, 10));
    }
    for (const h of workoutRows)
      if (inWindow((h.date || "").slice(0, 10)))
        sessionDates.push((h.date || "").slice(0, 10));
    const weeks = new Set<string>();
    for (const d of sessionDates) {
      const dt = new Date(d);
      const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
      weeks.add(
        `${dt.getFullYear()}-${dt.getMonth()}-${Math.floor(
          (dt.getDate() + first.getDay()) / 7,
        )}`,
      );
    }
    if (sessionDates.length) sessionsPerWeekActual = weeks.size;
  } catch {
    // ignore
  }

  return {
    firstName,
    memberType: opts.memberType || "default",
    start,
    end,
    dayCount,
    totalDays,
    coachedUsed,
    coachedTotal: COACHED_TRIAL_PT_ALLOWANCE,
    coachedUpcoming,
    classesCount,
    totalVolumeKg: Math.round(totalVolumeKg),
    loggedSessions,
    prs: topPrs,
    weightStart,
    weightNow,
    weightDelta,
    measurements,
    beforePhoto,
    afterPhoto,
    photos: photoStrip,
    bestStreak,
    habitsBuilt,
    totalCheckins,
    daysLogged,
    goals,
    sessionsPerWeekActual,
    reviewBooked,
    reviewStatus,
    reviewAt,
  };
};

export const getTrialSummary = () =>
  getProgressSummary({ memberType: "trial" });

export const isTrialEligible = (product?: string | null) => {
  const p = String(product || "")
    .toLowerCase()
    .trim();
  return p === "30 day trial" || p === "forever strong 30 day trial";
};
