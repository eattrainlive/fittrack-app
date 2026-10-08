// Supabase Edge Function: usage-report
// Staff-only app-usage report for a date window. Returns totals, name lists AND per-member detail
// (so each dashboard card can drill into a table of names + relevant info).
// Deploy as "usage-report". Secret: STAFF_SECRET (project-wide; same one other staff fns use).
//
// Request (POST): { staffSecret, start: "YYYY-MM-DD", end: "YYYY-MM-DD" }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function normEmail(e: any): string {
  const s = String(e ?? "").trim().toLowerCase(); const at = s.indexOf("@"); if (at < 0) return s;
  let l = s.slice(0, at), d = s.slice(at + 1); l = l.split("+")[0];
  if (d === "googlemail.com") d = "gmail.com"; if (d === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${d}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);
    const start = String(body.start || "").slice(0, 10);
    const end = String(body.end || "").slice(0, 10);
    if (!start || !end) return json({ error: "start and end (YYYY-MM-DD) required" }, 400);
    const sTs = `${start}T00:00:00Z`, eTs = `${end}T23:59:59Z`;
    const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: members } = await db.from("members").select("id, email, full_name");
    const nameById: Record<string, string> = {}, nameByEmail: Record<string, string> = {};
    for (const m of members ?? []) {
      const nm = m.full_name || m.email || "Member";
      nameById[String(m.id)] = nm;
      const ne = normEmail(m.email); if (ne) nameByEmail[ne] = nm;
    }
    const nm = (uid: any) => nameById[String(uid)] || "Unknown";
    const nmE = (em: any) => nameByEmail[normEmail(em)] || em || "Unknown";

    const out: any = { window: { start, end }, generated_at: new Date().toISOString() };
    const activeUsers = new Set<string>();

    // ── Workouts by member (with per-programme counts) ───────────────────────────
    try {
      const { data } = await db.from("workout_history").select("user_id, data, date").gte("date", sTs).lte("date", eTs);
      const rows = data ?? [];
      const perUser: Record<string, { total: number; byProg: Record<string, number> }> = {};
      const progTotals: Record<string, { sessions: number; members: Set<string> }> = {};
      for (const w of rows) {
        const uid = String(w.user_id); activeUsers.add(uid);
        const d = w.data || {};
        const prog = String(d.stream || d.category || d.programme || d.programType || d.program || "Other").trim() || "Other";
        const pu = perUser[uid] || (perUser[uid] = { total: 0, byProg: {} });
        pu.total++; pu.byProg[prog] = (pu.byProg[prog] || 0) + 1;
        const pt = progTotals[prog] || (progTotals[prog] = { sessions: 0, members: new Set() });
        pt.sessions++; pt.members.add(uid);
      }
      out.workouts = {
        totalSessions: rows.length,
        totalMembers: Object.keys(perUser).length,
        byProgramme: Object.keys(progTotals).sort().map((p) => ({ programme: p, sessions: progTotals[p].sessions, members: progTotals[p].members.size })),
        detail: Object.keys(perUser).map((uid) => ({
          name: nm(uid), total: perUser[uid].total,
          byProgramme: perUser[uid].byProg,
          breakdown: Object.entries(perUser[uid].byProg).map(([p, n]) => `${p}: ${n}`).join(", "),
        })).sort((a, b) => b.total - a.total),
      };
    } catch (e) { out._workoutsError = (e as Error).message; }

    // ── Habits (check-ins per member) ────────────────────────────────────────────
    try {
      const { data } = await db.from("habit_checkins").select("member_id, date").gte("date", start).lte("date", end);
      const per: Record<string, number> = {};
      for (const r of data ?? []) { const u = String(r.member_id); per[u] = (per[u] || 0) + 1; activeUsers.add(u); }
      out.habits = {
        totalCheckins: (data ?? []).length, members: Object.keys(per).length,
        detail: Object.keys(per).map((u) => ({ name: nm(u), checkins: per[u] })).sort((a, b) => b.checkins - a.checkins),
      };
    } catch (e) { out._habitsError = (e as Error).message; }

    // ── Nutrition (entries per member) ───────────────────────────────────────────
    try {
      const per: Record<string, number> = {};
      const add = (rows: any[]) => { for (const r of rows ?? []) { const u = String(r.member_id); per[u] = (per[u] || 0) + 1; activeUsers.add(u); } };
      add((await db.from("food_diary").select("member_id, date").gte("date", start).lte("date", end)).data);
      add((await db.from("macro_logs").select("member_id, date").gte("date", start).lte("date", end)).data);
      out.nutrition = {
        entries: Object.values(per).reduce((a, b) => a + b, 0), members: Object.keys(per).length,
        detail: Object.keys(per).map((u) => ({ name: nm(u), entries: per[u] })).sort((a, b) => b.entries - a.entries),
      };
    } catch (e) { out._nutritionError = (e as Error).message; }

    // ── Community (posts / comments / reactions per member) ──────────────────────
    try {
      const per: Record<string, { posts: number; comments: number; reactions: number }> = {};
      const g = (u: string) => per[u] || (per[u] = { posts: 0, comments: 0, reactions: 0 });
      for (const r of (await db.from("community_posts").select("author_id, created_at").gte("created_at", sTs).lte("created_at", eTs)).data ?? []) { const u = String(r.author_id); g(u).posts++; activeUsers.add(u); }
      for (const r of (await db.from("community_comments").select("author_id, created_at").gte("created_at", sTs).lte("created_at", eTs)).data ?? []) { const u = String(r.author_id); g(u).comments++; activeUsers.add(u); }
      for (const r of (await db.from("community_reactions").select("user_id, created_at").gte("created_at", sTs).lte("created_at", eTs)).data ?? []) { const u = String(r.user_id); g(u).reactions++; activeUsers.add(u); }
      const vals = Object.values(per);
      out.community = {
        posts: vals.reduce((a, b) => a + b.posts, 0), comments: vals.reduce((a, b) => a + b.comments, 0), reactions: vals.reduce((a, b) => a + b.reactions, 0),
        members: Object.keys(per).length,
        detail: Object.keys(per).map((u) => ({ name: nm(u), ...per[u] })).sort((a, b) => (b.posts + b.comments + b.reactions) - (a.posts + a.comments + a.reactions)),
      };
    } catch (e) { out._communityError = (e as Error).message; }

    // ── Leaderboards (scores per member) ─────────────────────────────────────────
    try {
      const { data } = await db.from("block_scores").select("user_id, leaderboard_title, created_at").gte("created_at", sTs).lte("created_at", eTs);
      const per: Record<string, number> = {};
      for (const r of data ?? []) { const u = String(r.user_id); per[u] = (per[u] || 0) + 1; activeUsers.add(u); }
      out.leaderboards = {
        scores: (data ?? []).length, members: Object.keys(per).length,
        detail: Object.keys(per).map((u) => ({ name: nm(u), scores: per[u] })).sort((a, b) => b.scores - a.scores),
      };
    } catch (e) { out._leaderboardsError = (e as Error).message; }

    // ── PBs (records per member) ─────────────────────────────────────────────────
    try {
      const { data } = await db.from("personal_records").select("user_id, date").gte("date", start).lte("date", end);
      const per: Record<string, number> = {};
      for (const r of data ?? []) { const u = String(r.user_id); per[u] = (per[u] || 0) + 1; activeUsers.add(u); }
      out.pbs = {
        records: (data ?? []).length, members: Object.keys(per).length,
        detail: Object.keys(per).map((u) => ({ name: nm(u), records: per[u] })).sort((a, b) => b.records - a.records),
      };
    } catch (e) { out._pbsError = (e as Error).message; }

    // ── Attendance (per member: PT / classes / gym visits) ───────────────────────
    try {
      const per: Record<string, { pt: number; classes: number; gym: number }> = {};
      const g = (k: string) => per[k] || (per[k] = { pt: 0, classes: 0, gym: 0 });
      for (const r of (await db.from("member_bookings").select("email, session_type, status, session_at").gte("session_at", sTs).lte("session_at", eTs)).data ?? []) {
        if (r.status === "cancelled") continue;
        const name = nmE(r.email);
        if (/semi private pt/i.test(String(r.session_type || ""))) g(name).pt++; else g(name).classes++;
      }
      const { data: gmRows } = await db.from("gym_members").select("id, full_name, email");
      const gmName: Record<string, string> = {}; for (const gmr of gmRows ?? []) gmName[String(gmr.id)] = gmr.full_name || gmr.email || "Member";
      const seen = new Set<string>();
      for (const r of (await db.from("scan_events").select("member_ref, ts").gte("ts", sTs).lte("ts", eTs)).data ?? []) {
        if (!r.member_ref) continue;
        const key = `${r.member_ref}|${String(r.ts).slice(0, 10)}`; if (seen.has(key)) continue; seen.add(key);
        g(gmName[String(r.member_ref)] || "Member").gym++;
      }
      const vals = Object.values(per);
      out.attendance = {
        ptSessions: vals.reduce((a, b) => a + b.pt, 0), classes: vals.reduce((a, b) => a + b.classes, 0), gymVisits: vals.reduce((a, b) => a + b.gym, 0),
        members: Object.keys(per).length,
        detail: Object.keys(per).map((n) => ({ name: n, ...per[n] })).sort((a, b) => (b.pt + b.classes + b.gym) - (a.pt + a.classes + a.gym)),
      };
    } catch (e) { out._attendanceError = (e as Error).message; }

    // ── Feature views (per member per feature) ───────────────────────────────────
    try {
      const { data } = await db.from("app_events").select("user_id, feature, created_at").eq("event", "feature_view").gte("created_at", sTs).lte("created_at", eTs);
      const byFeat: Record<string, { views: number; perUser: Record<string, number> }> = {};
      for (const r of data ?? []) {
        const f = String(r.feature || "unknown"); const u = String(r.user_id); activeUsers.add(u);
        const bf = byFeat[f] || (byFeat[f] = { views: 0, perUser: {} });
        bf.views++; bf.perUser[u] = (bf.perUser[u] || 0) + 1;
      }
      out.featureViews = Object.keys(byFeat).sort().map((f) => ({
        feature: f, views: byFeat[f].views, members: Object.keys(byFeat[f].perUser).length,
        detail: Object.keys(byFeat[f].perUser).map((u) => ({ name: nm(u), views: byFeat[f].perUser[u] })).sort((a, b) => b.views - a.views),
      }));
    } catch (e) { out._featureViewsError = (e as Error).message; }

    // ── App adoption (+ list of who's NOT on app, for chasing) ───────────────────
    try {
      const activatedEmail: Record<string, boolean> = {};
      for (let page = 1; page <= 50; page++) {
        const { data: pg } = await db.auth.admin.listUsers({ page, perPage: 200 });
        const users = pg?.users ?? [];
        for (const u of users) { const em = normEmail(u.email); if (em) activatedEmail[em] = !!u.last_sign_in_at; }
        if (users.length < 200) break;
      }
      const { data: roster } = await db.from("gym_members").select("full_name, email");
      let onApp = 0; const notOnApp: { name: string; email: string }[] = [];
      for (const gmr of roster ?? []) {
        if (activatedEmail[normEmail(gmr.email)]) onApp++;
        else notOnApp.push({ name: gmr.full_name || gmr.email || "Member", email: gmr.email });
      }
      out.adoption = { rosterTotal: (roster ?? []).length, onApp, notOnApp: notOnApp.length, notOnAppList: notOnApp.sort((a, b) => a.name.localeCompare(b.name)) };
    } catch (e) { out._adoptionError = (e as Error).message; }

    out.activeMembers = { count: activeUsers.size, detail: Array.from(activeUsers).map((u) => ({ name: nm(u) })).sort((a, b) => a.name.localeCompare(b.name)) };
    return json(out, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
