# Builder brief — redesign the Trial Nurture cockpit as a compact ranked list

Rebuild the "Nurture" view (`src/components/TrialNurtureCockpit.tsx`, rendered inside TrialsHub) so it
reads like the clean trialists pipeline, NOT a stack of heavy message cards. One tight row per
trialist; the message + send only appear when you tap a row open. Keep the existing engine + send
logic — this is purely a presentation rebuild. Do NOT edit `src/lib/trialNurture.ts` (protected); it
already provides every field below.

## Keep
- The top filter pills: Due now / In the drip / Joined (existing dueNow / upcoming / joined lists).
- `sendStep(...)`, template selection via `stepsForType(t.trialType)`, coach-note box, Activity modal —
  all exactly as they work now, just moved into the expanded row.

## The list (Due now)
Group rows by urgency, in this order, each a small header:
  1. Overdue   (t.nextStep.state === "overdue")
  2. Due today (t.nextStep.state === "due")
  3. (In the drip tab handles upcoming)
Within each group, sort by CONVERSION IMPACT (highest first), using a score like:
  - +100 decision step (key `decision` / `k21_decision`)
  - +80  convert steps (`ending_soon`,`k21_ending`,`results_nudge`,`k21_review`,`halfway`,`k21_mid`,`k21_pt_offer`)
  - +60  flags.hotLead
  - +50  flags.reviewNotBooked
  - +40  flags.noSessionBooked || flags.neverAttended
  - +30  flags.goneQuiet || flags.noShow || flags.frequencyDrop
Left-border colour by tier: score ≥80 red (`#A32D2D`), ≥40 amber (`#BA7517`), else blue/grey.

## Collapsed row (the default)
Compact, ~3 lines, no message text:
- Line 1: name (left) · `D{trialDay}/{trialLength}` (right, muted).
- Line 2: `t.nextStep.step.label` + a state chip (overdue/due) + the 1–2 HIGHEST-priority flag chips
  (reuse the chip styles already in the cockpit: Hot lead, Review not booked, No session booked,
  Gone quiet Nd, Under 2/wk, 1st session done).
- Line 3 (muted, 11px): activity one-liner — `{activity.classes} classes · {activity.scans} scans ·
  {activity.workouts} workouts` + `· 1st session {firstSessionAt date}` when present.
Tapping the row toggles it open (chevron).

## Expanded row (on tap)
Reveal in place (don't navigate): the template dropdown (stepsForType), the fixed template-copy
preview with the coach note slotted in, the "Add a personal note…" input, a primary Send button, and
an Activity button — i.e. the current card's send area, shown only for the opened row. Collapse others
when one opens (accordion) to keep it clean.

## Notes
- All data is on `NurtureTrialist`: name, email, trialDay, trialType, trialLength, nextStep{step,state},
  flags{hotLead,noShow,neverAttended,noSessionBooked,firstSessionDone,goneQuiet,frequencyDrop,reviewNotBooked},
  activity{classes,scans,workouts}, firstSessionAt, daysSinceVisit.
- Mobile + desktop: single-column list both; rows full-width.
- This replaces the always-open card layout. Density target: the trialists pipeline cards.
