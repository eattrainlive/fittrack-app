// Per-member pricing import — upsert the ETL pricing export onto the roster, keyed on
// normalised email. Actual fee becomes the source for revenue; plan price is only a fallback.
// £0 is a REAL price when zero_price_reason is set — never treated as missing.
import { supabase } from "@/lib/supabase";

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const norm = (s: string) => (s || "").toLowerCase().trim();
const numOrNull = (s: string) => { const t = (s ?? "").trim(); if (t === "") return null; const n = Number(t.replace(/[£,\s]/g, "")); return isNaN(n) ? null : n; };
const boolOf = (s: string) => /^(true|yes|1|y)$/i.test((s || "").trim());
function toISODate(s: string): string | null {
  const t = (s || "").trim(); if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) { let [, dd, mm, yy] = m; if (yy.length === 2) yy = "20" + yy; return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`; }
  const d = new Date(t); return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

function mapStatus(fileStatus: string): string | null {
  const s = norm(fileStatus);
  if (!s) return null;
  if (s.includes("active")) return "active";
  if (s.includes("paus") || s.includes("freeze") || s.includes("frozen")) return "paused";
  if (s.includes("cancel") || s.includes("left") || s.includes("ended") || s.includes("lapsed")) return "cancelled";
  return null;
}

export interface PricingImportResult {
  ok: boolean; error?: string;
  rows: number; matched: number; created: number; flaggedReview: number;
  zeroPrice: number; paying: number; totalMonthly: number;
}

export async function importMemberPricing(text: string): Promise<PricingImportResult> {
  const base: PricingImportResult = { ok: false, rows: 0, matched: 0, created: 0, flaggedReview: 0, zeroPrice: 0, paying: 0, totalMonthly: 0 };
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { ...base, error: "No rows in file" };
  const header = splitCsvLine(lines[0]);
  const idx = (name: string) => header.findIndex((h) => norm(h) === norm(name));
  const c = {
    email: idx("member_email"), first: idx("first_name"), last: idx("last_name"),
    plan: idx("membership_plan"), category: idx("category"), status: idx("membership_status"),
    fee: idx("monthly_price_gbp"), isPaying: idx("is_paying"), zeroReason: idx("zero_price_reason"),
    payer: idx("payer_email"), route: idx("payment_route"), prepaidRenews: idx("prepaid_renews_month"),
    join: idx("join_date"),
  };
  if (c.email < 0 || c.fee < 0) return { ...base, error: "File missing member_email or monthly_price_gbp column" };

  // Existing roster emails → ids + current status (paginated past the 1000 cap).
  const emailToIds = new Map<string, string[]>();
  const liveIdsByEmail = new Map<string, string[]>(); // only active/paused rows (sweep candidates)
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("gym_members").select("id, email, status").range(from, from + 999);
    if (error) return { ...base, error: error.message };
    for (const r of data || []) {
      const e = norm(r.email || ""); if (!e) continue;
      (emailToIds.get(e) ?? emailToIds.set(e, []).get(e)!).push(r.id);
      const st = norm(r.status || "");
      if (st === "active" || st === "paused") (liveIdsByEmail.get(e) ?? liveIdsByEmail.set(e, []).get(e)!).push(r.id);
    }
    if (!data || data.length < 1000) break;
  }

  const seen = new Set<string>();
  const res = { ...base, ok: true, rows: lines.length - 1 };
  const nowIso = new Date().toISOString();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const email = norm(cols[c.email] || "");
    if (!email) continue;
    seen.add(email);
    const fee = numOrNull(cols[c.fee]);                    // null = unknown; 0 = real
    const zeroReason = c.zeroReason >= 0 ? (cols[c.zeroReason] || null) : null;
    const isPaying = c.isPaying >= 0 ? boolOf(cols[c.isPaying]) : (fee != null && fee > 0);
    if (fee === 0) res.zeroPrice++;
    if (isPaying && fee != null) { res.paying++; res.totalMonthly += fee; }
    else if (fee != null && fee > 0) res.totalMonthly += fee;

    const fields: any = {
      monthly_fee: fee,
      is_paying: isPaying,
      zero_price_reason: zeroReason,
      payer_email: c.payer >= 0 ? (cols[c.payer] || null) : null,
      payment_route: c.route >= 0 ? (cols[c.route] || null) : null,
      prepaid_renews_month: c.prepaidRenews >= 0 ? (cols[c.prepaidRenews] || null) : null,
      price_category: c.category >= 0 ? (cols[c.category] || null) : null,
      pricing_source: "etl_pricing_file",
      pricing_updated_at: nowIso,
      needs_review: false,
      updated_at: nowIso,
    };
    // Everyone in the current pricing file IS a current member → active unless the file marks
    // them paused/cancelled. (Blank/unmapped statuses were leaving members uncounted.)
    const st = c.status >= 0 ? mapStatus(cols[c.status]) : null;
    fields.status = st || "active";
    const jd = c.join >= 0 ? toISODate(cols[c.join]) : null;
    if (jd) fields.joined_on = jd;   // fixes "members at start" / tenure chain

    const ids = emailToIds.get(email);
    if (ids && ids.length) {
      const { error } = await supabase.from("gym_members").update(fields).in("id", ids);
      if (error) return { ...base, ok: false, error: error.message };
      res.matched++;
    } else {
      const fullName = [cols[c.first] || "", cols[c.last] || ""].join(" ").trim() || null;
      const { error } = await supabase.from("gym_members").insert({
        id: `email:${email}`, email, full_name: fullName,
        product: c.plan >= 0 ? (cols[c.plan] || null) : null,
        status: st || "active", ...fields,
      });
      if (error) return { ...base, ok: false, error: error.message };
      res.created++;
    }
  }

  // Flag (do NOT cancel) current members absent from the pricing file. The pricing export only
  // lists PAYING members — trialists and brand-new joiners aren't in it, so cancelling on absence
  // wrongly kills active trials. Cancellations come from the dated Lapsed-Members leaver import
  // (the authoritative "who left and when"), not from this sweep. Here we just flag for a human.
  if (res.rows >= 50) {
    const absent: string[] = [];
    for (const [email, ids] of liveIdsByEmail) if (!seen.has(email)) absent.push(...ids);
    for (let i = 0; i < absent.length; i += 500) {
      const { error } = await supabase.from("gym_members")
        .update({ needs_review: true, updated_at: nowIso })
        .in("id", absent.slice(i, i + 500));
      if (error) return { ...base, ok: false, error: error.message };
    }
    res.flaggedReview = absent.length;
  }
  return res;
}
