import { supabase } from "./supabase";
import { getMyGymMember } from "./store";

export interface AttendanceDay {
  date: string; // YYYY-MM-DD
  gymVisit: boolean;
  pt: boolean;
  classBooking: boolean;
  session: boolean;
}

/**
 * Attendance days for the last `weeks` weeks (ending today), for the heat strip.
 * A day is "active" if it has a granted gym scan (not on a booking day), a PT
 * booking, a class booking, or a logged workout session. Each day carries the
 * kind(s) of activity so the strip can colour-code intensity.
 */
export const getAttendanceDays = async (
  weeks = 12,
): Promise<AttendanceDay[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const member = await getMyGymMember();
  const gymMemberId = member?.id ?? null;

  const days: Map<string, AttendanceDay> = new Map();
  const today = new Date();
  const start = new Date(today.getTime() - (weeks * 7 - 1) * 86400000);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = today.toISOString().slice(0, 10);

  // Seed every day in the range so the strip shows gaps too.
  for (let t = start.getTime(); t <= today.getTime(); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    days.set(d, {
      date: d,
      gymVisit: false,
      pt: false,
      classBooking: false,
      session: false,
    });
  }

  const isCoached = (st: string) =>
    /semi\s*private\s*pt/i.test(String(st || ""));

  // Bookings (PT + classes) by email.
  try {
    const email = user.email;
    if (email) {
      const { data: bookings } = await supabase
        .from("member_bookings")
        .select("session_type,session_at")
        .ilike("email", email.toLowerCase())
        .neq("status", "cancelled");
      const bookingDays = new Set<string>();
      for (const b of bookings || []) {
        const d = (b.session_at || "").slice(0, 10);
        if (!d || d < startStr || d > endStr) continue;
        bookingDays.add(d);
        const day = days.get(d);
        if (!day) continue;
        if (isCoached(b.session_type)) day.pt = true;
        else day.classBooking = true;
      }
      // Gym scans (granted, not on a booking day).
      if (gymMemberId) {
        const { data: scans } = await supabase
          .from("scan_events")
          .select("ts,created_at,result")
          .eq("member_ref", gymMemberId);
        for (const s of scans || []) {
          if (String(s.result || "").toLowerCase() !== "granted") continue;
          const d = (s.ts || s.created_at || "").slice(0, 10);
          if (!d || d < startStr || d > endStr) continue;
          if (bookingDays.has(d)) continue;
          const day = days.get(d);
          if (day) day.gymVisit = true;
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Logged workout sessions by user_id.
  try {
    const { data: history } = await supabase
      .from("workout_history")
      .select("date,type")
      .eq("user_id", user.id);
    for (const h of history || []) {
      const d = (h.date || "").slice(0, 10);
      if (!d || d < startStr || d > endStr) continue;
      if (String(h.type || "").toLowerCase() === "activity") continue;
      const day = days.get(d);
      if (day) day.session = true;
    }
  } catch {
    /* ignore */
  }

  return Array.from(days.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
};

/**
 * Month-to-date + rolling-30-day detail figures for the member progress hub.
 * Runs the same queries as getProgressSummary but over two specific windows
 * so the hub can show a headline (MTD) with a smaller sub-line (last 30 days).
 */
export interface MemberProgressDetail {
  sessionsMTD: number;
  sessions30: number;
  volumeMTD: number;
  volume30: number;
  ptMTD: number;
  pt30: number;
  classesMTD: number;
  classes30: number;
  gymVisitsMTD: number;
  gymVisits30: number;
}

const mtdStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const rollingStart = () =>
  new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);

export const getMemberProgressDetail =
  async (): Promise<MemberProgressDetail> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        sessionsMTD: 0,
        sessions30: 0,
        volumeMTD: 0,
        volume30: 0,
        ptMTD: 0,
        pt30: 0,
        classesMTD: 0,
        classes30: 0,
        gymVisitsMTD: 0,
        gymVisits30: 0,
      };
    }

    const member = await getMyGymMember();
    const gymMemberId = member?.id ?? null;

    const mtd = mtdStart();
    const r30 = rollingStart();
    const today = todayStr();

    const detail: MemberProgressDetail = {
      sessionsMTD: 0,
      sessions30: 0,
      volumeMTD: 0,
      volume30: 0,
      ptMTD: 0,
      pt30: 0,
      classesMTD: 0,
      classes30: 0,
      gymVisitsMTD: 0,
      gymVisits30: 0,
    };

    // ── Training (workout_history) ────────────────────────────────────────────
    try {
      const { data: history } = await supabase
        .from("workout_history")
        .select("date,volume,type")
        .eq("user_id", user.id);
      for (const h of history || []) {
        const d = (h.date || "").slice(0, 10);
        if (!d) continue;
        const isActivity = String(h.type || "").toLowerCase() === "activity";
        if (isActivity) continue; // sessions only (strength), not ad-lib cardio
        const vol = Number(h.volume || 0);
        if (d >= mtd && d <= today) {
          detail.sessionsMTD++;
          detail.volumeMTD += vol;
        }
        if (d >= r30 && d <= today) {
          detail.sessions30++;
          detail.volume30 += vol;
        }
      }
    } catch {
      // ignore
    }

    // ── Attendance (member_bookings + scan_events) ────────────────────────────
    // PT (semi-private) and classes come from member_bookings; gym visits come
    // from scan_events. A "gym visit" = a GRANTED scan day with NO booking that
    // day, so a booked class/PT that's also scanned counts once (as the class/
    // PT), not as both.
    const isCoached = (st: string) =>
      /semi\s*private\s*pt/i.test(String(st || ""));

    const bookingDays = new Set<string>();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email) {
        const { data: bookings } = await supabase
          .from("member_bookings")
          .select("email,status,session_type,session_at")
          .ilike("email", email.toLowerCase())
          .neq("status", "cancelled");
        for (const b of bookings || []) {
          const d = (b.session_at || "").slice(0, 10);
          if (!d) continue;
          bookingDays.add(d);
          if (isCoached(b.session_type)) {
            if (d >= mtd && d <= today) detail.ptMTD++;
            if (d >= r30 && d <= today) detail.pt30++;
          } else {
            if (d >= mtd && d <= today) detail.classesMTD++;
            if (d >= r30 && d <= today) detail.classes30++;
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      // scan_events uses member_ref (gym_members.id, RLS-allowed) + ts/created_at.
      // Only "granted" entry scans count, and only on days with no booking.
      const { data: scans } = await supabase
        .from("scan_events")
        .select("ts,created_at,result")
        .eq("member_ref", gymMemberId ?? "__none__");
      for (const s of scans || []) {
        if (String(s.result || "").toLowerCase() !== "granted") continue;
        const d = (s.ts || s.created_at || "").slice(0, 10);
        if (!d) continue;
        if (bookingDays.has(d)) continue; // booked that day → not a gym visit
        if (d >= mtd && d <= today) detail.gymVisitsMTD++;
        if (d >= r30 && d <= today) detail.gymVisits30++;
      }
    } catch {
      // scan_events may not exist yet — soft-fail to zero
    }

    return detail;
  };
