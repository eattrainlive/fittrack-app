# Trials → History tab — live KPI-sheet sync

The History tab reads the **"Trial Conversions"** tab of the **2026 KPIs** Google Sheet live, so
every month (Jan onward) shows real data: who trialled, what trial, whether they converted and onto
what, plus lead source. It mirrors the sheet rather than the app's own `trial_cohort`.

## How it works
- Frontend: `src/components/TrialHistory.tsx` → `src/lib/trialHistory.ts` calls
  `/.netlify/functions/trial-history` (staff-auth, same pattern as `trial-nurture`).
- Proxy: `netlify/functions/trial-history.js` fetches the sheet's public **gviz CSV** endpoint
  server-side (avoids CORS, keeps the sheet id off the client) and returns parsed JSON.
- It reads the `Trial Conversions` tab, whose columns are:
  `Month · First name · Last name · Email · Trial start · Trial type · Trial category ·
   Converted? · Converted onto · Onto category · Conversion date · Source`.

## One-time setup

1. **Sheet sharing** — the gviz endpoint needs the sheet readable without a login. In the 2026 KPIs
   sheet: **Share → General access → "Anyone with the link" → Viewer**. (It's trial/marketing data,
   no card or health info, so link-view is fine. If you'd rather keep it fully private, say so and
   I'll switch the proxy to a Google service-account read instead.)

2. **Netlify env vars** (Site settings → Environment variables) — optional, there are sensible
   fallbacks baked in:
   - `KPI_SHEET_ID` — defaults to the current 2026 KPIs id. Set it when you roll over to a new
     year's sheet.
   - `KPI_TRIALS_TAB` — defaults to `Trial Conversions`. Only set it if you rename the tab.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — already set (used by the other proxies) to verify
     the staff token.

3. Deploy (push to `main` — Netlify auto-deploys the function).

## Keeping it working
- The proxy keys off the **header row** (it finds the row containing an "Email" cell), so inserting
  rows above the header is fine, but keep the column headers named roughly as above.
- New months appear automatically as you add rows with that month in the `Month` column.
- Each January, point `KPI_SHEET_ID` at the new year's sheet (or keep all years in one sheet and the
  month tabs will just keep growing).
