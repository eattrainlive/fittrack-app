// Supabase Edge Function: exercise-info  (PUBLIC - powers the machine QR-code pages)
// Deploy:   supabase functions deploy exercise-info --no-verify-jwt
//   (--no-verify-jwt is REQUIRED so people scanning a QR code without an account can load it.)
// Secrets:  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//   Optional: supabase secrets set COACH_USER_ID=<your admin user id>  (the account that owns the
//   master exercise library - so the public page always shows YOUR canonical version of an exercise).
//
// GET /exercise-info?id=<exercise-id>       ->  one  { id, name, muscle, equipment, difficulty, videoUrl, category }
// GET /exercise-info?ids=<id1,id2,id3,...>  ->  array [ {…}, {…} ]  (for machine pages that list many videos)
// Reads the per-user `exercises` table with the service role (bypassing RLS) and returns ONLY safe
// display fields - never user_id or anything private.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const params = new URL(req.url).searchParams;
    const idsParam = params.get("ids");
    const id = params.get("id");
    const ids = (idsParam ? idsParam.split(",") : id ? [id] : []).map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return json({ error: "Missing id or ids" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !KEY) return json({ error: "Server not configured" }, 500);
    const coach = Deno.env.get("COACH_USER_ID");

    // select * server-side (avoids camelCase column-name pitfalls), then return only safe fields.
    // NOTE: we filter is_deleted in code (not in the query) so a missing column can't 400 the request.
    const inList = ids.map((x) => encodeURIComponent(x)).join(",");
    let q = `${SUPABASE_URL}/rest/v1/exercises?id=in.(${inList})&select=*`;
    if (coach) q += `&user_id=eq.${encodeURIComponent(coach)}`;

    const r = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return json({ error: "Lookup failed", status: r.status, detail: detail.slice(0, 400) }, 502);
    }
    const rows = (await r.json()).filter((e: any) => !e.is_deleted);
    const safe = (ex: any) => ({
      id: ex.id,
      name: ex.name ?? "",
      muscle: ex.muscle ?? "",
      equipment: Array.isArray(ex.equipment) ? ex.equipment.join(", ") : (ex.equipment ?? ""),
      difficulty: ex.difficulty ?? "",
      category: Array.isArray(ex.category) ? ex.category.join(", ") : (ex.category ?? ""),
      videoUrl: ex.videoUrl ?? ex.video_url ?? "",
    });

    // Single-id request -> return one object (back-compat). ids request -> ordered array.
    if (idsParam) {
      const byId = new Map((Array.isArray(rows) ? rows : []).map((e: any) => [String(e.id), safe(e)]));
      return json(ids.map((x) => byId.get(String(x))).filter(Boolean));
    }
    const ex = Array.isArray(rows) ? rows[0] : null;
    if (!ex) return json({ error: "Exercise not found" }, 404);
    return json(safe(ex));
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
