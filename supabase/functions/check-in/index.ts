// Supabase Edge Function: check-in
// iPad reception kiosk → resolve a member (scanned QR or manual pick) and log a scan_event.
// Reuses the link/normalised-email resolver so it works even when app email ≠ Quoox email.
//
// Deploy: create function "check-in", paste this in. Reuses STAFF_SECRET (same as manage-members).
//
// Request (POST): { staffSecret, code?, manualUserId?, method?, site?, deviceId? }
//   code         = the scanned QR payload = the member's app user id (auth uid)
//   manualUserId = chosen member's user id (manual check-in path)
//   method       = "scan" | "manual"   (default "scan")
//   site         = "main" | "unit_1b"  (default "main")
// Response: { ok, result, name, membership, membership_status, paymentFailed, member_ref }
//   result: "granted" (active member) | "denied_lapsed" (found but not active) | "unknown_code"

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const method = body.method === "manual" ? "manual" : "scan";
    const site = String(body.site || "main");
    const rawCode = String(body.code ?? body.manualUserId ?? "").trim();
    const userId = String(body.manualUserId ?? body.code ?? "").trim();

    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

    // Resolve the app user → their gym_members roster row (link first, else normalised email).
    let name: string | null = null, email: string | null = null;
    let memberRef: string | null = null, membership: string | null = null, status: string | null = null;
    let appMemberFound = false;   // true = this code IS a known app user (even if no membership on file)

    if (userId) {
      const { data: m } = await db.from("members").select("id, email, full_name").eq("id", userId).maybeSingle();
      if (m) {
        appMemberFound = true;
        name = m.full_name ?? null; email = m.email ?? null;
        // link?
        const { data: link } = await db.from("member_links").select("member_id").eq("user_id", userId).maybeSingle();
        let g: any = null;
        if (link?.member_id) {
          const r = await db.from("gym_members").select("id, product, status").eq("id", link.member_id).maybeSingle();
          g = r.data;
        }
        if (!g && email) {
          // normalised-email match
          const { data: all } = await db.from("gym_members").select("id, email, product, status");
          g = (all ?? []).find((x: any) => normEmail(x.email) === normEmail(email)) ?? null;
        }
        if (g) { memberRef = g.id; membership = g.product ?? null; status = g.status ?? null; }
      }
    }

    // Payment health — failures live in payment_events (they don't change gym_members.status).
    // Flag if the member's MOST RECENT payment event was a failure.
    let paymentFailed = false;
    if (memberRef) {
      const { data: pe } = await db.from("payment_events")
        .select("result, event_ts").eq("member_ref", memberRef)
        .order("event_ts", { ascending: false }).limit(1);
      paymentFailed = (pe ?? [])[0]?.result === "failed";
    }

    // What did they check in FOR? If they've a booked session around now (PT / class), attach it;
    // otherwise it's an open-gym visit. (Paxton 24hr-gym entries will come in with source="paxton".)
    let checkinFor = "Open gym";
    let bookingAt: string | null = null;
    if (email) {
      const nowMs2 = Date.now();
      const winStart = new Date(nowMs2 - 45 * 60000).toISOString();   // arrived up to 45m early
      const winEnd = new Date(nowMs2 + 90 * 60000).toISOString();     // session starts within 90m
      const { data: bk } = await db.from("member_bookings")
        .select("session_type, session_at, status")
        .eq("email", email).neq("status", "cancelled")
        .gte("session_at", winStart).lte("session_at", winEnd);
      if (bk && bk.length) {
        let best = bk[0], bestDiff = Infinity;
        for (const b of bk) {
          const d = Math.abs(new Date(b.session_at).getTime() - nowMs2);
          if (d < bestDiff) { bestDiff = d; best = b; }
        }
        checkinFor = best.session_type || "Booked session";
        bookingAt = best.session_at;
      }
    }

    // Result: granted/denied for a matched membership; "no_membership" for a KNOWN app user with
    // no roster row (show their name so staff can follow up); "unknown_code" only for a truly
    // unrecognised code.
    const result = memberRef
      ? (String(status || "").toLowerCase() === "active" ? "granted" : "denied_lapsed")
      : (appMemberFound ? "no_membership" : "unknown_code");

    // Log the scan (idempotent id; server-authoritative ts). Store the name + user id so the recent
    // list and reports can show WHO checked in even when there's no gym_members row to join to.
    const nowIso = new Date().toISOString();
    await db.from("scan_events").insert({
      id: crypto.randomUUID(),
      member_ref: memberRef,
      user_id: userId || null,
      member_name: name,
      ts: nowIso,
      device_ts: body.deviceTs ?? nowIso,
      site,
      result,
      raw_code: method === "manual" ? `manual:${rawCode}` : rawCode,
      device_id: body.deviceId ?? "reception-tablet",
      checkin_for: checkinFor,
      booking_at: bookingAt,
      source: body.source ?? "kiosk",   // paxton bridge passes source:"paxton" for 24hr-gym entries
    });

    return json({ ok: true, result, name, membership, membership_status: status, paymentFailed, appMemberFound, checkinFor, bookingAt, member_ref: memberRef, method });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
