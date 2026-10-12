# Catch-up prompt — paste into the builder (keep the activity-card no-data guards)

The member activity card crashes for people with **no app data** (reach-out / lapsed / invited contacts
opened from the call lists) because the progress-summary comes back without number fields or `prs`. These
guards keep getting reverted on export — keep them.

## `src/components/MemberActivityModal.tsx`
Normalise the summary so missing fields default to 0 / `[]`:
```ts
const s: any = summary
  ? {
      coachedUsed: 0, coachedTotal: 0, coachedUpcoming: 0,
      classesCount: 0, gymVisits: 0, gymScansTotal: 0,
      totalVolumeKg: 0, loggedSessions: 0, activitiesCount: 0,
      bestStreak: 0, totalCheckins: 0, daysLogged: 0,
      sessionsPerWeekActual: 0, prs: [],
      ...(summary as any),
    }
  : null;
```
And guard the arrays everywhere they're used: `(s.prs?.length ?? 0) > 0`, `(s.prs ?? []).map(...)`,
`(act.months ?? []).map(...)`.

## `src/components/CoachTrialReviewModal.tsx`
Same `prs` guards: `(s.prs?.length ?? 0) > 0` (both the flag check and the render), and
`(s.prs ?? []).map(...)`.

Without these, opening a profile for anyone who hasn't used the app throws
`undefined is not an object (reading 'toLocaleString')` / `'prs'`.
