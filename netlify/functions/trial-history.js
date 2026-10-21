// Netlify Function: trial-history  (ESM — project uses "type":"module")
// Live-reads the "Trial Conversions" tab of the 2026 KPIs Google Sheet and
// returns it as JSON for the Trials hub → History tab. This is the system of
// record for trials that predate the app (Jan–Jul) as well as current months.
//
// The sheet is read via Google's public gviz CSV endpoint (no API key needed —
// the sheet just has to be link-viewable). Done server-side so the browser isn't
// blocked by CORS and the sheet id stays out of the client bundle.
//
// Security model (identical to trial-nurture / acc-welcome):
//  - GET, ONLY for a verified, logged-in STAFF user.
//
// Netlify env vars:
//   KPI_SHEET_ID   — the 2026 KPIs spreadsheet id (falls back to the known id)
//   KPI_TRIALS_TAB — the tab name (defaults to "Trial Conversions")
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — to verify the staff token

const SHEET_ID =
  process.env.KPI_SHEET_ID || "1ijfw6oS-vKAFE7EouAdE4kIf0Lt6pZt6J3HwWNqHrmo";
const TAB = process.env.KPI_TRIALS_TAB || "Trial Conversions";
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

// Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (s) => String(s || "").trim().toLowerCase();

export const handler = async (event) => {
  if (event.httpMethod !== "GET")
    return reply(405, { ok: false, error: "method not allowed" });
  const staff = await isStaff(event.headers.authorization || event.headers.Authorization);
  if (!staff) return reply(403, { ok: false, error: "staff only" });

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    TAB,
  )}`;

  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return reply(502, { ok: false, error: `sheet fetch ${r.status}` });
    const csv = await r.text();
    const grid = parseCSV(csv);
    if (!grid.length) return reply(200, { ok: true, rows: [] });

    // Locate the header row (first row containing an "email" cell).
    let hIdx = grid.findIndex((row) => row.some((c) => norm(c) === "email"));
    if (hIdx < 0) hIdx = 0;
    const header = grid[hIdx].map(norm);
    const col = (name) => header.findIndex((h) => h.includes(name));

    const ix = {
      month: col("month"),
      first: col("first"),
      last: col("last"),
      email: col("email"),
      start: header.findIndex((h) => h.includes("trial start") || h === "start"),
      type: header.findIndex((h) => h.includes("trial type")),
      cat: header.findIndex((h) => h.includes("trial category")),
      conv: header.findIndex((h) => h.startsWith("converted?") || h === "converted?"),
      onto: header.findIndex((h) => h.includes("converted onto")),
      ontoCat: header.findIndex((h) => h.includes("onto category")),
      convDate: header.findIndex((h) => h.includes("conversion date")),
      source: header.findIndex((h) => h === "source" || h.includes("source")),
    };

    const at = (row, i) => (i >= 0 ? String(row[i] ?? "").trim() : "");
    const rows = [];
    for (let i = hIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const email = at(row, ix.email);
      const first = at(row, ix.first);
      const last = at(row, ix.last);
      if (!email && !first && !last) continue; // skip blanks / summary rows
      rows.push({
        month: at(row, ix.month),
        firstName: first,
        lastName: last,
        email,
        trialStart: at(row, ix.start),
        trialType: at(row, ix.type),
        trialCategory: at(row, ix.cat),
        converted: /^y/i.test(at(row, ix.conv)),
        convertedOnto: at(row, ix.onto),
        ontoCategory: at(row, ix.ontoCat),
        conversionDate: at(row, ix.convDate),
        source: at(row, ix.source),
      });
    }

    return reply(200, { ok: true, rows });
  } catch (e) {
    return reply(500, { ok: false, error: String(e && e.message ? e.message : e) });
  }
};
