// Netlify Function: off-search  (ESM — project uses "type":"module")
// Proxies food searches to Open Food Facts from the server so we can send a
// descriptive User-Agent (OFF rate-limits / blocks anonymous browser traffic,
// which is why the in-app Quick Add search returned nothing). Also sidesteps any
// CORS flakiness. Public endpoint — the food DB is not sensitive.
//
// Usage: GET /.netlify/functions/off-search?q=hovis
// Returns: { products: [...] } with the fields the client needs.

const FIELDS =
  "product_name,brands,nutriments,serving_size,serving_quantity,image_small_url";
const UA = "ETL-FitTrack/1.0 (michael@eattrainlivesmart.co.uk)";

const H = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300",
};
const reply = (code, obj) => ({
  statusCode: code,
  headers: H,
  body: JSON.stringify(obj),
});

async function offFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OFF HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export const handler = async (event) => {
  const q = String(event.queryStringParameters?.q || "").trim();
  if (q.length < 2) return reply(200, { products: [] });
  const term = encodeURIComponent(q);

  // Legacy cgi search does proper full-text relevance ranking (the v2 API does
  // not rank by the query, which was returning random products). Sort by
  // popularity and bias toward UK products so British brands surface first.
  const cgiUK =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${term}` +
    `&search_simple=1&json=1&page_size=20&sort_by=popularity_key&fields=${FIELDS}` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`;
  const cgi =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${term}` +
    `&search_simple=1&json=1&page_size=20&sort_by=popularity_key&fields=${FIELDS}`;

  const tryUrl = async (url) => {
    const d = await offFetch(url);
    return d?.products?.length ? d.products : null;
  };

  try {
    // 1) UK-biased relevance search.
    const uk = await tryUrl(cgiUK);
    if (uk) return reply(200, { products: uk });
    // 2) Global relevance search (no country filter).
    const all = await tryUrl(cgi);
    return reply(200, { products: all || [] });
  } catch (e) {
    try {
      const all = await tryUrl(cgi);
      return reply(200, { products: all || [] });
    } catch (e2) {
      return reply(200, { products: [], error: String(e2) });
    }
  }
};
