import * as XLSX from "xlsx";
import { importMemberships } from "./store";

export interface SyncResult {
  matched: number;
  created: number;
  unmatched: number;
  flagged: number;
  unmatchedEmails: string[];
}

const PT_TRIAL =
  /(30 day trial|forever strong|pt[- ]?\d|semi.*private.*pt|private.*pt)/i;

/**
 * Parse a Quoox "Active Memberships" export (.xlsx or .csv) and backfill
 * gym_members via importMemberships().
 *
 * Quoox export layout:
 *   Row 1 = title ("Active Memberships")
 *   Row 2 = blank
 *   Row 3 = header (First name, Last name, Email, Mobile, Membership Type, ...)
 *   Row 4+ = data, one row per membership
 *
 * Everyone in this export is "active"; we pass [] for endedRows.
 * If a member has multiple memberships, prefer the PT / 30-day-trial product
 * (so their auto-access is correct).
 */
export async function syncMembershipsFromCsv(file: File): Promise<
  | {
      success: true;
      results: SyncResult;
      activeCount: number;
      endedCount: number;
    }
  | { success: false; error: string }
> {
  // ── Parse the file into rows (arrays of cells) ────────────────────────────
  let rows: string[][];

  if (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls")
  ) {
    // Parse via SheetJS (works in-browser)
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return { success: false, error: "Workbook has no sheets" };
    rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      blankrows: false,
      raw: false,
    }) as string[][];
  } else {
    // Plain CSV
    const text = await file.text();
    rows = parseCsv(text);
  }

  // ── Find the real header row (skips the title + blank) ────────────────────
  // The Quoox export starts with a title row and a blank row; the header row
  // is the first row containing "Email".
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = (rows[i] || []).map((c) => String(c || "").toLowerCase());
    if (r.some((c) => c === "email" || c.startsWith("email"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1)
    return {
      success: false,
      error: "Could not find a header row with an Email column",
    };

  const headers = (rows[headerIdx] || []).map((h) =>
    String(h || "")
      .trim()
      .toLowerCase(),
  );

  const findCol = (...names: string[]): number => {
    for (const n of names) {
      const i = headers.findIndex((h) => h === n || h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const emailIdx = findCol("email", "e-mail");
  if (emailIdx === -1)
    return { success: false, error: "Export must have an 'Email' column" };

  const firstNameIdx = findCol("first name", "first");
  const lastNameIdx = findCol("last name", "last", "surname");
  const productTypeIdx = findCol(
    "membership type",
    "membership",
    "product",
    "plan",
  );
  const joinedIdx = findCol(
    "membership start date",
    "start date",
    "join date",
    "joined",
    "joined_on",
    "start",
  );

  // ── Build per-email rows, preferring PT/trial products ─────────────────────
  const byEmail = new Map<
    string,
    { email: string; full_name?: string; product?: string; joined_on?: string }
  >();

  const normDate = (v: string): string | undefined => {
    if (!v) return undefined;
    // UK format: dd/mm/yyyy or dd-mm-yyyy (Quoox uses UK dates)
    const dmy = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, "0");
      const month = dmy[2].padStart(2, "0");
      let year = dmy[3];
      if (year.length === 2) year = "20" + year;
      if (Number(month) > 12 || Number(day) > 31) return undefined; // impossible — bail
      return `${year}-${month}-${day}`;
    }
    // Already ISO yyyy-mm-dd
    const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (iso) {
      const mo = iso[2].padStart(2, "0");
      const d = iso[3].padStart(2, "0");
      if (Number(iso[2]) > 12 || Number(iso[3]) > 31) return undefined;
      return `${iso[1]}-${mo}-${d}`;
    }
    // Excel date serial number (days since 1899-12-31)
    const serial = Number(v);
    if (!isNaN(serial) && serial > 30000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return undefined;
  };

  for (const row of rows.slice(headerIdx + 1)) {
    const email = String(row[emailIdx] || "")
      .trim()
      .toLowerCase();
    if (!email || email.includes("total") || email.includes("count")) continue;

    const firstName =
      firstNameIdx !== -1 ? String(row[firstNameIdx] || "").trim() : "";
    const lastName =
      lastNameIdx !== -1 ? String(row[lastNameIdx] || "").trim() : "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ").trim() || undefined;
    const product =
      productTypeIdx !== -1
        ? String(row[productTypeIdx] || "").trim()
        : undefined;
    const joinedOn =
      joinedIdx !== -1 ? normDate(String(row[joinedIdx] || "")) : undefined;

    const existing = byEmail.get(email);
    // Prefer a PT/trial product for the auto-access rule; otherwise keep the first
    if (
      !existing ||
      (PT_TRIAL.test(product || "") && !PT_TRIAL.test(existing.product || ""))
    ) {
      byEmail.set(email, {
        email,
        full_name: fullName || existing?.full_name,
        product: product || existing?.product,
        joined_on: joinedOn || existing?.joined_on,
      });
    }
  }

  const activeRows = Array.from(byEmail.values());

  if (!activeRows.length)
    return {
      success: false,
      error: "No active memberships found in the export",
    };

  const res = await importMemberships(activeRows, []);
  if (!res.success)
    return { success: false, error: res.error || "Sync failed" };
  return {
    success: true,
    results: res.results,
    activeCount: activeRows.length,
    endedCount: 0,
  };
}

// ── CSV parser (handles quoted fields with embedded commas) ────────────────
function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
          continue;
        }
        if (ch === "," && !inQ) {
          out.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    });
}
