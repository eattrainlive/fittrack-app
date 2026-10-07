// Netlify Function: staffhub  (ESM — project uses "type":"module")
// Proxies the ETL Staff Hub Apps Script so the shared key + member PII never reach the browser.
//
// Security model:
//  - METRICS are public (no PII): any request gets them (calls Apps Script WITHOUT the key).
//  - PII lists (trialists/reachout/lapsed/actions) are returned ONLY to a verified, logged-in STAFF
//    user (we add the Apps Script key server-side). So the function URL alone can't leak names.
//
// Netlify env vars:
//   STAFFHUB_SCRIPT_URL, STAFFHUB_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SCRIPT_URL = process.env.STAFFHUB_SCRIPT_URL;
const SECRET     = process.env.STAFFHUB_SECRET;
const SB_URL     = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const H = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const reply = (code, obj) => ({
  statusCode: code,
  headers: H,
  body: typeof obj === "string" ? obj : JSON.stringify(obj),
});

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
  if (!SCRIPT_URL || !SECRET) return reply(500, { ok: false, error: "proxy not configured" });
  const staff = await isStaff(
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || "",
  );

  try {
    if (event.httpMethod === "GET") {
      const url = staff ? `${SCRIPT_URL}?key=${encodeURIComponent(SECRET)}` : SCRIPT_URL;
      const r = await fetch(url, { redirect: "follow" });
      return reply(200, await r.text());
    }

    if (event.httpMethod === "POST") {
      if (!staff) return reply(401, { ok: false, error: "staff only" });
      const incoming = JSON.parse(event.body || "{}");
      const payload = { actions: incoming.actions || [], key: SECRET };
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "follow",
      });
      return reply(200, await r.text());
    }

    return reply(405, { ok: false, error: "method not allowed" });
  } catch (e) {
    return reply(502, { ok: false, error: String(e) });
  }
};
