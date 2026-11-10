// Supabase Edge Function: staff-pulse
// Read-only "pulse" for the Staff Hub Today screen: who's in the gym today,
// member milestones to celebrate (recent PBs, new joiners, attendance streaks),
// and upcoming membership anniversaries. Service role (reads across PBs, scans,
// joins). STAFF_SECRET guarded. No writes.
//
// POST { staffSecret } → { whosIn:[], milestones:[], anniversaries:[] }
// Deploy: supabase functions deploy staff-pulse

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

const dayMs = 86400000;
const dayKey = (v: any) => String(v || "").slice(0, 10);

async function pageAll(make: (f: number, t: number) => any): Promise<any[]> {
  const out: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await make(from, from + size - 1);
    if (error || !data || !data.length) break;
    out.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
    const now = Date.now();
    const todayKey = dayKey(new Date(now).toISOString());
    const startOfToday = new Date(todayKey + "T00:00:00Z").getTime();
    const weekAgo = new Date(now - 7 * dayMs).toISOString();

    // Roster (staff-readable; service role anyway): names, products, join dates.
    const { data: roster } = await db
      .from("gym_members")
      .select("id, email, full_name, product, status, joined_on");
    const byRef: Record<string, any> = {};
    const byEmail: Record<string, any> = {};
    for (const g of roster ?? []) {
      byRef[String(g.id)] = g;
      if (g.email) byEmail[String(g.email).toLowerCase()] = g;
    }
    // App profiles (auth id → name) for PB attribution.
    const { data: appMembers } = await db.from("members").select("id, email, full_name");
    const nameByUser: Record<string, string> = {};
    const emailByUser: Record<string, string> = {};
    for (const m of appMembers ?? []) {
      if (m.full_name) nameByUser[String(m.id)] = m.full_name;
      if (m.email) emailByUser[String(m.id)] = String(m.email).toLowerCase();
    }

    // ── Who's in today (granted scans since midnight) ──────────────────────
    const scansToday = await pageAll((f, t) =>
      db.from("scan_events").select("member_ref, ts, result").eq("result", "granted").gte("ts", new Date(startOfToday).toISOString()).order("ts").range(f, t));
    const firstScan: Record<string, string> = {};
    for (const s of scansToday ?? []) {
      const ref = String(s.member_ref);
      if (!firstScan[ref]) firstScan[ref] = s.ts;
    }
    const whosIn = Object.entries(firstScan)
      .map(([ref, ts]) => {
        const g = byRef[ref];
        return g ? { name: g.full_name || g.email, membership: g.product || null, at: ts } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.at < b.at ? 1 : -1)); // most recent first

    // ── Attendance over the last 7 days (for streak milestones) ────────────
    const scansWeek = await pageAll((f, t) =>
      db.from("scan_events").select("member_ref, ts, result").eq("result", "granted").gte("ts", weekAgo).order("ts").range(f, t));
    const daysByRef: Record<string, Set<string>> = {};
    for (const s of scansWeek ?? []) {
      const ref = String(s.member_ref);
      (daysByRef[ref] ??= new Set()).add(dayKey(s.ts));
    }

    const milestones: any[] = [];

    // Recent PBs (last 7 days).
    const prs = await pageAll((f, t) =>
      db.from("personal_records").select("user_id, exercise, weight, date").gte("date", weekAgo.slice(0, 10)).order("date", { ascending: false }).range(f, t));
    for (const p of (prs ?? []).slice(0, 40)) {
      const nm = nameByUser[String(p.user_id)];
      if (!nm) continue;
      milestones.push({
        type: "pb",
        name: nm,
        detail: `New PB — ${p.exercise} ${p.weight}kg`,
        at: p.date,
      });
    }

    // New joiners (joined in the last 7 days).
    for (const g of roster ?? []) {
      if (!g.joined_on) continue;
      const jt = new Date(String(g.joined_on).slice(0, 10) + "T00:00:00Z").getTime();
      if (jt >= now - 7 * dayMs && jt <= now) {
        milestones.push({ type: "join", name: g.full_name || g.email, detail: `Joined on ${g.product || "a membership"}`, at: String(g.joined_on).slice(0, 10) });
      }
    }

    // Attendance streaks (4+ distinct days in the last 7).
    for (const [ref, set] of Object.entries(daysByRef)) {
      if (set.size >= 4) {
        const g = byRef[ref];
        if (g) milestones.push({ type: "streak", name: g.full_name || g.email, detail: `In ${set.size}× this week 🔥`, at: todayKey });
      }
    }

    // ── Upcoming membership anniversaries (next 7 days, 1+ full years) ──────
    const anniversaries: any[] = [];
    for (const g of roster ?? []) {
      if (!g.joined_on || String(g.status).toLowerCase() !== "active") continue;
      const j = new Date(String(g.joined_on).slice(0, 10) + "T00:00:00Z");
      if (isNaN(j.getTime())) continue;
      const thisYear = new Date(now).getUTCFullYear();
      let next = new Date(Date.UTC(thisYear, j.getUTCMonth(), j.getUTCDate()));
      if (next.getTime() < startOfToday) next = new Date(Date.UTC(thisYear + 1, j.getUTCMonth(), j.getUTCDate()));
      const days = Math.round((next.getTime() - startOfToday) / dayMs);
      const years = next.getUTCFullYear() - j.getUTCFullYear();
      if (days >= 0 && days <= 7 && years >= 1) {
        anniversaries.push({ name: g.full_name || g.email, years, date: dayKey(next.toISOString()), inDays: days });
      }
    }
    anniversaries.sort((a, b) => a.inDays - b.inDays);

    return json({ whosIn, milestones: milestones.slice(0, 40), anniversaries });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
