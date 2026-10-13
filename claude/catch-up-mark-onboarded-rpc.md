# Catch-up prompt — paste into the builder (onboarded_at / "on app" fix)

**Bug:** Trialists (and any newer sign-ups) showed as "not on app" forever. "On app" =
`members.onboarded_at` present, but `markOnboarded` did a direct `update members set onboarded_at…` which
is **blocked by RLS** (members have a SELECT-only policy) — it silently updated 0 rows, so onboarded_at
never got set.

**Fix (keep both):**

1. SQL `supabase/sql/mark_onboarded_fix.sql` (Michael runs) — a SECURITY DEFINER RPC `mark_onboarded()`
   that stamps the caller's own `onboarded_at` (when null), + a one-time backfill for anyone who's signed
   in.

2. `src/lib/onboarding.ts` — `markOnboarded` must call the RPC, NOT a direct update:
   ```ts
   const { error: rpcErr } = await supabase.rpc("mark_onboarded");
   if (rpcErr) console.warn("[onboarded] mark_onboarded rpc failed:", rpcErr.message);
   ```
   Do not revert to `supabase.from("members").update({ onboarded_at })` — RLS blocks it.
