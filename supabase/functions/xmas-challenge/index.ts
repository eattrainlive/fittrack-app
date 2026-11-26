// Supabase Edge Function: xmas-challenge
// 12 active days between 1–24 Dec. A day counts if the member has a GRANTED gym/24hr scan OR a
// non-cancelled class/PT booking that day (one per day). Hit the target → in the hoodie raffle.
//
// Member mode (member's own JWT): returns THEIR progress. Staff mode ({ staffSecret }): returns
// the leaderboard; { staffSecret, action:"draw" } picks a random winner from qualifiers.
// Deploy: supabase functions deploy xmas-challenge  (reuses STAFF_SECRET)

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
const norm = (e: any) => String(e ?? "").trim().toLowerCase();
const dayKey = (ts: string) => new Date(ts).toISOString().slice(0, 10); // UTC day

async function pageAll(q: (from: number) => Promise<{ data: any[] | null }>): Promise<any[]> {
  const out: any[] = [];
  for (let f = 0; ; f += 1000) { const { data } = await q(f); out.push(...(data || [])); if (!data || data.length < 1000) break; }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json().catch(() => ({}));

    // Config
    const { data: cfgRow } = await db.from("feature_settings").select("value").eq("key", "xmas_challenge").maybeSingle();
    const cfg = (cfgRow?.value ?? {}) as any;
    const enabled = cfg.enabled !== false;
    const start = cfg.start || "2026-12-01";
    const end = cfg.end || "2026-12-24";
    const target = Number(cfg.target) || 12;
    const title = cfg.title || "12 Days of Christmas";
    const prize = cfg.prize || "free hoodie";
    const startTs = `${start}T00:00:00Z`;
    const endTs = `${end}T23:59:59Z`;

    const isStaff = body.staffSecret && STAFF_SECRET && body.staffSecret === STAFF_SECRET;

    // ── Pull all qualifying activity in the window, keyed to email + member_ref ──────────────
    const scans = await pageAll((f) => db.from("scan_events")
      .select("member_ref, ts").eq("result", "granted").gte("ts", startTs).lte("ts", endTs).range(f, f + 999));
    const bookings = await pageAll((f) => db.from("member_bookings")
      .select("email, session_at, status").neq("status", "cancelled").gte("session_at", startTs).lte("session_at", endTs).range(f, f + 999));
    // Map member_ref → email, and roster for names.
    const roster = await pageAll((f) => db.from("gym_members").select("id, email, full_name").range(f, f + 999));
    const emailByRef = new Map<string, string>();
    const nameByEmail = new Map<string, string>();
    for (const r of roster) { const e = norm(r.email); if (r.id) emailByRef.set(String(r.id), e); if (e && r.full_name) nameByEmail.set(e, r.full_name); }

    // distinct active days per email
    const daysByEmail = new Map<string, Set<string>>();
    const add = (email: string, d: string) => { if (!email) return; (daysByEmail.get(email) ?? daysByEmail.set(email, new Set()).get(email)!).add(d); };
    for (const s of scans) { const e = emailByRef.get(String(s.member_ref)) || ""; if (e) add(e, dayKey(s.ts)); }
    for (const b of bookings) { if (b.session_at) add(norm(b.email), dayKey(b.session_at)); }

    if (isStaff) {
      const board = [...daysByEmail.entries()].map(([email, days]) => ({
        email, name: nameByEmail.get(email) || email, count: days.size, qualified: days.size >= target,
      })).sort((a, b) => b.count - a.count);
      const qualifiers = board.filter((m) => m.qualified);

      if (body.action === "draw") {
        if (!qualifiers.length) return json({ error: "No one has qualified yet." }, 400);
        const w = qualifiers[Math.floor(Math.random() * qualifiers.length)];
        const { data: saved, error } = await db.from("xmas_raffle")
          .insert({ winner_email: w.email, winner_name: w.name, entrants: qualifiers.length, drawn_by: body.by ?? null })
          .select().maybeSingle();
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, winner: saved });
      }

      const { data: lastDraw } = await db.from("xmas_raffle").select("*").order("drawn_at", { ascending: false }).limit(1);
      return json({ mode: "staff", enabled, title, prize, target, start, end,
        total: board.length, qualified: qualifiers.length, board, lastDraw: lastDraw?.[0] ?? null });
    }

    // ── Member mode — resolve the signed-in user's email from their JWT ──────────────────────
    const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: userData } = await db.auth.getUser(auth);
    const email = norm(userData?.user?.email);
    if (!email) return json({ mode: "member", enabled, error: "not signed in" }, 200);

    const days = [...(daysByEmail.get(email) ?? new Set<string>())].sort();
    const { data: lastDraw } = await db.from("xmas_raffle").select("winner_name, drawn_at").order("drawn_at", { ascending: false }).limit(1);
    return json({
      mode: "member", enabled, title, prize, target, start, end,
      count: days.length, days, qualified: days.length >= target,
      winnerAnnounced: lastDraw?.[0]?.winner_name ?? null,
    });
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});
