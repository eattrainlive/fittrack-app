# Builder brief — Accountability weekly check-in upgrades (C2; live by Sun 25 Oct)

Upgrades the weekly check-in (`WeeklyCheckin.tsx`), the dashboard Steps card, and the coach console.
The week-specific question data is already seeded (`acc_week_content.checkin_addon`). Don't touch the
final (week-6) check-in, onboarding, or anything outside accountability.

> NOTE: a critical check-in bug was already fixed in the repo — `saveCheckin` was writing `user_id`
> and `cohort_id`, which don't exist on `acc_checkins` (it keys on `client_id` only), so every
> submission errored. The catch-up for that is separate; this brief builds on the fixed `saveCheckin`.

## 1. New question — average daily steps (`WeeklyCheckin.tsx`)
- Add a question "Your average daily steps this week" — a **number input** (manual; no step sync).
- On submit, pass it as `avgSteps` to `saveCheckin` (the param already exists → `acc_checkins.avg_steps`):
  ```ts
  await saveCheckin({ clientId, userId: user.id, cohortId, weekNumber: week, responses,
                      avgSteps: Number(f.avgSteps) || null, avgWeight });
  ```
  (userId/cohortId are still accepted by the payload type; saveCheckin just doesn't write them now.)

## 2. Computed average weight (no new question)
- Compute the member's average bodyweight for THIS programme week from `bodyweight_history`:
  - Week window: `start = cohort.start_date + (week-1)*7 days`, `end = start + 7 days`.
  - `supabase.from("bodyweight_history").select("date, weight").eq("user_id", user.id)` then average the
    entries with `date` in `[start, end)`. If none, `avgWeight = null`.
- Pass as `avgWeight` to `saveCheckin` (→ `acc_checkins.avg_weight`). Display nothing new to the member.

## 3. Week-specific question (`acc_week_content.checkin_addon`)
- Load the current week's content (`getWeekContent(week)` — it returns `checkin_addon`). Add
  `checkin_addon?: string | null` to the `AccWeekContent` interface in `src/lib/accWeekContent.ts`.
- If `checkin_addon` is set, show it as a question near the END of the check-in (before "anything you
  want help with"). Store BOTH the question text and the answer in `responses` so the coach sees them:
  `responses.weekQ = content.checkin_addon; responses.weekA = <answer>`.

## 4. Copy fixes (`WeeklyCheckin.tsx`)
- **Q2** currently names "plate / protein / water / steps / this week's new habit" from Week 1, which
  is wrong early on. Change to: **"How consistently did you hit your habits this week?"** and, under it,
  list ONLY the habits unlocked so far — use `getAccWeekHabits(week)` from `@/lib/accWeekHabits` and
  render their names (e.g. "Balanced plate · Hit my water target"). 0–5 scale unchanged.
- **Q8** references the SOS plan, which doesn't exist until Week 3. For **weeks 1–2**, show:
  **"What might trip you up next week, and what will you do about it?"** For **weeks 3+**, keep the
  current SOS-plan wording.
- **Q10 photo**: make the photo **optional** in weeks 1, 2, 4, 5 (keep the "how are you feeling about
  progress" text question). In **Week 3**, prompt specifically for the **midpoint photo**: "Your
  midpoint photo — same spot and pose as day 0 (private, just for you)."

## 5. Dashboard Steps card (`accDashboard/Sections.tsx` `StepsCard` + its use in `AccountabilityDashboard.tsx`)
- It currently shows `step_target || 8000` with a static full bar and the text "Log steps in your daily
  check-ins" (there's nowhere to do that). Instead:
  - Show the real **step target** and **last week's average** (`avg_steps` from the most recent
    submitted `acc_checkins` for this client). The dashboard already loads checkins — pass the latest
    `avg_steps` into `StepsCard`.
  - Change the helper text to **"Log your average steps in your Sunday check-in."**
  - If there's no step target yet (set in Week 3), show "Target set in Week 3" rather than a hardcoded
    8,000 bar.

## 6. Coach console (`AccountabilityClientConsole.tsx` `CheckinCard`)
- Add to each check-in card: the **week question + answer** (`r.weekQ` / `r.weekA`) when present, and
  **avg steps** (`checkin.avg_steps`) and **avg weight** (`checkin.avg_weight`) when present. Keep the
  existing win / "in the way" lines. (Add `avg_steps`/`avg_weight` to the `AccCheckin` type if needed.)

## Acceptance
1. A weekly check-in now **saves successfully** (the user_id/cohort_id fix) and records avg steps + the
   computed avg weight.
2. Q2 lists only the habits unlocked up to that week; Q8 has no SOS reference in weeks 1–2; Week 3 asks
   for the midpoint photo; photo optional in weeks 1/2/4/5.
3. The week-specific question shows (when authored) and its Q+A appears in the coach console.
4. The Steps card shows the real target + last week's average, with the corrected helper text.

**Deploy:** builder export → `scripts/merge-builder-export.py` → review → push.
