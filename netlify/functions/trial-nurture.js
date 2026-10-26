// Netlify Function: trial-nurture  (ESM — project uses "type":"module")
// Fires the GoHighLevel "trial nurture" inbound-webhook workflow to send ONE
// nurture step's approved WhatsApp template for a trialist, when a coach hits
// send in the FitTrack Trial Nurture cockpit.
//
// Security model (identical to staffhub-whatsapp):
//  - POST only, and ONLY for a verified, logged-in STAFF user. The GHL webhook
//    URL is held server-side (env), so it never reaches the browser and can't be
//    fired by the function URL alone.
//
// The WELCOME step is NOT sent here — it auto-fires server-side from the
// gymos-webhook (maybeStartTrial → TRIAL_STARTED_WEBHOOK_URL) when the trial
// clock starts. This function sends every OTHER (coach-reviewed) step.
//
// Netlify env vars:
//   GHL_TRIAL_NURTURE_WEBHOOK_URL   — the GHL "send nurture step" Inbound Webhook URL
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — to verify the staff token

const GHL_URL    = process.env.GHL_TRIAL_NURTURE_WEBHOOK_URL;
const SB_URL     = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const H = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (code, obj) => ({ statusCode: code, headers: H, body: JSON.stringify(obj) });

async function isStaff(authHeader) {
  try {
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "");
    if (!token || !SB_URL || !SB_SERVICE) return false;
    const u = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${token}` },
    });
    if (!u.ok) return false;
    const user = await u.json();
    if (!user || !user.id) return false;
    const s = await fetch(
      `${SB_URL}/rest/v1/staff_users?user_id=eq.${user.id}&select=user_id`,
      { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` } },
    );
    if (!s.ok) return false;
    const rows = await s.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (_) {
    return false;
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { ok: false, error: "method not allowed" });
  if (!GHL_URL) return reply(500, { ok: false, error: "trial nurture trigger not configured" });

  const staff = await isStaff(
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || "",
  );
  if (!staff) return reply(401, { ok: false, error: "staff only" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return reply(400, { ok: false, error: "bad body" });
  }

  const email = String(body.email || "").trim();
  const stepKey = String(body.step_key || "").trim();
  const templateKey = String(body.template_key || "").trim();
  if (!email) return reply(400, { ok: false, error: "email required" });
  if (!stepKey || !templateKey) return reply(400, { ok: false, error: "step_key and template_key required" });

  // Payload GHL maps onto the contact (match by email), then sends `template_key`
  // and writes `coach_note` to the Coach Note contact field.
  const payload = {
    trigger: "trial_nurture_step",
    email,
    full_name: String(body.name || "").trim(),
    step_key: stepKey,
    template_key: templateKey,
    coach_note: String(body.coach_note || ""),
    trial_start: String(body.trial_start || ""),
    trial_end: String(body.trial_end || ""),
    trial_day: Number(body.trial_day || 0),
    sent_by: String(body.by || ""),
    sent_at: new Date().toISOString(),
  };

  try {
    const r = await fetch(GHL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    if (!r.ok) return reply(502, { ok: false, error: `ghl ${r.status}` });

    // Mirror the sent template into the member's in-app thread so the coach has an
    // immediate snapshot of what went out (GHL template sends don't trigger the
    // inbound sync). Best-effort; service role bypasses RLS.
    const messageBody = String(body.message_body || "").trim();
    if (messageBody && SB_URL && SB_SERVICE) {
      try {
        await fetch(`${SB_URL}/rest/v1/member_messages`, {
          method: "POST",
          headers: {
            apikey: SB_SERVICE,
            Authorization: `Bearer ${SB_SERVICE}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            direction: "out",
            body: messageBody,
            channel: "whatsapp",
            template_key: templateKey,
            status: "sent",
            occurred_at: new Date().toISOString(),
          }),
        });
      } catch (_) { /* mirror is best-effort */ }
    }

    return reply(200, { ok: true });
  } catch (e) {
    return reply(502, { ok: false, error: String(e) });
  }
};
