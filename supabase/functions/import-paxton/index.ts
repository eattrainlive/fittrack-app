// Supabase Edge Function: import-paxton
// Imports Net2 (Lite) 24hr-gym door events as gym-visit scan_events. Staff-only.
// The Net2 export has NO email/token — only "Surname, Firstname" — so members are matched by NAME.
//
// Deploy as "import-paxton". Reuses STAFF_SECRET.
// Request (POST): { staffSecret, rows: [{ user: "Surname, Firstname", ts: ISO }], site? }
//   (client parses the CSV, keeps only entry events, flips the date to ISO, sends rows)
// Response: { imported, matched, unmatched: [names], total }

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

// "Surname, Firstname" -> normalised sorted token key for matching (order-independent).
function nameKey(display: string): string {
  return String(display || "").toLowerCase().replace(/[^a-z]+/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}
// "Surname, Firstname" -> "Firstname Surname" for display.
function displayName(raw: string): string {
  const s = String(raw || "").trim();
  const m = s.split(",").map((x) => x.trim());
  return m.length === 2 ? `${m[1]} ${m[0]}` : s;
}
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
    const site = String(body.site || "unit_1b");
    if (!rows.length) return json({ error: "no rows" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // Build name -> member maps once (match by name only; no email/token in the Net2 export).
    const gmByName: Record<string, any> = {};
    const { data: gm } = await db.from("gym_members").select("id, full_name");
    for (const g of gm ?? []) { const k = nameKey(g.full_name); if (k) gmByName[k] = g; }
    const memByName: Record<string, any> = {};
    const { data: mem } = await db.from("members").select("id, full_name");
    for (const m of mem ?? []) { const k = nameKey(m.full_name); if (k) memByName[k] = m; }

    let imported = 0; const matchedSet = new Set<string>(); const unmatched = new Set<string>();
    for (const r of rows) {
      const raw = String(r.user || "").trim();
      const ts = String(r.ts || "").trim();
      if (!raw || !ts || isNaN(new Date(ts).getTime())) continue;
      const k = nameKey(raw);
      const g = gmByName[k]; const mrow = memByName[k];
      const disp = displayName(raw);
      if (g || mrow) matchedSet.add(disp); else unmatched.add(disp);

      const id = `paxton:${slug(k)}:${Math.floor(new Date(ts).getTime() / 1000)}`;   // idempotent per person+time
      const { error } = await db.from("scan_events").insert({
        id,
        member_ref: g?.id ?? null,
        user_id: mrow?.id ?? null,
        member_name: disp,
        ts,
        device_ts: ts,
        site,
        result: g ? "granted" : (mrow ? "no_membership" : "unknown_code"),
        raw_code: raw,
        device_id: "paxton-net2",
        method: "paxton",
        source: "paxton",
        checkin_for: "24 Hour Gym",
      });
      if (!error) imported++;   // duplicates hit the PK and are skipped (re-upload safe)
    }

    return json({ total: rows.length, imported, matched: matchedSet.size, unmatched: Array.from(unmatched).sort() });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
