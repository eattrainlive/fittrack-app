# Builder brief — consolidated "Trials" hub

Pull the trialist tooling that's currently scattered across the members section + Staff Hub into ONE
designated place: a "Trials" tab Carla works everything from. Do NOT rebuild the logic — just bring
the existing pieces together under one tabbed shell and keep them wired to their existing data.

## What exists today (reuse, don't rewrite)
- `src/components/TrialNurtureCockpit.tsx` — the nurture cockpit (Due now / Upcoming / Joined), already
  upgraded to show per-trial-type steps, activity breakdown and situational flags. KEEP as-is.
- `src/components/CurrentTrialistsBoard.tsx` / `src/components/TrialistPipeline.tsx` — trialist buckets
  / pipeline.
- `src/components/TrialHubSettings.tsx` — trial hub settings.
- Review-window filtering currently lives in the members section (trialStages / `src/lib/trialHub.ts`,
  `src/lib/trialStages.ts`). Surface the same review-window view here.
- `src/components/StaffHubCallLists.tsx` currently hosts a "Trial Nurture" tab — move/replace that entry
  point with the new hub (or make the hub the home for it).

## The hub shell
A single "Trials" surface (new component `TrialsHub.tsx`) with sub-tabs:
1. **Nurture** → `<TrialNurtureCockpit />` (default tab).
2. **Trialists** → `CurrentTrialistsBoard` / `TrialistPipeline` (the buckets).
3. **Reviews** → the review-window list (reuse the members-section review-window logic / trialStages).
4. **Settings** → `TrialHubSettings`.

Keep each sub-component's own data loading; the shell is just tabs + layout. Match the existing
Staff-Hub tab styling (same Button pill pattern as AccountabilityCoachPanel / StaffHubCallLists).

## Entry point
Add "Trials" to wherever the Staff Hub / coach navigation lists its sections (same place the current
"Trial Nurture" tab is reached). Replace the standalone "Trial Nurture" entry with this hub so there's
one door in. Staff-only (same gating as the current cockpit).

## Notes
- `src/lib/trialNurture.ts` is a protected direct-edit file — don't regenerate it. The cockpit already
  consumes its new fields (trialType, trialLength, activity{classes,scans,workouts}, firstSessionAt,
  and flags.{noSessionBooked,firstSessionDone,goneQuiet,frequencyDrop,reviewNotBooked}).
- No new tables. Review-window data uses the existing trialStages/trialHub source.
- Later (separate): a 21-day Kickstart message set (Carla) + its GHL templates (trial_k21_* keys).
