# Catch-up prompt — paste into the AI builder

Critical fix: `saveCheckin` in `src/lib/accountabilityCheckins.ts` was writing `user_id` and
`cohort_id` to `acc_checkins`, but that table has NEITHER column (it keys on `client_id` only). The
whole upsert errored, so weekly AND final check-ins couldn't save. Remove those two fields:

```ts
const { error } = await supabase.from("acc_checkins").upsert(
  {
    client_id: payload.clientId,
    week_number: payload.weekNumber,
    responses: payload.responses,
    avg_weight: payload.avgWeight ?? null,
    avg_steps: payload.avgSteps ?? null,
    submitted_at: new Date().toISOString(),
  },
  { onConflict: "client_id,week_number" },
);
```

(Keep the `CheckinPayload` type as-is — callers still pass `userId`/`cohortId`; we just don't write
them to the table.)
