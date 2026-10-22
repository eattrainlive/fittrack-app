// Netlify Function: ghl-send  (ESM — project uses "type":"module")
// Sends a free-text WhatsApp reply through GoHighLevel's Conversations API so a
// coach can reply from inside FitTrack instead of opening the GHL web app.
//
// WhatsApp rule: free-text only works inside the 24-hour customer-care window
// (since the member last messaged). The app gates on that before calling here;
// if GHL/WhatsApp still rejects it (window just closed), we surface the error.
//
// On success we also mirror the outbound message into member_messages using the
// returned messageId as wa_message_id, so it appears in the thread immediately
// and the later "User Replied" webhook (same id) de-dupes instead of doubling.
//
// Security: POST, verified STAFF user only. GHL token stays server-side.
//
// Netlify env vars:
//   GHL_API_TOKEN   — a GHL Private Integration token (scope: conversations/message.write)
//   GHL_API_VERSION — optional, defaults to "2021-04-15"
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — verify staff token + mirror insert

const GHL_TOKEN = process.env.GHL_API_TOKEN;
const GHL_VERSION = process.env.GHL_API_VERSION || "2021-04-15";
const SB_URL = process.env.SUPABASE_URL;
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
  if (event.httpMethod !== "POST")
    return reply(405, { ok: false, error: "method not allowed" });
  const staff = await isStaff(event.headers.authorization || event.headers.Authorization);
  if (!staff) return reply(403, { ok: false, error: "staff only" });
  if (!GHL_TOKEN) return reply(500, { ok: false, error: "GHL_API_TOKEN not set" });

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return reply(400, { ok: false, error: "bad json" });
  }
  const contactId = String(body.contactId || "").trim();
  const message = String(body.message || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  // Reply on the same channel the member used (WhatsApp default; SMS supported).
  const channel = String(body.channel || "whatsapp").toLowerCase() === "sms"
    ? "sms"
    : "whatsapp";
  const ghlType = channel === "sms" ? "SMS" : "WhatsApp";
  if (!contactId) return reply(400, { ok: false, error: "no contactId" });
  if (!message) return reply(400, { ok: false, error: "empty message" });

  try {
    const r = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_TOKEN}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ type: ghlType, contactId, message }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      // GHL/WhatsApp rejected it (often: outside the 24h window).
      const msg =
        data?.message || data?.error || `GHL send failed (${r.status})`;
      return reply(r.status === 422 ? 409 : 502, { ok: false, error: msg });
    }

    // Mirror into member_messages so it shows instantly; key on the returned id
    // so the inbound webhook mirror de-dupes.
    const messageId = data?.messageId || data?.conversationId || null;
    if (email && SB_URL && SB_SERVICE) {
      try {
        await fetch(`${SB_URL}/rest/v1/member_messages`, {
          method: "POST",
          headers: {
            apikey: SB_SERVICE,
            Authorization: `Bearer ${SB_SERVICE}`,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates",
          },
          body: JSON.stringify({
            email,
            direction: "out",
            body: message,
            channel,
            status: "sent",
            ghl_contact_id: contactId,
            wa_message_id: messageId,
            occurred_at: new Date().toISOString(),
          }),
        });
      } catch (_) {
        /* mirror is best-effort */
      }
    }

    return reply(200, { ok: true, messageId });
  } catch (e) {
    return reply(500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};
