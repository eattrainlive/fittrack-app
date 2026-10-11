# Catch-up prompt — paste into the builder (TodayHabitsCard done-match fix)

`TodayHabitsCard.tsx` matched a check-in to a habit with `c.habit_id === h.id`, but `h.id` is the
**member_habit row id** and `c.habit_id` is the **habit id** — different domains, so that branch never
matched and check-ins stored only by `habit_id` (from other surfaces) weren't recognised. Also it saved
check-ins with `habit_id: null`, which stopped the dashboard rings from seeing them when they match by
habit_id.

Keep this corrected logic:

```ts
const matches = (c: CheckinRow, h: ActiveHabit) =>
  c.date.slice(0, 10) === today &&
  ((c.member_habit_id != null && c.member_habit_id === h.id) ||
    (h.habit_id != null && c.habit_id === h.habit_id));

const isDoneToday = (h: ActiveHabit) => checkins.some((c) => matches(c, h));
```

- Optimistic remove uses `prev.filter((c) => !matches(c, h))`.
- Optimistic add stores the real habit id: `{ date: today, habit_id: h.habit_id, member_habit_id: h.id }`.
- Save payload includes both ids: `{ member_habit_id: h.id, habit_id: h.habit_id, date: today }`
  (saveHabitCheckin still conflicts on member_habit_id since it's present; delete still deletes by it).

This makes the card's check-ins sync both ways with the dashboard rings.

---

## Also keep: unlock the programme stack on the home card (no lag)

Programme habits only enter `member_habits` via `ensureAccHabitsUnlocked`, which the dashboard runs on its
load. So the home card lagged the programme by one dashboard visit at each week rollover. In
`TodayHabitsCard.load()`, before reading `member_habits`, unlock the current week's stack for enrolled
members (idempotent, best-effort; personal habits untouched and still shown):

```ts
import {
  getActiveCohort,
  getMyClientRecord,
  currentWeekOf,
} from "@/lib/accountabilityProgramme";
import { ensureAccHabitsUnlocked } from "@/lib/accWeekHabits";

// …inside load(), after resolving `user` and `today`, before the member_habits query:
try {
  const cohort = await getActiveCohort();
  if (cohort) {
    const client = await getMyClientRecord(cohort.id);
    if (client) {
      const week = currentWeekOf(cohort.start_date, cohort.weeks);
      if (week >= 1 && week <= cohort.weeks) {
        await ensureAccHabitsUnlocked(week);
      }
    }
  }
} catch {
  /* best-effort — never block the habit list on this */
}
```

The card intentionally shows ALL active habits (programme + the member's own) — do not filter to
programme-only.
