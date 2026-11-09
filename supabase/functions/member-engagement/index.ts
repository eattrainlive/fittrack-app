// Supabase Edge Function: member-engagement
// Roster-wide RETENTION scoring for the Staff Hub. Scores EVERY active member /
// trialist on ATTENDANCE (gym scans + booked sessions) over a rolling window —
// works whether or not they're on the app, and includes people who were never
// invited or haven't joined yet. App usage is a SEPARATE badge, never part of
// the score (so a member who attends but isn't on the app still scores well).
//
// Score = attendance only. Bands over the window (default 14 days = 2 weeks):
//   >= 2 visits/wk  → thriving
//   >= 1 visit/wk   → steady
//   >= 1 visit      → slipping
//   0 visits        → at-risk
// App status: on_app | invited_not_joined | not_invited (a retention lever).
//
// Deploy: supabase functions deploy member-engagement (reuses STAFF_SECRET).
// Request (POST): { staffSecret, days?: 14 }
// Response: { window, summary:{thriving,steady,slipping,atRisk,total}, members:[worst-first] }

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
const dayMs = 86400000;
const dayKey = (v: any) => String(v || "").slice(0, 10);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const days = Math.max(7, Math.min(90, Number(body.days) || 14));
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const startTs = new Date(now - days * dayMs).toISOString();
    const weeks = days / 7;
    const thrivingAt = 2 * weeks; // >=2 visits/wk
    const steadyAt = 1 * weeks;   // >=1 visit/wk

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // ── Fetch everything once ────────────────────────────────────────────────
    const [rosterRes, appRes, linksRes] = await Promise.all([
      db.from("gym_members").select("id, email, full_name, product, status"),
      db.from("members").select("id, email, full_name, online_client"),
      db.from("member_links").select("user_id, member_id").then((r) => r).catch(() => ({ data: [] } as any)),
    ]);

    // Staff allowlist — never score coaches.
    const staffSet = new Set<string>();
    try { const { data } = await db.from("staff_users").select("user_id"); for (const s of data ?? []) staffSet.add(String(s.user_id)); } catch (_) {}

    // App account by normalised email (so we can attach app status/usage to a roster row).
    const appByEmail: Record<string, any> = {};
    for (const m of appRes.data ?? []) { const ne = normEmail(m.email); if (ne) appByEmail[ne] = m; }
    // member_links: roster member_id -> app user_id (the confirmed link, if any).
    const appIdByRosterId: Record<string, string> = {};
    for (const l of (linksRes as any).data ?? []) appIdByRosterId[String(l.member_id)] = String(l.user_id);

    // Last sign-in + existence from auth.users (drives app status).
    const authByEmail: Record<string, { exists: boolean; lastLogin: string | null }> = {};
    try {
      for (let page = 1; page <= 60; page++) {
        const { data: pg } = await db.auth.admin.listUsers({ page, perPage: 200 });
        const users = pg?.users ?? [];
        for (const u of users) { const em = normEmail(u.email); if (em) authByEmail[em] = { exists: true, lastLogin: u.last_sign_in_at ?? null }; }
        if (users.length < 200) break;
      }
    } catch (_) {}

    // Attendance — booked sessions (by email) + gym scans (by member_ref = gym_members.id),
    // collected as distinct ACTIVE DAYS so a class + a scan on the same day = 1 visit.
    const daysByEmail: Record<string, Set<string>> = {};
    const daysByRef: Record<string, Set<string>> = {};
    try {
      const { data } = await db.from("member_bookings").select("email, session_at, status").gte("session_at", startTs);
      for (const b of data ?? []) {
        if (b.status === "cancelled" || String(b.session_at) > nowIso) continue;
        const em = normEmail(b.email);
        if (!daysByEmail[em]) daysByEmail[em] = new Set();
        daysByEmail[em].add(dayKey(b.session_at));
      }
    } catch (_) {}
    try {
      const { data } = await db.from("scan_events").select("member_ref, ts, result").eq("result", "granted").gte("ts", startTs);
      for (const s of data ?? []) {
        if (String(s.ts) > nowIso) continue;
        const ref = String(s.member_ref);
        if (!daysByRef[ref]) daysByRef[ref] = new Set();
        daysByRef[ref].add(dayKey(s.ts));
      }
    } catch (_) {}

    // App usage (workouts logged) by app user_id — shown as a badge only.
    const workoutsByUser: Record<string, number> = {};
    try {
      const { data } = await db.from("workout_history").select("user_id, date").gte("date", startTs);
      for (const w of data ?? []) { const u = String(w.user_id); workoutsByUser[u] = (workoutsByUser[u] || 0) + 1; }
    } catch (_) {}

    // ── Score each ACTIVE roster member (one row per person) ──────────────────
    const seen = new Set<string>();
    const scored: any[] = [];
    for (const g of rosterRes.data ?? []) {
      const st = String(g.status ?? "").toLowerCase();
      if (st !== "active" && st !== "paused") continue; // live memberships + trials only
      const ne = normEmail(g.email);
      if (!ne || seen.has(ne)) continue;
      seen.add(ne);

      const app = appByEmail[ne];
      const appUserId = appIdByRosterId[String(g.id)] || (app ? String(app.id) : null);
      if (appUserId && staffSet.has(appUserId)) continue; // skip staff
      if (app?.online_client) continue;                   // online/remote clients don't attend the gym

      // Distinct active days across sessions + scans.
      const dset = new Set<string>();
      for (const d of daysByEmail[ne] ?? []) dset.add(d);
      for (const d of daysByRef[String(g.id)] ?? []) dset.add(d);
      const visits = dset.size;
      const lastVisit = [...dset].sort().pop() || null;
      const lastVisitDays = lastVisit ? Math.floor((now - new Date(lastVisit + "T00:00:00Z").getTime()) / dayMs) : null;

      const score = Math.round(Math.min(100, (visits / Math.max(1, thrivingAt)) * 100));
      const band =
        visits >= thrivingAt ? "thriving" :
        visits >= steadyAt ? "steady" :
        visits >= 1 ? "slipping" : "at-risk";

      // App status — the retention lever.
      const auth = authByEmail[ne];
      const appStatus = !auth?.exists
        ? "not_invited"
        : auth.lastLogin
          ? "on_app"
          : "invited_not_joined";
      const loginDays = auth?.lastLogin ? Math.floor((now - new Date(auth.lastLogin).getTime()) / dayMs) : null;
      const workouts = appUserId ? (workoutsByUser[appUserId] || 0) : 0;

      const flags: string[] = [];
      if (visits === 0) flags.push(`No visits in ${days}d`);
      else if (lastVisitDays != null && lastVisitDays >= 7) flags.push(`${lastVisitDays}d since last visit`);
      if (appStatus === "not_invited") flags.push("Not on the app");
      else if (appStatus === "invited_not_joined") flags.push("Invited — not joined");

      scored.push({
        member_ref: g.id,
        user_id: appUserId,
        email: g.email,
        full_name: g.full_name ?? app?.full_name ?? null,
        membership: g.product ?? null,
        membership_status: g.status ?? null,
        score,
        band,
        attendance: { visits, perWeek: Math.round((visits / weeks) * 10) / 10, lastVisitDays },
        app_status: appStatus,
        app: { on_app: appStatus === "on_app", workouts, lastLoginDays: loginDays },
        flags,
      });
    }
    scored.sort((a, b) => a.score - b.score); // worst first — retention board

    const summary = {
      total: scored.length,
      thriving: scored.filter((m) => m.band === "thriving").length,
      steady: scored.filter((m) => m.band === "steady").length,
      slipping: scored.filter((m) => m.band === "slipping").length,
      atRisk: scored.filter((m) => m.band === "at-risk").length,
      notOnApp: scored.filter((m) => m.app_status !== "on_app").length,
    };

    return json({ window: { days, start: startTs.slice(0, 10) }, summary, members: scored });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
