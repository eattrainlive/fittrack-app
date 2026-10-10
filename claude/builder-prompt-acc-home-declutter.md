# Builder brief — Accountability: declutter Home for programme members + fix card date

**Why:** Now that the programme card is on Home, an enrolled accountability member also sees the general
**"Your 3 habits for October"** card (`MemberGoalsCard`), which clashes with the programme — the
programme already manages their habits via the weekly stack. And the programme card shows "Starts 12
October" (the settings date) when Week 1 actually starts the 19th.

**Scope:** `src/pages/Index.tsx` + `src/components/AccountabilityCard.tsx`. Small, no SQL.

## 1. Hide the monthly-habits card for enrolled accountability members (`Index.tsx`)
- In `load()`, work out if the member is enrolled in the active cohort and store it in state:
  ```ts
  import { getActiveCohort, getMyClientRecord } from "@/lib/accountabilityProgramme";
  // ...
  const [accEnrolled, setAccEnrolled] = useState(false);
  // in load():
  const cohort = await getActiveCohort();
  if (cohort) {
    const client = await getMyClientRecord(cohort.id);
    setAccEnrolled(!!client);
  }
  ```
- Change the monthly-habits render so it does NOT show for enrolled members:
  ```tsx
  {showMemberGoals && !accEnrolled && <MemberGoalsCard />}
  ```
- Leave everything else on Home as-is (check-in code, programme card, progress/streak, up-next). The
  programme owns the habit experience for enrolled members; non-enrolled members keep `MemberGoalsCard`.

## 2. Make the programme card's date accurate for enrolled members (`AccountabilityCard.tsx`)
The card already fetches the active cohort (to detect enrolment). For **enrolled** members, build the
subtitle from the cohort (not the settings `startDate`):
```ts
import { getActiveCohort, getMyClientRecord, currentWeekOf } from "@/lib/accountabilityProgramme";
// keep the cohort you already fetch in state
```
- If enrolled and the cohort hasn't started: `Starts {formatDate(cohort.start_date)}` (→ 19 Oct).
- If enrolled and under way: `Week {currentWeekOf(cohort.start_date, cohort.weeks)} of {cohort.weeks}`.
- If enrolled and finished: `Programme complete`.
- Non-enrolled members: keep the existing `Starts {cfg.startDate}` marketing subtitle.

(No change to the "Open programme" button or navigation.)

## Acceptance
1. An enrolled member on Home sees the programme card but NOT the "Your 3 habits for [month]" card.
2. A non-enrolled member still sees `MemberGoalsCard` as before.
3. The programme card shows the real cohort date/week for enrolled members (e.g. "Starts 19 October",
   then "Week 1 of 6" once it begins) — not the settings "12 October".

**Deploy:** builder export → `scripts/merge-builder-export.py` → review → push.
