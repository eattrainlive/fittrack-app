// Supabase Edge Function: gymos-webhook  (phase 2 — logs + processes)
// Receives GymOS webhooks, LOGS the raw payload, then MIRRORS the event into the roster.
// GymOS is the system of record; this only reflects what GymOS says (never authors status).
//
// Now also mirrors SESSION BOOKING events (payload.booking) into member_bookings, for the
// trial progress pack. Booking events are routed to syncBooking and never touch the roster
// mirror (they carry no membership, so they must NOT overwrite gym_members).
//
// Deploy (PUBLIC — GymOS sends no Supabase JWT):
//   supabase functions deploy gymos-webhook --no-verify-jwt
//   supabase secrets set GYMOS_WEBHOOK_SECRET=your-long-random-string
// Tables: run gymos_webhook_log_schema.sql, gymos_webhook_phase2.sql AND member_bookings_setup.sql first.
//
// GymOS payload shape (confirmed from samples):
//   { eventType: "Membership Cancelled" | "Membership added" | "Membership payment failure" | "Session booked" | ...,
//     eventTimestampUtc, subject: { member: { id, email, fullName, ... } },
//     payload: { membership: {...} }  OR  payload: { booking: {...}, session: {...} } }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("GYMOS_WEBHOOK_SECRET") ?? "";
const TRIAL_STARTED_WEBHOOK = Deno.env.get("TRIAL_STARTED_WEBHOOK_URL") ?? "";  // GHL 30-day drip trigger
const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE);

// Start a trialist's 30-day clock from their FIRST booked session (not their join date).
// Sets trial_start/trial_end once, then pings GHL to kick off the 30-day follow-up drip.
async function maybeStartTrial(db: any, email: string | null, name: string | null, sessionAt: any) {
  if (!email || !sessionAt) return;
  const { data: tc } = await db.from("trial_cohort")
    .select("email, full_name, trial_start").eq("email", email).maybeSingle();
  if (!tc) return;                 // not a 30-day trialist
  if (tc.trial_start) return;      // clock already started — first session only
  const start = new Date(sessionAt);
  if (isNaN(start.getTime())) return;
  const startDay = start.toISOString().slice(0, 10);
  const endDay = new Date(start.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  // Guarded update (is null) so two near-simultaneous bookings can't double-fire.
  const { data: upd } = await db.from("trial_cohort")
    .update({ trial_start: startDay, trial_end: endDay, updated_at: new Date().toISOString() })
    .eq("email", email).is("trial_start", null).select("email");
  if (!upd || upd.length === 0) return;   // someone else set it first — don't fire twice
  if (TRIAL_STARTED_WEBHOOK) {
    try {
      await fetch(TRIAL_STARTED_WEBHOOK, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name ?? tc.full_name ?? "", email, trial_start: startDay, trial_end: endDay }),
      });
    } catch (_) { /* drip trigger is best-effort */ }
  }
}

// ── Access-by-membership (must match manage-members) ──────────────────────────
const ACCESS_VALUES = ["Foundations", "Stronger", "Fusion", "Performance", "Group PT"];
const BASE_STREAMS = ["Foundations", "Stronger", "Fusion", "Performance"];
function getsGroupPT(p: any): boolean {
  const s = String(p || "").toLowerCase();
  if (/21|£\s*21|gym\s*trial/.test(s)) return false;        // 21-for-£21 gym trial = gym-tier, no Group PT
  if (/30\s*day/.test(s)) return true;                      // 30-day (PT) trial
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s)) return true;  // PT memberships
  return false;                                             // Classes, gym, everything else
}
const accessForProduct = (p: any): string[] =>
  getsGroupPT(p) ? [...BASE_STREAMS, "Group PT"] : [...BASE_STREAMS];

function normEmail(e: any): string {
  const s = String(e ?? "").trim().toLowerCase();
  const at = s.indexOf("@"); if (at < 0) return s;
  let local = s.slice(0, at); let dom = s.slice(at + 1);
  local = local.split("+")[0];
  if (dom === "googlemail.com") dom = "gmail.com";
  if (dom === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${dom}`;
}

// Recompute a member's programme access from their (new) membership, UNLESS a coach has set a
// manual override on that member row. Matches the app account by confirmed link first, then by
// normalised email. Authoritative overwrite: upgrades add streams, downgrades remove them.
async function recomputeAccess(db: any, ref: string, email: string | null, product: any) {
  const derived = accessForProduct(product).filter((v) => ACCESS_VALUES.includes(v));
  const ids = new Set<string>();
  try {
    const { data: links } = await db.from("member_links").select("user_id").eq("member_id", ref);
    for (const l of links ?? []) ids.add(String(l.user_id));
  } catch (_) { /* member_links may not exist */ }
  if (email) {
    const target = normEmail(email);
    const { data: mem } = await db.from("members").select("id, email");
    for (const m of mem ?? []) if (normEmail(m.email) === target) ids.add(String(m.id));
  }
  for (const id of ids) {
    const { data: row } = await db.from("members").select("access_override").eq("id", id).maybeSingle();
    if (row?.access_override) continue;                    // coach-set — leave it alone
    await db.from("members").update({ allowed_access: derived }).eq("id", id);
  }
}

serve(async (req) => {
  if (req.method === "GET") return new Response("gymos-webhook alive", { status: 200 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("x-webhook-secret") ?? "";
  if (WEBHOOK_SECRET && key !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });

  const rawText = await req.text();
  let body: any = null;
  try { body = JSON.parse(rawText); } catch { /* keep raw */ }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  const db = admin();
  // 1. Always log the raw event.
  try {
    await db.from("webhook_log").insert({
      source: "gymos", event: body?.eventType ?? null, headers,
      payload: body, raw_text: body ? null : rawText, processed: false,
    });
  } catch (e) { console.error("webhook_log insert:", (e as Error).message); }

  // 2. Process it. Never throw — always ACK 200 so GymOS won't retry-storm.
  //    Session/booking events (payload.booking) go to member_bookings and must NOT run through
  //    processEvent (they carry no membership → would null the roster row). Everything else mirrors.
  try {
    if (body) {
      if (body?.payload?.booking) await syncBooking(db, body);
      else await processEvent(db, body);
    }
  } catch (e) { console.error("processEvent:", (e as Error).message); }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});

async function processEvent(db: any, body: any) {
  const evt = String(body.eventType ?? "").toLowerCase();
  const member = body?.subject?.member ?? {};
  const membership = body?.payload?.membership ?? {};
  const gymosId = member.id ? String(member.id) : null;
  const email = member.email ? String(member.email).trim().toLowerCase() : null;
  if (!gymosId && !email) return; // nothing to match on

  const ref = gymosId ?? `email:${email}`;                         // stable member_ref
  const eventTs = body.eventTimestampUtc || body.webHookTimestampUtc || new Date().toISOString();
  const eventKey = `${ref}|${body.eventType}|${eventTs}`;          // idempotency key
  const nowIso = new Date().toISOString();

  // Classify the event by eventType (case-insensitive). GymOS status fields are NOT reliable
  // for the event (they stay "Active"/"Satisfactory"), so route on eventType only.
  const isPayment = /payment/.test(evt);
  const paymentFailed = isPayment && /(fail|declin|unpaid|missed|error|reject|overdue|bounce)/.test(evt);
  const isPause  = !isPayment && /(paus|frozen|freeze|suspend|\bhold)/.test(evt);
  const pauseEnded = isPause && /(end|complet|finish|resume|recommenc|restart|expire)/.test(evt);
  const isCancel = !isPayment && !isPause && /(cancel|terminat|expir|lapse)/.test(evt);
  const isJoin   = !isPayment && !isPause && /(add|creat|new|join|\bstart|reactivat|renew|\bactive|resumed)/.test(evt);

  // Always keep the roster row fresh (mirror). Never invents status.
  const memberRow: any = {
    id: ref, gymos_member_id: gymosId, email,
    full_name: member.fullName ?? null,
    product: membership.membershipPlan ?? null,
    joined_on: membership.startDateUtc ? String(membership.startDateUtc).slice(0, 10) : undefined,
    last_import_at: nowIso, updated_at: nowIso,
  };
  let newStatus: string | null = null;
  if (isPause && !pauseEnded) { newStatus = "paused"; memberRow.status = "paused"; memberRow.ended_on = null; }
  else if (isPause && pauseEnded) { newStatus = "active"; memberRow.status = "active"; memberRow.ended_on = null; }
  else if (isCancel) { newStatus = "cancelled"; memberRow.status = "cancelled"; memberRow.ended_on = String(eventTs).slice(0, 10); }
  else if (isJoin) { newStatus = "active"; memberRow.status = "active"; memberRow.ended_on = null; }
  // payment events do NOT change membership status.

  await db.from("gym_members").upsert(memberRow, { onConflict: "id" });

  // Keep app-side programme access in lockstep with membership. Recompute on any event that
  // carries a membership plan EXCEPT payments and cancels (a cancel names the plan being ended,
  // so re-granting from it would be wrong — the access GATE handles cancelled/paused login
  // access separately). Skips members with a manual coach override.
  if (memberRow.product && !isPayment && !isCancel) {
    try { await recomputeAccess(db, ref, email, memberRow.product); }
    catch (e) { console.error("recomputeAccess:", (e as Error).message); }
  }

  if (newStatus) {
    await db.from("membership_status_history")
      .upsert({ event_key: eventKey, member_ref: ref, status: newStatus, product: membership.membershipPlan ?? null, effective_from: String(eventTs).slice(0, 10), source: "gymos_webhook" },
        { onConflict: "event_key", ignoreDuplicates: true });
  }

  if (isPayment) {
    await db.from("payment_events")
      .upsert({ event_key: eventKey, member_ref: ref, gymos_member_id: gymosId,
                result: paymentFailed ? "failed" : "success",
                amount: membership.costPerPaymentPeriod ?? null,
                event_type: body.eventType, event_ts: eventTs, raw: body },
        { onConflict: "event_key", ignoreDuplicates: true });
  }

  // ── Trial cohort tracking (for the Current Trialists board) ────────────────
  // On a JOIN: if it's a 30-day coached trial, add/refresh their cohort row; if it's any OTHER
  // (paid) membership and they were a not-yet-converted trialist, mark them converted.
  const TRIAL_30 = ["30 day trial", "forever strong 30 day trial"];
  if (isJoin && email) {
    const planName = String(membership.membershipType ?? membership.membershipPlan ?? "").trim().toLowerCase();
    if (TRIAL_30.includes(planName)) {
      await db.from("trial_cohort").upsert({
        email,
        full_name: member.fullName ?? null,
        trial_product: membership.membershipPlan ?? membership.membershipType ?? null,
        // trial_start / trial_end are deliberately NOT set on join — the 30-day clock starts from
        // their FIRST booked session (see maybeStartTrial), so the drip + app day-count line up.
        // Omitting them here leaves an existing trial_start untouched and defaults a new row to null.
        updated_at: nowIso,
      }, { onConflict: "email" });   // note: does not touch `converted`, so a re-add won't un-convert
    } else if (planName) {
      // a paid membership joined — mark conversion for a former 30-day trialist
      await db.from("trial_cohort")
        .update({ converted: true, converted_product: membership.membershipPlan ?? membership.membershipType ?? null, converted_at: nowIso, updated_at: nowIso })
        .eq("email", email).eq("converted", false);
    }
  }
}

// Mirror Quoox SESSION booking events into member_bookings for the trial progress pack.
// Handles booked / cancelled / attended uniformly, keyed on the Quoox booking id so a later
// cancel (or attendance mark) UPDATES the same row instead of adding a duplicate.
async function syncBooking(db: any, body: any) {
  const evt = String(body.eventType ?? "").toLowerCase();
  const booking = body?.payload?.booking ?? {};
  const session = body?.payload?.session ?? {};
  const member = body?.subject?.member ?? {};

  const email = member.email ? String(member.email).trim().toLowerCase() : null;
  const externalId = booking.id ? String(booking.id) : null;
  if (!email && !externalId) return;

  // Status from the event name first (most reliable for a cancel), then the booking's own status.
  const bStatus = String(booking.status ?? "").toLowerCase();
  let status: "booked" | "cancelled" | "attended" = "booked";
  if (/cancel/.test(evt) || /cancel/.test(bStatus)) status = "cancelled";
  else if (/attend|checked?.?in|arriv/.test(evt) || /attend/.test(bStatus)) status = "attended";

  const sessionAt = session.startTimeLocal ?? session.startTimeUtc ?? null;
  const eventAt = booking.bookedTimeUtc ?? body.eventTimestampUtc ?? new Date().toISOString();

  const row: any = {
    email,
    gymos_member_id: member.id ? String(member.id) : null,
    external_booking_id: externalId,
    session_id: session.id ? String(session.id) : null,
    session_at: sessionAt,
    session_type: session.sessionType ?? null,
    coach: session.leadCoach ?? null,
    event_at: eventAt,
    status,
    raw: body,
  };

  // Upsert on the booking id so cancels/attendance updates land on the same row.
  if (externalId) {
    await db.from("member_bookings").upsert(row, { onConflict: "external_booking_id" });
  } else {
    await db.from("member_bookings").insert(row);
  }

  // A trialist's FIRST booked session starts their 30-day clock (skip cancellations).
  if (status !== "cancelled") {
    try { await maybeStartTrial(db, email, member.fullName ?? null, sessionAt); }
    catch (e) { console.error("maybeStartTrial:", (e as Error).message); }
  }
}
