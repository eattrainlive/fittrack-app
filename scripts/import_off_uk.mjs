#!/usr/bin/env node
/**
 * Bulk-import UK products from Open Food Facts into the `foods` table.
 *
 * Pulls the MOST-SCANNED UK products (so you get the items members actually
 * search for first), keeps only those with complete, sane macros, and loads
 * them in as verified=false, source='off_uk'. Your hand-curated rows
 * (source NULL, usually verified=true) always rank first in search.
 *
 * Re-runnable: it deletes all source='off_uk' rows first, then re-inserts.
 * Your curated rows are never touched.
 *
 * ── Prerequisites ────────────────────────────────────────────────────────────
 *   1. Run supabase/sql/foods_add_source.sql once in the Supabase SQL editor.
 *   2. Node 18+ (uses global fetch).
 *
 * ── Run ──────────────────────────────────────────────────────────────────────
 *   Grab the SERVICE ROLE key from Supabase → Settings → API (keep it secret —
 *   never commit it or paste it anywhere). Then, from the repo root:
 *
 *     SUPABASE_URL="https://juvofqqtvakltlwqqhkn.supabase.co" \
 *     SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
 *     node scripts/import_off_uk.mjs
 *
 *   Optional env:
 *     OFF_PAGES   how many pages of 100 products to pull   (default 50 → ~5000)
 *     OFF_MINKCAL skip products below this kcal/100g        (default 1)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGES = Number(process.env.OFF_PAGES || 50);
const MIN_KCAL = Number(process.env.OFF_MINKCAL || 1);
const PAGE_SIZE = 100;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. See the header of this file.",
  );
  process.exit(1);
}

const OFF_FIELDS = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "nutrition_data_per",
].join(",");

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clean = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull one page of UK products from the OFF main API. No sort_by — the
 *  popularity sort is what makes deep pages 503; unsorted pagination is far
 *  lighter and lets us pull thousands. Retries with backoff on 5xx. */
async function fetchPage(page, attempt = 1) {
  const url =
    "https://world.openfoodfacts.org/api/v2/search?" +
    new URLSearchParams({
      countries_tags_en: "United Kingdom",
      fields: OFF_FIELDS,
      page_size: String(PAGE_SIZE),
      page: String(page),
    });
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "FitTrack-ETL/1.0 (gym app food import; michael@eattrainlivesmart.co.uk)",
      },
    });
    if (res.status >= 500 || res.status === 429) {
      throw new Error(`HTTP ${res.status} (busy)`);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.hits || json.products || [];
  } catch (e) {
    if (attempt >= 5) throw new Error(`OFF page ${page}: ${e.message}`);
    const wait = Math.min(2 ** attempt * 1000, 15000); // 2s,4s,8s,15s
    console.warn(`  page ${page}: ${e.message} — retry ${attempt}/4 in ${wait / 1000}s`);
    await sleep(wait);
    return fetchPage(page, attempt + 1);
  }
}

/** Map an OFF product to a foods row, or null if macros are incomplete. */
function toRow(p) {
  const name = clean(p.product_name);
  if (name.length < 2 || name.length > 120) return null;

  const n = p.nutriments || {};
  const cal = num(n["energy-kcal_100g"]);
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fats = num(n["fat_100g"]);
  // Require all four macros present and sane.
  if (cal == null || protein == null || carbs == null || fats == null) return null;
  if (cal < MIN_KCAL || cal > 900) return null;
  if (protein < 0 || carbs < 0 || fats < 0) return null;
  if (protein > 100 || carbs > 100 || fats > 100) return null;

  const fibre = num(n["fiber_100g"]);
  const brand = clean((p.brands || "").split(",")[0]) || null;

  let serving_g = num(p.serving_quantity);
  const serving_desc = clean(p.serving_size) || null;
  if (serving_g == null && serving_desc) {
    const m = serving_desc.match(/([\d.]+)\s*(g|ml)/i);
    if (m) serving_g = num(m[1]);
  }

  return {
    name,
    brand,
    calories: Math.round(cal * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fats: Math.round(fats * 10) / 10,
    fibre: fibre != null ? Math.round(fibre * 10) / 10 : null,
    serving_desc,
    serving_g: serving_g != null ? Math.round(serving_g) : null,
    category: null,
    verified: false,
    source: "off_uk",
  };
}

async function sb(path, init) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

async function main() {
  console.log(`Fetching up to ${PAGES} pages (~${PAGES * PAGE_SIZE}) of UK products…`);
  const rows = [];
  const seen = new Set();
  let consecutiveFails = 0;
  for (let page = 1; page <= PAGES; page++) {
    let products;
    try {
      products = await fetchPage(page);
    } catch (e) {
      consecutiveFails++;
      console.warn(`  page ${page} failed (${e.message}) — skipping [${consecutiveFails} in a row]`);
      if (consecutiveFails >= 12) {
        console.warn("  too many failures in a row — stopping early, keeping what we have.");
        break;
      }
      await sleep(1000);
      continue;
    }
    consecutiveFails = 0;
    if (!products.length) {
      console.log(`  page ${page}: no more results — reached the end.`);
      break;
    }
    let kept = 0;
    for (const p of products) {
      const row = toRow(p);
      if (!row) continue;
      const key = `${row.name.toLowerCase()}|${(row.brand || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
      kept++;
    }
    console.log(`  page ${page}: ${products.length} fetched, ${kept} kept (total ${rows.length})`);
    await sleep(800); // be polite to OFF
  }

  if (!rows.length) {
    console.error("No usable rows this run — nothing to add.");
    process.exit(1);
  }

  // RESET=1 wipes all previously imported OFF rows first (full refresh).
  // Default: ACCUMULATE — keep existing rows, add only ones we don't have yet,
  // so repeated runs (e.g. across the day when OFF is less busy) grow coverage.
  if (process.env.RESET === "1") {
    console.log(`RESET=1 — deleting previous source='off_uk' rows…`);
    await sb("foods?source=eq.off_uk", { method: "DELETE" });
  }

  console.log(`Loading existing off_uk keys to skip duplicates…`);
  const existing = new Set();
  if (process.env.RESET !== "1") {
    for (let offset = 0; ; offset += 1000) {
      const res = await sb(
        `foods?source=eq.off_uk&select=name,brand&limit=1000&offset=${offset}`,
      );
      const page = await res.json();
      for (const r of page) {
        existing.add(`${(r.name || "").toLowerCase()}|${(r.brand || "").toLowerCase()}`);
      }
      if (page.length < 1000) break;
    }
  }

  const fresh = rows.filter(
    (r) => !existing.has(`${r.name.toLowerCase()}|${(r.brand || "").toLowerCase()}`),
  );
  console.log(
    `Gathered ${rows.length} this run; ${existing.size} already stored; inserting ${fresh.length} new.`,
  );
  if (!fresh.length) {
    console.log("Nothing new to add. Done.");
    return;
  }

  for (let i = 0; i < fresh.length; i += 500) {
    const batch = fresh.slice(i, i + 500);
    await sb("foods", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(batch),
    });
    console.log(`  inserted ${Math.min(i + 500, fresh.length)}/${fresh.length}`);
  }

  console.log(
    `Done. Added ${fresh.length} new products (total off_uk now ~${existing.size + fresh.length}).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
