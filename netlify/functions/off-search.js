// Netlify Function: off-search  (ESM — project uses "type":"module")
// Proxies food searches to Open Food Facts from the server so we can send a
// descriptive User-Agent (OFF rate-limits / blocks anonymous browser traffic,
// which is why the in-app Quick Add search returned nothing). Also sidesteps any
// CORS flakiness. Public endpoint — the food DB is not sensitive.
//
// Usage: GET /.netlify/functions/off-search?q=hovis
// Returns: { products: [...] } with the fields the client needs.

const FIELDS = "product_name,brands,nutriments,serving_size,image_small_url";
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

  const v2 = `https://world.openfoodfacts.org/api/v2/search?search_terms=${term}&fields=${FIELDS}&page_size=20`;
  const cgi = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${term}&search_simple=1&json=1&page_size=20&fields=${FIELDS}`;

  try {
    const data = await offFetch(v2);
    if (data?.products?.length) return reply(200, { products: data.products });
    const data2 = await offFetch(cgi);
    return reply(200, { products: data2?.products || [] });
  } catch (e) {
    try {
      const data2 = await offFetch(cgi);
      return reply(200, { products: data2?.products || [] });
    } catch (e2) {
      return reply(200, { products: [], error: String(e2) });
    }
  }
};
