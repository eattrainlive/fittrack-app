# Catch-up prompt — paste into the builder (onboarding "Save failed — retry")

**Bug:** Completing accountability onboarding triggered the app-wide "Save failed — retry" sync
indicator. Cause: onboarding called `saveBodyweight` with a bare number, but `saveBodyweight(data)`
spreads `data` into the row (`{ user_id, date, ...data }`). Spreading a number yields no properties, so
the `weight` column was never set — the `bodyweight_history` upsert failed and went to the error/retry
queue. Everywhere else (trial goals) calls it correctly with an object.

**File:** `src/components/AccountabilityOnboarding.tsx`

**Fix (applied):**
```ts
const { saveBodyweight } = await import("@/lib/store");
await saveBodyweight({ weight: Number(f.q10) });   // was: saveBodyweight(Number(f.q10))
```

That's the whole change — no schema, no other files.

> Note (not a code change): the baseline photos showed as broken images. The upload + render code is
> correct and the `media` bucket is public-read for the whole bucket, so this is environmental — see the
> diagnostic in chat (confirm `media_bucket_setup.sql` has been run and that the image URL opens in a new
> tab). Don't change the photo code based on this.
