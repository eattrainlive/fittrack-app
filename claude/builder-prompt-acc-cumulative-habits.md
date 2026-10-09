# Builder brief — Accountability cumulative habit stack (follow-on; live by Mon 19 Oct)

**Why:** On the accountability dashboard the habit rings currently come from the member's own
`member_habits` and are NOT driven by the programme. The programme stacks habits as the weeks progress
— W1 plate + water (2), W2 adds protein (3), W3 adds steps (4), W4 adds planned snacks (5), W5–6 hold
all 5. This brief makes the rings reflect that stack. Needs to be live before the stack diverges
(≈ W2–3), so by the 19th.

**Scope:** one SQL (already provided), one small lib helper, one dashboard change. Nothing else in the
accountability area changes. The onboarding launch brief is separate and comes first.

> SQL (run in Supabase first): `supabase/sql/acc_week_habits.sql` — creates `acc_week_habits`
> (week_number → habit_id from the existing `habits` library) and seeds the default stack. Michael
> confirms the habit mapping.

## 1. Unlock helper (`accountabilityProgramme.ts` or a small `accWeekHabits.ts`)
Add `ensureAccHabitsUnlocked(currentWeek: number): Promise<void>`:
- Read `acc_week_habits` where `week_number <= currentWeek` → the set of `habit_id`s that should be
  unlocked.
- Read the current user's `member_habits` → the `habit_id`s they already have.
- For each should-have habit_id NOT already present, insert a `member_habits` row:
  `{ member_id: <auth uid>, habit_id, status: 'active', position: <next>, started_at: now() }`.
- Never remove or graduate anything. Idempotent — safe to call on every dashboard load.
- Also expose `getAccWeekHabitIds(currentWeek)` → the ordered list of unlocked programme habit_ids
  (for filtering the rings in §2).

(RLS already lets a member insert/select their own `member_habits`, and read `acc_week_habits`.)

## 2. Dashboard rings reflect the stack (`accDashboard/AccountabilityDashboard.tsx`)
- In `load()`, for a real enrolled client on an active week (1–6): `await ensureAccHabitsUnlocked(week)`
  BEFORE reading `member_habits`, so the newly-unlocked habits are present when rings build.
- Build the habit rings from the **unlocked programme habits** for the current week
  (`getAccWeekHabitIds(week)`), in that order — not the member's full personal habit list. Keep the
  existing ring UI, the optimistic daily toggle (`saveHabitCheckin`/`deleteHabitCheckin`), streaks and
  check-in matching exactly as they are; only the SOURCE/order of which habits show changes.
- A newly unlocked habit shows a subtle "New this week" tag on the week it unlocks.
- Preview/readOnly mode: drive the rings from the preview week's unlocked set so coaches can see the
  stack grow across weeks 1–6.
- Do NOT run the unlock in preview/demo mode (no real member to write to) — only for a real client.

## 3. Leave the main app home alone
These programme habits will also appear on the member's normal home habit tracker (they're real
`member_habits` now). That's intended — the programme habits become their daily habits everywhere.
Don't add filtering to hide them elsewhere.

## Acceptance
1. Run the SQL. A client viewing the dashboard in **week 1** sees exactly the 2 week-1 habits as rings.
2. Same client in **week 2** sees 3 (protein added, tagged "New this week"); week 3 → 4; week 4 → 5;
   weeks 5–6 → still 5.
3. Toggling a ring still records today's check-in (unchanged behaviour); streaks still compute.
4. The unlock is idempotent — reopening the dashboard doesn't create duplicate `member_habits`.
5. Preview as weeks 1→6 shows the stack growing.

**Deploy:** SQL in Supabase → screens via builder export → `scripts/merge-builder-export.py` → review
→ push. No secrets in client code.
