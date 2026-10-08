// Supabase Edge Function: member-engagement
// Roster-wide engagement scoring for the Staff Hub retention board.
// Blended score per member over a rolling window (default 14 days):
//     attendance 50%  +  app activity 30%  +  habits 20%
// Bands:  >=80 thriving · 50-79 slipping · <50 at-risk.
//
// Deploy:
//   supabase functions deploy member-engagement          (JWT verification can stay ON)
//   Reuses STAFF_SECRET (same one manage-members / progress-summary use).
//
// Request (POST): { staffSecret, days?: 14 }
// Response: { window, summary:{thriving,slipping,atRisk,total}, members:[ ...sorted worst-first ] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: any, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function normEmail(e: any): string {
  const s = String(e ?? "").trim().toLowerCase();
  const at = s.indexOf("@");
  if (at < 0) return s;
  let local = s.slice(0, at), dom = s.slice(at + 1);
  local = local.split("+")[0];
  if (dom === "googlemail.com") dom = "gmail.com";
  if (dom === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${dom}`;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const dayMs = 86400000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const days = Math.max(7, Math.min(90, Number(body.days) || 14));
    const now = Date.now();
    const startTs = new Date(now - days * dayMs).toISOString();
    const weeks = days / 7;

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // ── Fetch everything once, group in memory ───────────────────────────────
    const [membersRes, goalsRes, rosterRes, linksRes] = await Promise.all([
      db.from("members").select("id, email, full_name, allowed_access, online_client"),
      db.from("member_goals").select("member_id, sessions_per_week, primary_goal, goal_text"),
      db.from("gym_members").select("id, email, product, status"),
      db.from("member_links").select("user_id, member_id").then((r) => r).catch(() => ({ data: [] } as any)),
    ]);
    const members = membersRes.data ?? [];

    // Staff allowlist — exclude coaches from the member board.
    const staffSet = new Set<string>();
    try { const { data } = await db.from("staff_users").select("user_id"); for (const s of data ?? []) staffSet.add(String(s.user_id)); } catch (_) {}

    // Membership label (link first, else normalised email).
    const rosterById: Record<string, any> = {}, rosterByNorm: Record<string, any> = {};
    for (const g of rosterRes.data ?? []) { rosterById[String(g.id)] = g; const ne = normEmail(g.email); if (ne) rosterByNorm[ne] = g; }
    const linkByUser: Record<string, string> = {};
    for (const l of (linksRes as any).data ?? []) linkByUser[String(l.user_id)] = String(l.member_id);

    // Goals (target sessions/week) by member.
    const goalByUser: Record<string, any> = {};
    for (const g of goalsRes.data ?? []) goalByUser[String(g.member_id)] = g;

    // Last sign-in from auth.users.
    const lastLoginByEmail: Record<string, string | null> = {};
    try {
      for (let page = 1; page <= 50; page++) {
        const { data: pg } = await db.auth.admin.listUsers({ page, perPage: 200 });
        const users = pg?.users ?? [];
        for (const u of users) { const em = String(u.email ?? "").toLowerCase(); if (em) lastLoginByEmail[em] = u.last_sign_in_at ?? null; }
        if (users.length < 200) break;
      }
    } catch (_) {}

    // Attendance (member_bookings by email, in window, not cancelled, already happened).
    const bookingsByEmail: Record<string, number> = {};
    const lastSessionByEmail: Record<string, string> = {};
    try {
      const { data } = await db.from("member_bookings").select("email, session_at, status").gte("session_at", startTs);
      const iso = new Date(now).toISOString();
      for (const b of data ?? []) {
        if (b.status === "cancelled" || String(b.session_at) > iso) continue;
        const em = String(b.email ?? "").toLowerCase();
        bookingsByEmail[em] = (bookingsByEmail[em] || 0) + 1;
        if (!lastSessionByEmail[em] || String(b.session_at) > lastSessionByEmail[em]) lastSessionByEmail[em] = String(b.session_at);
      }
    } catch (_) {}

    // Workouts logged (by user_id, in window).
    const workoutsByUser: Record<string, number> = {};
    try {
      const { data } = await db.from("workout_history").select("user_id, date").gte("date", startTs);
      for (const w of data ?? []) { const u = String(w.user_id); workoutsByUser[u] = (workoutsByUser[u] || 0) + 1; }
    } catch (_) {}

    // Habit check-ins (by member_id, in window).
    const habitsByUser: Record<string, number> = {};
    try {
      const { data } = await db.from("habit_checkins").select("member_id, date").gte("date", startTs.slice(0, 10));
      for (const h of data ?? []) { const u = String(h.member_id); habitsByUser[u] = (habitsByUser[u] || 0) + 1; }
    } catch (_) {}

    // ── Score each member ────────────────────────────────────────────────────
    const scored = members
      .filter((m: any) => !staffSet.has(String(m.id)))
      .filter((m: any) => !m.online_client)   // online/remote clients don't attend the gym — exclude from attendance at-risk
      .map((m: any) => {
        const uid = String(m.id);
        const em = String(m.email ?? "").toLowerCase();
        const g = linkByUser[uid] ? rosterById[linkByUser[uid]] : rosterByNorm[normEmail(m.email)];

        const target = Math.max(1, (goalByUser[uid]?.sessions_per_week || 2)) * weeks; // expected sessions in window

        // Attendance (0.5)
        const attended = bookingsByEmail[em] || 0;
        const attPct = clamp01(attended / target);

        // App activity (0.3) = workouts vs target (half) + login recency (half)
        const workouts = workoutsByUser[uid] || 0;
        const workoutsPct = clamp01(workouts / target);
        const lastLogin = lastLoginByEmail[em];
        const loginDays = lastLogin ? Math.floor((now - new Date(lastLogin).getTime()) / dayMs) : null;
        const recency = loginDays == null ? 0 : loginDays <= 3 ? 1 : loginDays <= 7 ? 0.6 : loginDays <= 14 ? 0.3 : 0;
        const appPct = workoutsPct * 0.5 + recency * 0.5;

        // Habits (0.2) — ~every-other-day check-in counts as full.
        const checkins = habitsByUser[uid] || 0;
        const habitPct = clamp01(checkins / (days * 0.5));

        const score = Math.round(100 * (0.5 * attPct + 0.3 * appPct + 0.2 * habitPct));
        const band = score >= 80 ? "thriving" : score >= 50 ? "slipping" : "at-risk";

        const lastSes = lastSessionByEmail[em];
        const lastSessionDays = lastSes ? Math.floor((now - new Date(lastSes).getTime()) / dayMs) : null;

        const flags: string[] = [];
        if (lastSessionDays == null || lastSessionDays > days) flags.push(`No sessions in ${days}d`);
        else if (lastSessionDays >= 7) flags.push(`${lastSessionDays}d since last session`);
        if (loginDays == null) flags.push("Never signed in");
        else if (loginDays >= 10) flags.push(`Not logged in ${loginDays}d`);
        if (attended < target * 0.5) flags.push("Below session target");

        return {
          user_id: uid, email: m.email, full_name: m.full_name ?? null,
          membership: g?.product ?? null, membership_status: g?.status ?? null,
          score, band,
          attendance: { attended, target: Math.round(target * 10) / 10, pct: Math.round(attPct * 100) },
          app: { workouts, lastLoginDays: loginDays, pct: Math.round(appPct * 100) },
          habits: { checkins, pct: Math.round(habitPct * 100) },
          lastSessionDays,
          primary_goal: goalByUser[uid]?.primary_goal ?? null,
          goal_text: goalByUser[uid]?.goal_text ?? null,
          flags,
        };
      })
      .sort((a: any, b: any) => a.score - b.score); // worst first — at-risk board

    const summary = {
      total: scored.length,
      thriving: scored.filter((m: any) => m.band === "thriving").length,
      slipping: scored.filter((m: any) => m.band === "slipping").length,
      atRisk: scored.filter((m: any) => m.band === "at-risk").length,
    };

    return json({ window: { days, start: startTs.slice(0, 10) }, summary, members: scored });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
