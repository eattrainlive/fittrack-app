// Netlify Function: off-search  (ESM — project uses "type":"module")
// Proxies food searches to Open Food Facts from the server so we can send a
// descriptive User-Agent (OFF rate-limits / blocks anonymous browser traffic).
//
// Open Food Facts' simple text search only matches the product NAME, so a
// brand-only term (e.g. "per4m") finds nothing while "per4m whey" works. To fix
// that we run the name search AND a brand search in parallel and merge the two —
// so brand-only, product-only and "brand + product" queries all return results.
//
// Usage: GET /.netlify/functions/off-search?q=per4m
// Returns: { products: [...] }

const FIELDS =
  "code,product_name,brands,nutriments,serving_size,serving_quantity,image_small_url";
const UA = "ETL-FitTrack/1.0 (michael@eattrainlivesmart.co.uk)";
const BASE = "https://world.openfoodfacts.org/cgi/search.pl";

const H = { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" };
const reply = (code, obj) => ({ statusCode: code, headers: H, body: JSON.stringify(obj) });

async function offFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);
    const d = await res.json();
    return d?.products || [];
  } catch (e) {
    return [];
  } finally {
    clearTimeout(t);
  }
}

export const handler = async (event) => {
  const q = String(event.queryStringParameters?.q || "").trim();
  if (q.length < 2) return reply(200, { products: [] });
  const term = encodeURIComponent(q);
  const common = `search_simple=1&json=1&page_size=20&sort_by=popularity_key&fields=${FIELDS}`;

  // (a) Name search, biased to UK products.
  const nameUK = `${BASE}?search_terms=${term}&${common}&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`;
  // (b) Name search, global.
  const nameAll = `${BASE}?search_terms=${term}&${common}`;
  // (c) Brand search (matches products whose BRAND contains the term).
  const brand = `${BASE}?${common}&tagtype_0=brands&tag_contains_0=contains&tag_0=${term}`;

  // Run name(UK) + brand together first (covers most queries).
  let [a, c] = await Promise.all([offFetch(nameUK), offFetch(brand)]);
  let merged = dedupe([...a, ...c]);
  // If thin, broaden with the global name search.
  if (merged.length < 5) {
    const b = await offFetch(nameAll);
    merged = dedupe([...merged, ...b]);
  }
  return reply(200, { products: merged.slice(0, 20) });
};

function dedupe(products) {
  const seen = new Set();
  const out = [];
  for (const p of products) {
    if (!p || !p.product_name) continue;
    const key =
      p.code ||
      `${String(p.product_name).toLowerCase()}|${String(p.brands || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
