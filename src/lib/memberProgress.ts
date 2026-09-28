import { supabase } from "./supabase";
import { getMyGymMember } from "./store";

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
