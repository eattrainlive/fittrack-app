// Supabase Edge Function: error-recent
// Returns recent rows from error_log (service role), for a scheduled "any errors overnight?" digest.
// Deploy:  supabase functions deploy error-recent   (reuses the existing STAFF_SECRET)
// Call:    GET https://<project>.supabase.co/functions/v1/error-recent?key=<STAFF_SECRET>&hours=24

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";

serve(async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  if (!STAFF_SECRET || key !== STAFF_SECRET) return new Response("forbidden", { status: 403 });

  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get("hours") ?? "24")));
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await db
    .from("error_log")
    .select("occurred_at, user_email, action, table_name, code, message")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  // Summarise by (table, code) so the digest is short.
  const counts: Record<string, number> = {};
  for (const r of data ?? []) {
    const k = `${r.table_name ?? "?"} · ${r.code ?? "?"}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  return new Response(JSON.stringify({ hours, total: (data ?? []).length, counts, recent: data ?? [] }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
