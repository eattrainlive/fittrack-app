# Catch-up prompt — paste into the builder (keeps it in step with the repo)

Your call-list screens are good and I've merged them. One small security fix I made in the repo — please apply the same change in the builder so a future export doesn't undo it.

In `src/lib/staffHubMetrics.ts`, the `setCachedMetrics` function currently caches the whole response to localStorage, which would persist member names and emails. Member PII must never be written to localStorage — only the (non-personal) numbers.

Change `setCachedMetrics` to cache metrics only, dropping the PII lists:

```ts
// Cache WITHOUT the PII lists — names/emails must never be persisted to localStorage.
function setCachedMetrics(res: StaffHubResponse) {
  try {
    const safe: StaffHubResponse = {
      ok: res.ok,
      generated: res.generated,
      trusted: res.trusted,
      month_name: res.month_name,
      metrics: res.metrics,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(safe));
  } catch {
    /* ignore */
  }
}
```

Everything else in your version is fine — keep it as is. Don't change any backend, the Netlify function, or anything under `supabase/` or `netlify/`.
