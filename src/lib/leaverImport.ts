// Leaver / churn import — the "Lapsed Members" export. Marks each leaver cancelled with their
// ACTUAL cancel date, so monthly churn/retention and all-time leavers become real. Keyed on email.
// A member currently active (rejoined) is left alone — their live membership wins.
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
function toISODate(s: string): string | null {
  const t = (s || "").trim(); if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) { let [, dd, mm, yy] = m; if (yy.length === 2) yy = "20" + yy; return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`; }
  const d = new Date(t); return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

export interface LeaverImportResult {
  ok: boolean; error?: string;
  rows: number; marked: number; created: number; skippedActive: number; noDate: number;
}

export async function importLeavers(text: string): Promise<LeaverImportResult> {
  const base: LeaverImportResult = { ok: false, rows: 0, marked: 0, created: 0, skippedActive: 0, noDate: 0 };
  const lines = text.split(/\r?\n/);
  // Header can sit a few blank rows down — find the row containing Email + Cancelled.
  let h = -1, header: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cells = splitCsvLine(lines[i]).map(norm);
    if (cells.includes("email") && cells.some((c) => c.includes("cancel"))) { h = i; header = splitCsvLine(lines[i]); break; }
  }
  if (h < 0) return { ...base, error: "Couldn't find header row (needs Email + Cancelled columns)" };
  const idx = (match: (h: string) => boolean) => header.findIndex((x) => match(norm(x)));
  const c = {
    first: idx((x) => x === "firstname" || x === "first"),
    last: idx((x) => x === "lastname" || x === "last"),
    email: idx((x) => x === "email"),
    membership: idx((x) => x.includes("membership")),
    category: idx((x) => x === "category"),
    fee: idx((x) => x.includes("monthly")),
    cancelled: idx((x) => x.includes("cancel")),
  };
  if (c.email < 0 || c.cancelled < 0) return { ...base, error: "Missing Email or Cancelled column" };

  // Current roster: email → ids. A leaver is skipped if they're a CURRENT member — identified
  // by being in the latest pricing file (pricing_source) OR by a live status. The pricing file
  // is the authoritative active list, so this protects current members even when their status
  // hasn't been set to 'active' yet.
  const idsByEmail = new Map<string, string[]>();
  const currentEmails = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("gym_members").select("id, email, status, pricing_source").range(from, from + 999);
    if (error) return { ...base, error: error.message };
    for (const r of data || []) {
      const e = norm(r.email || ""); if (!e) continue;
      (idsByEmail.get(e) ?? idsByEmail.set(e, []).get(e)!).push(r.id);
      const st = norm(r.status || "");
      if (st === "active" || st === "paused" || r.pricing_source === "etl_pricing_file") currentEmails.add(e);
    }
    if (!data || data.length < 1000) break;
  }

  const res = { ...base, ok: true };
  const nowIso = new Date().toISOString();
  for (let i = h + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCsvLine(lines[i]);
    const email = norm(cols[c.email] || "");
    if (!email || !email.includes("@")) continue;
    res.rows++;
    if (currentEmails.has(email)) { res.skippedActive++; continue; } // current member — don't cancel
    const ended = toISODate(cols[c.cancelled] || "");
    if (!ended) res.noDate++;

    const fields: any = { status: "cancelled", ended_on: ended, needs_review: false, updated_at: nowIso };
    const ids = idsByEmail.get(email);
    if (ids && ids.length) {
      const { error } = await supabase.from("gym_members").update(fields).in("id", ids);
      if (error) return { ...base, ok: false, error: error.message };
      res.marked++;
    } else {
      const fullName = [cols[c.first] || "", cols[c.last] || ""].join(" ").trim() || null;
      const { error } = await supabase.from("gym_members").insert({
        id: `email:${email}`, email, full_name: fullName,
        product: c.membership >= 0 ? (cols[c.membership] || null) : null,
        price_category: c.category >= 0 ? (cols[c.category] || null) : null,
        monthly_fee: c.fee >= 0 ? numOrNull(cols[c.fee]) : null,
        ...fields,
      });
      if (error) return { ...base, ok: false, error: error.message };
      res.created++;
    }
  }
  return res;
}
