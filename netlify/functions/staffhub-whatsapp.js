// Netlify Function: staffhub-whatsapp  (ESM — project uses "type":"module")
// Fires a GoHighLevel inbound-webhook workflow to send the "reach-out" WhatsApp
// for one person, when a coach hits the WhatsApp step in the Staff Hub call list.
//
// Security model:
//  - POST only, and ONLY for a verified, logged-in STAFF user (same check as the
//    staffhub proxy). The GHL webhook URL is held server-side (env), so it never
//    reaches the browser and can't be fired by the function URL alone.
//
// Netlify env vars:
//   GHL_WHATSAPP_WEBHOOK_URL   — the GHL workflow Inbound Webhook URL
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — to verify the staff token

const GHL_URL    = process.env.GHL_WHATSAPP_WEBHOOK_URL;
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
  if (!GHL_URL) return reply(500, { ok: false, error: "whatsapp trigger not configured" });

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
  if (!email) return reply(400, { ok: false, error: "email required" });

  // Payload GHL can map onto a contact (match/create by email, then Send WhatsApp).
  const payload = {
    trigger: "staffhub_whatsapp",
    list_type: String(body.list_type || ""),
    email,
    first_name: String(body.first || ""),
    last_name: String(body.last || ""),
    full_name: String(body.name || `${body.first || ""} ${body.last || ""}`).trim(),
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
    return reply(200, { ok: true });
  } catch (e) {
    return reply(502, { ok: false, error: String(e) });
  }
};
