# Builder brief — Accountability stacked habit rings (C1; live by Mon 19 Oct)

**Why:** On the accountability dashboard the habit rings should reflect the programme's cumulative
stack — W1 plate + water (2), W2 + protein (3), W3 + steps (4), W4 + planned snacks (5), W5–6 hold 5 —
unlocking one step each week. Two problems to fix together:
1. **Pre-existing bug:** the dashboard queries `member_habits` and `habit_checkins` with columns that
   don't exist (`user_id`, `name`), so both silently return empty — the rings and their check-ins
   don't work at all today. (Real columns confirmed below.)
2. The rings aren't driven by the programme (`acc_week_habits`) yet.

**Scope:** fix the two queries, add an unlock helper, drive the rings from the programme stack. Only
the accountability dashboard + a small lib helper change. Don't touch onboarding, the final check-in,
Staff Hub / win-back, or the general app habit tracker.

## The real schema (use exactly these columns)
`member_habits`: `id` (bigint), `member_id` (uuid, = auth uid), `habit_id` (int → habits.id, nullable),
`habit_name` (text), `status` ('active'|'queued'|'graduated'), `position` (int), `started_at`,
`graduated_at`. Unique indexes: `(member_id, habit_id)` and `(member_id, habit_name)`.
`habit_checkins`: `id`, `member_id` (uuid), `habit_id` (int), `member_habit_id` (bigint →
member_habits.id), `date`, `done`, `count_value`. There is **no `user_id` and no `name`** on either.

`acc_week_habits`: `week_number`, `habit_id` (→ habits.id), `sort`. Seeded (after the content load) to
W1→101,102 · W2→1 · W3→103 · W4→104. The programme habits (ids 101–104) are `active=false` in the
`habits` library (hidden from member pickers) — they still join for their name fine.

## 1. Fix the dashboard data loads (`accDashboard/AccountabilityDashboard.tsx`)
In `load()`:
- `member_habits`: change the select/eq to the real columns:
  `supabase.from("member_habits").select("id, habit_id, habit_name, status").eq("member_id", user.id)`
- `habit_checkins`: `supabase.from("habit_checkins").select("date, habit_id, member_habit_id").eq("member_id", user.id)`
- Everywhere the ring/name uses `h.name`, use `h.habit_name`. (The ring object keeps `id` =
  member_habits.id and `habit_id`.)

(Apply the same `member_id`/`habit_name` fix in `src/lib/accPreviewData.ts` if it loads a real client's
member_habits with `user_id`/`name` — use the real columns there too.)

## 2. Unlock helper (`accountabilityProgramme.ts` — or a small `accWeekHabits.ts`)
Add `ensureAccHabitsUnlocked(currentWeek: number): Promise<void>`:
- Fetch the programme habits unlocked so far **with their names** (don't use getHabitLibrary — it
  filters out the inactive programme habits):
  `supabase.from("acc_week_habits").select("week_number, habit_id, sort, habits(name)").lte("week_number", currentWeek).order("sort")`
- Fetch the member's existing `member_habits` (`select id, habit_id`).`eq("member_id", uid)`.
- For each unlocked habit_id NOT already present, upsert using the **proven contract** (same shape the
  trial habit seeding uses, so it can't throw):
  ```ts
  await supabase.from("member_habits").upsert({
    member_id: uid,
    habit_id,
    habit_name: habits.name,     // from the join
    status: "active",
    position: sort,
    started_at: new Date().toISOString(),
  }, { onConflict: "member_id, habit_id" });
  ```
- Never remove/graduate. Idempotent — safe every load.
- Also export `getAccWeekHabitIds(currentWeek)` → ordered habit_ids unlocked so far (for §3).

(RLS already lets a member select/insert their own `member_habits` and read `acc_week_habits`.)

## 3. Drive the rings from the stack
- In `load()`, for a real enrolled client on an active week (1–6): `await ensureAccHabitsUnlocked(week)`
  BEFORE reading `member_habits`.
- Build the rings from the member_habits rows whose `habit_id` is in `getAccWeekHabitIds(week)`, in that
  order — not the member's whole habit list. Keep the existing ring UI, the optimistic daily toggle
  (it saves `{ member_habit_id: ring.id, date }` — unchanged), streaks and check-in matching.
- Tag a habit "New this week" on the week it unlocks (its `acc_week_habits.week_number === week`).
- **Preview/readOnly:** drive the rings from the preview week's unlocked set so coaches see the stack
  grow across weeks 1–6. Do NOT run the unlock (no real member to write to) in demo mode.

## Acceptance
1. A real client viewing the dashboard in **week 1** sees exactly the 2 week-1 rings (Balanced plate,
   Hit my water target) — and they render (names show), proving the query fix.
2. Week 2 → 3 rings (+ Protein, "New this week"); week 3 → 4 (+ step target); week 4 → 5 (+ snacks);
   weeks 5–6 → still 5.
3. Toggling a ring records today's check-in and it persists on reload (member_habit_id link works).
4. Idempotent — reopening doesn't duplicate member_habits rows.
5. Preview weeks 1→6 show the stack growing.
6. The programme habits do NOT appear in the normal app habit picker (they're active=false +
   getHabitLibrary filter — already shipped).

**Deploy:** SQL already done (content load seeded acc_week_habits). Screens via builder export →
`scripts/merge-builder-export.py` → review → push.
