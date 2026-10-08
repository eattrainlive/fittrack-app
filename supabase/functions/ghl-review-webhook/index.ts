// Supabase Edge Function: ghl-review-webhook
// Receives a webhook from GHL when a trial REVIEW appointment is booked / cancelled, and mirrors
// it into review_bookings so the app can show "review booked" on the Members tab / coach view.
//
// Deploy (PUBLIC — GHL sends no Supabase JWT):
//   supabase functions deploy ghl-review-webhook --no-verify-jwt
//   (optional) supabase secrets set GHL_WEBHOOK_SECRET=your-long-random-string
// Endpoint for the GHL workflow webhook action:
//   https://<project>.supabase.co/functions/v1/ghl-review-webhook?key=YOUR_SECRET
//
// Configure the GHL workflow "Webhook" action to POST JSON with (map from the contact/appointment):
//   { "email": "{{contact.email}}", "appointment_at": "{{appointment.start_time}}", "status": "booked" }
// Add a second action on cancel/reschedule with "status":"cancelled" (or "completed"/"no_show").

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("GHL_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  if (req.method === "GET") return new Response("ghl-review-webhook alive", { status: 200 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("x-webhook-secret") ?? "";
  if (SECRET && key !== SECRET) return new Response("forbidden", { status: 403 });

  const rawText = await req.text();
  let body: any = null;
  try { body = JSON.parse(rawText); } catch { /* keep raw */ }
  if (!body) return new Response(JSON.stringify({ ok: false, error: "no body" }), { status: 200 });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    // GHL nests workflow Custom Data under `customData`; also accept top-level / common spellings.
    const cd = body.customData ?? body.custom_data ?? {};
    const email = String(cd.email ?? body.email ?? body.contact_email ?? body?.contact?.email ?? "").trim().toLowerCase();
    if (!email) return new Response(JSON.stringify({ ok: false, error: "no email" }), { status: 200 });

    const cal = body.calendar ?? {};
    const raw = String(cd.status ?? cal.status ?? body.status ?? body.appointment_status ?? "booked").toLowerCase();
    let status: "booked" | "cancelled" | "completed" | "no_show" = "booked";
    if (/cancel/.test(raw)) status = "cancelled";
    else if (/complete|show(ed)?|attended/.test(raw)) status = "completed";
    else if (/no.?show|noshow/.test(raw)) status = "no_show";

    // Prefer the real ISO datetime (calendar.startTime); the mapped custom field can be just "2:30 PM".
    // Only keep a value that actually parses to a date, else null — never let a bad value fail the insert.
    const apptRaw = cal.startTime ?? cd.appointment_at ?? body.appointment_at ?? body.start_time ?? null;
    let appointmentAt: string | null = null;
    if (apptRaw) { const d = new Date(apptRaw); if (!isNaN(d.getTime())) appointmentAt = d.toISOString(); }
    const ghlContactId = body.contact_id ?? cd.contact_id ?? body?.contact?.id ?? null;

    await db.from("review_bookings").upsert({
      email,
      appointment_at: appointmentAt,
      status,
      ghl_contact_id: ghlContactId ? String(ghlContactId) : null,
      source: "ghl",
      raw: body,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });
  } catch (e) {
    console.error("ghl-review-webhook:", (e as Error).message);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
