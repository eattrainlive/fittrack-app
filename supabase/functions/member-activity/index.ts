// Supabase Edge Function: member-activity
// Powers the member activity card + staff 3-month breakdown, in ONE call.
// Windows returned:
//   pt          — allowance usage on the member's OWN cycle (join/membership-start day each month)
//   monthToDate — classes / gym visits / sessions logged, calendar 1st → today
//   rolling30   — same three, last 30 days (context line under month-to-date)
//   months[]    — last 3 calendar months, per-metric (PT/classes/gym/sessions) for the staff trend
//
// Deploy as "member-activity". Reuses STAFF_SECRET. Staff-only (staffSecret in body).
// Request: { staffSecret, memberUserId, memberEmail }

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
  const at = s.indexOf("@"); if (at < 0) return s;
  let local = s.slice(0, at), dom = s.slice(at + 1);
  local = local.split("+")[0];
  if (dom === "googlemail.com") dom = "gmail.com";
  if (dom === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${dom}`;
}
const day = (v: any) => String(v || "").slice(0, 10);
const isCoached = (t: any) => /semi private pt/i.test(String(t || ""));
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// Parse the PT allowance from the product name: "Pt- 10" / "PT-15" → 10 / 15. Null if not a PT product.
function allowanceFromProduct(product: any): number | null {
  const p = String(product || "");
  if (!/pt/i.test(p)) return null;
  const m = p.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

// The member's current allowance cycle start (join-day anchored), clamped for short months.
function cycleStart(joinedOn: string, now: Date): Date | null {
  const j = new Date(joinedOn + "T00:00:00Z");
  if (isNaN(j.getTime())) return null;
  const anchorDay = j.getUTCDate();
  let y = now.getUTCFullYear(), m = now.getUTCMonth();
  let start = new Date(Date.UTC(y, m, Math.min(anchorDay, daysInMonth(y, m))));
  if (start.getTime() > now.getTime()) {            // anchor day not reached yet this month → previous month
    m -= 1; if (m < 0) { m = 11; y -= 1; }
    start = new Date(Date.UTC(y, m, Math.min(anchorDay, daysInMonth(y, m))));
  }
  return start;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const userId = body.memberUserId ? String(body.memberUserId) : null;
    const email = body.memberEmail ? String(body.memberEmail).trim().toLowerCase() : null;
    if (!userId && !email) return json({ error: "member required" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // Resolve roster row: link first, else normalised email.
    let g: any = null;
    if (userId) {
      const { data: link } = await db.from("member_links").select("member_id").eq("user_id", userId).maybeSingle();
      if (link?.member_id) g = (await db.from("gym_members").select("id, email, product, status, joined_on").eq("id", link.member_id).maybeSingle()).data;
    }
    if (!g && email) {
      const { data: all } = await db.from("gym_members").select("id, email, product, status, joined_on");
      g = (all ?? []).find((x: any) => normEmail(x.email) === normEmail(email)) ?? null;
    }
    const memberRef = g?.id ?? null;

    const now = new Date();
    const nowMs = now.getTime();
    const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1)).toISOString();

    // Fetch each source once over the widest window, bucket in memory.
    const bookings = email
      ? ((await db.from("member_bookings").select("session_type, session_at, status").eq("email", email).gte("session_at", threeMonthsAgo)).data ?? [])
          .filter((b: any) => b.status !== "cancelled" && b.session_at <= now.toISOString())
      : [];
    const scans = memberRef
      ? ((await db.from("scan_events").select("ts, result").eq("member_ref", memberRef).eq("result", "granted").gte("ts", threeMonthsAgo)).data ?? [])
      : [];
    const workouts = userId
      ? ((await db.from("workout_history").select("date").eq("user_id", userId).gte("date", threeMonthsAgo)).data ?? [])
      : [];

    const inRange = (t: string, startMs: number) => { const x = new Date(t).getTime(); return x >= startMs && x <= nowMs; };
    const countWindow = (startMs: number) => ({
      classes: bookings.filter((b: any) => !isCoached(b.session_type) && inRange(b.session_at, startMs)).length,
      coachedPt: bookings.filter((b: any) => isCoached(b.session_type) && inRange(b.session_at, startMs)).length,
      gymVisits: new Set(scans.filter((s: any) => inRange(s.ts, startMs)).map((s: any) => day(s.ts))).size,
      sessionsLogged: workouts.filter((w: any) => inRange(w.date, startMs)).length,
    });

    // ── PT allowance (own cycle) ──
    const allowance = allowanceFromProduct(g?.product);
    let pt: any = { used: 0, allowance, cycleStart: null, resetDate: null };
    if (g?.joined_on) {
      const cs = cycleStart(String(g.joined_on).slice(0, 10), now);
      if (cs) {
        const reset = new Date(Date.UTC(cs.getUTCFullYear(), cs.getUTCMonth() + 1, cs.getUTCDate()));
        pt = {
          used: bookings.filter((b: any) => isCoached(b.session_type) && new Date(b.session_at).getTime() >= cs.getTime() && new Date(b.session_at).getTime() <= nowMs).length,
          allowance, cycleStart: cs.toISOString().slice(0, 10), resetDate: reset.toISOString().slice(0, 10),
        };
      }
    }

    // ── Month-to-date + rolling 30 ──
    const monthStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const rolling30Ms = nowMs - 30 * 86400000;
    const mtd = countWindow(monthStartMs);
    const r30 = countWindow(rolling30Ms);

    // ── Last 3 calendar months (oldest → newest; current month is partial) ──
    const months: any[] = [];
    for (let i = 2; i >= 0; i--) {
      const y = now.getUTCFullYear(), m0 = now.getUTCMonth() - i;
      const y2 = y + Math.floor(m0 / 12), m = ((m0 % 12) + 12) % 12;
      const s = Date.UTC(y2, m, 1);
      const eMs = Math.min(Date.UTC(y2, m + 1, 1) - 1, nowMs);
      const between = (t: string) => { const x = new Date(t).getTime(); return x >= s && x <= eMs; };
      months.push({
        label: new Date(Date.UTC(y2, m, 1)).toLocaleString("en-GB", { month: "short" }),
        ym: `${y2}-${String(m + 1).padStart(2, "0")}`,
        pt: bookings.filter((b: any) => isCoached(b.session_type) && between(b.session_at)).length,
        classes: bookings.filter((b: any) => !isCoached(b.session_type) && between(b.session_at)).length,
        gymVisits: new Set(scans.filter((sc: any) => between(sc.ts)).map((sc: any) => day(sc.ts))).size,
        sessionsLogged: workouts.filter((w: any) => between(w.date)).length,
      });
    }

    return json({
      member: { name: null, email: g?.email ?? email, membership: g?.product ?? null, membership_status: g?.status ?? null },
      pt,
      monthToDate: { classes: mtd.classes, gymVisits: mtd.gymVisits, sessionsLogged: mtd.sessionsLogged },
      rolling30: { classes: r30.classes, gymVisits: r30.gymVisits, sessionsLogged: r30.sessionsLogged },
      months,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
