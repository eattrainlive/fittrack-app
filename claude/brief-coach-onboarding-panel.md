# Builder brief — Coach-side onboarding + calorie setup (do a client's onboarding for them)

Let a coach complete a client's 6-Week Accountability onboarding — and set their calories/protein/
steps — from the coach side (the accountability check-in / client view), looking like the client's
own onboarding form. For clients who won't fill it in themselves, the coach just does it with them.

## Why it's mostly done already
- Every save function is **client-id based**, not tied to the logged-in user:
  `saveMyOnboarding(clientId, payload)`, `completeMyOnboarding(clientId)`,
  `setTrackingTargets(clientId, { calorie_target, protein_target })`,
  `setNutritionApproach(clientId, approach)`, `setStepTarget(clientId, n)`,
  `setTrackingApp(clientId, …)`, `setOnboardingDone(clientId, done)` — all in
  `src/lib/accountabilityProgramme.ts`.
- **RLS already allows staff to write any client's `acc_clients` row** (`acc_clients_own`:
  `using (auth.uid() = user_id OR public.is_staff())`), so these all work when a coach runs them.
- `AccountabilityOnboarding.tsx` already takes a `client` prop and saves via
  `saveMyOnboarding(client.id, …)` — i.e. it's already parameterised by client, not the current user.

So this is a UI integration, not new plumbing.

## What to build
In the coach's per-client accountability view (the check-in inbox → open a client, i.e. where
`AccountabilityClientConsole` / the coach client panel renders — reuse whatever opens a single
client), add a **"Set up onboarding"** action/section for the coach that:

1. Opens the **same onboarding form** the client sees (reuse `AccountabilityOnboarding`), wired to the
   **selected client** (`client={thatClient}`), in a **coach mode** — so the heading reads e.g.
   "Onboarding — {client name}" and the copy is coach-facing ("Set their why…", "Their baseline…")
   rather than "your". Visually keep it the SAME layout as the client form so it's familiar.
2. Includes the **nutrition targets** step prominently — calories + protein (`setTrackingTargets`),
   nutrition approach (`setNutritionApproach`), step target (`setStepTarget`) — since a key reason for
   this is the coach setting calories.
3. On save, writes to that client's record (the existing functions do this) and flips
   `onboarding_done` / `onboarding_completed_at` via the normal completion path, so the client's own
   dashboard then shows onboarding complete.

## Notes / gotchas
- **Photos:** the client onboarding's 5-item minimum includes baseline photos (front/side/back). A
  coach doing it in person may not have the client's photos to hand — make the photo steps **optional
  in coach mode** (don't hard-block completion on them), but still allow upload if the coach has them.
  Everything else (why, weight, measurements, steps, nutrition approach, calories) the coach can fill.
- **Don't duplicate logic** — reuse `AccountabilityOnboarding` and the existing `set*`/`saveMyOnboarding`
  functions; just pass the target client and relabel for the coach voice. No new save paths, no SQL.
- Staff-gated (it's in the coach area already).
- After the coach completes it, the client's profile/activity should reflect the set calories + goals
  (they already read from `acc_clients`).

## Acceptance
A coach opens a client in the accountability area → "Set up onboarding" → fills the same form incl.
calories/protein → saves → the client's `acc_clients` row has the onboarding + targets, their own
dashboard shows onboarding complete, and the activity card shows the calories.
