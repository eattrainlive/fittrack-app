#!/usr/bin/env node
/**
 * Import UK products from the Open Food Facts DUMP FILE (not the flaky API).
 *
 * You download one file from OFF (served off a CDN — reliable, not rate-limited),
 * and this script streams through it, keeps UK products with complete macros, and
 * loads them into `foods` (verified=false, source='off_uk'). One pass gets the
 * whole UK catalogue. No 503s, no cursor, no page-by-page.
 *
 * ── 1. Download the dump ──────────────────────────────────────────────────────
 *   Open this link in your browser (it's ~1GB, give it a few minutes):
 *     https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 *   Leave it in your Downloads folder. (It's a gzipped tab-separated file — don't
 *   unzip it; the script reads it zipped.)
 *
 * ── 2. Prereqs ────────────────────────────────────────────────────────────────
 *   • foods_add_source.sql already run (the `source` column). Done.
 *   • Node 18+ (you have it).
 *
 * ── 3. Run ────────────────────────────────────────────────────────────────────
 *   One line, swap your service-role key in, and point it at the downloaded file:
 *
 *     cd ~/Documents/GitHub/fittrack-app && SUPABASE_URL="https://juvofqqtvakltlwqqhkn.supabase.co" SUPABASE_SERVICE_ROLE_KEY="KEY" node scripts/import_off_dump.mjs ~/Downloads/en.openfoodfacts.org.products.csv.gz
 *
 *   It wipes the old source='off_uk' rows and loads a fresh full set. Your
 *   hand-curated rows (source NULL) are never touched. Re-run after a future
 *   download to refresh. Takes a few minutes to stream the whole file.
 */

import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DUMP = process.argv[2];
const MIN_KCAL = Number(process.env.OFF_MINKCAL || 1);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!DUMP) {
  console.error(
    "Pass the path to the downloaded dump, e.g.\n  node scripts/import_off_dump.mjs ~/Downloads/en.openfoodfacts.org.products.csv.gz",
  );
  process.exit(1);
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clean = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();

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
  console.log(`Reading ${DUMP} …`);
  const rl = createInterface({
    input: createReadStream(DUMP).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let col = null; // header name → index
  const idx = {};
  const want = {
    code: "code",
    name: "product_name",
    brands: "brands",
    countriesTags: "countries_tags",
    countriesEn: "countries_en",
    cal: "energy-kcal_100g",
    protein: "proteins_100g",
    carbs: "carbohydrates_100g",
    fat: "fat_100g",
    fibre: "fiber_100g",
    servingSize: "serving_size",
    servingQty: "serving_quantity",
  };

  const rows = [];
  const seen = new Set();
  let scanned = 0;

  for await (const line of rl) {
    // First line = header. OFF dump is TAB-separated.
    if (col === null) {
      col = line.split("\t");
      for (const [k, name] of Object.entries(want)) {
        idx[k] = col.indexOf(name);
      }
      if (idx.name < 0 || idx.cal < 0) {
        console.error("Unexpected dump format (missing expected columns). Aborting.");
        process.exit(1);
      }
      continue;
    }
    scanned++;
    if (scanned % 200000 === 0) {
      console.log(`  …scanned ${scanned.toLocaleString()} rows, kept ${rows.length}`);
    }

    const f = line.split("\t");
    // UK only.
    const countries = (
      (idx.countriesTags >= 0 ? f[idx.countriesTags] : "") +
      " " +
      (idx.countriesEn >= 0 ? f[idx.countriesEn] : "")
    ).toLowerCase();
    if (!countries.includes("united-kingdom") && !countries.includes("united kingdom"))
      continue;

    const name = clean(f[idx.name]);
    if (name.length < 2 || name.length > 120) continue;

    const cal = num(f[idx.cal]);
    const protein = num(f[idx.protein]);
    const carbs = num(f[idx.carbs]);
    const fats = num(f[idx.fat]);
    if (cal == null || protein == null || carbs == null || fats == null) continue;
    if (cal < MIN_KCAL || cal > 900) continue;
    if (protein < 0 || carbs < 0 || fats < 0) continue;
    if (protein > 100 || carbs > 100 || fats > 100) continue;

    const brand = clean((f[idx.brands] || "").split(",")[0]) || null;
    const key = `${name.toLowerCase()}|${(brand || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fibre = idx.fibre >= 0 ? num(f[idx.fibre]) : null;
    let serving_g = idx.servingQty >= 0 ? num(f[idx.servingQty]) : null;
    const serving_desc = idx.servingSize >= 0 ? clean(f[idx.servingSize]) || null : null;
    if (serving_g == null && serving_desc) {
      const m = serving_desc.match(/([\d.]+)\s*(g|ml)/i);
      if (m) serving_g = num(m[1]);
    }

    rows.push({
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
    });
  }

  console.log(`Scan complete: ${scanned.toLocaleString()} rows scanned, ${rows.length} UK products kept.`);
  if (!rows.length) {
    console.error("Nothing kept — check the dump file path.");
    process.exit(1);
  }

  console.log("Deleting previous source='off_uk' rows…");
  await sb("foods?source=eq.off_uk", { method: "DELETE" });

  console.log(`Inserting ${rows.length} rows in batches of 500…`);
  for (let i = 0; i < rows.length; i += 500) {
    await sb("foods", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if ((i / 500) % 10 === 0 || i + 500 >= rows.length) {
      console.log(`  inserted ${Math.min(i + 500, rows.length)}/${rows.length}`);
    }
  }

  console.log(`Done. Loaded ${rows.length} UK products from the dump.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
