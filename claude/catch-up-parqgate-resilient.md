# Catch-up prompt — paste into the builder (make ParqGate resilient — it was hanging the app)

`ParqGate` blocked first paint behind `getUser()` + a PAR-Q query AND re-ran on **every navigation**, so
any Supabase slowness froze the whole app on the loading spinner. Keep this resilient version of
`src/components/ParqGate.tsx`:

- Run the PAR-Q check **once** (effect dep is `[reloadTick]` only — NOT `pathname`). Navigation must not
  re-query.
- **Cache** the valid result in `localStorage` keyed by uid until the PAR-Q `expiresAt`, so reloads skip
  the query (`etl_parq_ok_until:<uid>`).
- Wrap `supabase.auth.getUser()` and `getMyParqStatus()` in a **4s timeout** (Promise.race).
- On **timeout or any error → fail OPEN** (render the app). Never leave the app stuck on the gate spinner.
- Staff (`isStaff()`) and the allowed routes (`/auth`, `/reset-password`, `/checkin`, `/tv/`) still bypass.
- After a successful submit, bump `reloadTick` to re-check (which then caches valid).

The full file is in the repo — don't revert to the version that re-checks on every `pathname` change or
that blocks without a timeout.
