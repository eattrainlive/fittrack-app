# Builder brief — Accountability onboarding (must be live Mon 12 Oct)

**Why:** Onboarding invites for the 19 Oct cohort go out Monday 12 Oct. Right now every onboarding
section is skippable, so clients can finish without baseline photos or a "why". We need both for
coaching and the week-6 before/afters. Some clients also join after 19 Oct, and today the onboarding
prompt only shows before the start date, so late joiners never see it.

**Scope:** 4 changes. SQL already run. Nothing else in the accountability area should change.

> SQL already applied (for reference): added `acc_clients.onboarding_completed_at timestamptz` and
> moved the cohort start to 2026-10-19. The existing `acc_clients.onboarding_done` (boolean) stays as
> the legacy flag — see §3 for how the two relate. Do NOT repurpose `onboarding_done` for the 5-item
> rule.

---

## 1. Required minimum in onboarding (`AccountabilityOnboarding.tsx`)
Keep all 8 sections and the ~42 questions. Keep everything skippable **except these five**:

| # | Required item | Stored in |
|---|---|---|
| 1 | One-sentence "why" | `acc_clients.why` (as now) |
| 2 | Baseline photos: front AND side | baseline photos (as now) |
| 3 | Current weight + 3 measurements (waist, hips, chest — or whichever 3 the form already uses) | `baseline` JSON (weight also mirrors to bodyweight history, as now) |
| 4 | Current average daily steps (number) | `baseline` JSON as `avg_steps_baseline`. Do NOT set `step_target` yet; that happens in week 3 |
| 5 | Nutrition approach: plate or tracking | `acc_clients.nutrition_approach` (as now) |

Behaviour:
- Show a small **"Needed to start (x/5)"** checklist at the top of the dialog. Ticks update live.
- Clients can save and close part-way without losing answers (save progress per section if it doesn't
  already).
- Submit is allowed with missing items, but shows which are still missing and says the coach needs
  them before day 1.
- When all five are present, set `onboarding_completed_at = now()` (only if it's currently empty).
- Add one helper in `accountabilityProgramme.ts`: **`onboardingStatus(client)` →
  `{ complete: boolean, done: number, missing: string[] }`**. This is the single source of truth for
  the rule — use it in §2, §3, §4. Nowhere should re-implement the check.

## 2. Late joiners see onboarding after the start date (`Accountability.tsx` / `accDashboard/AccountabilityDashboard.tsx`)
- If the cohort has started (weeks 1–6) and `onboardingStatus(client).complete` is false, show a card
  at the top of the dashboard: **"Finish setting up — about 5 minutes"**, listing the missing items,
  with a button that opens the onboarding dialog.
- The rest of the dashboard (lesson, habits, check-in) still works underneath — don't block it.
- The card disappears once all five are done.
- Add a "Start here" link on the dashboard to the Week 0 content, so late joiners can watch the setup
  videos.

## 3. Roster shows onboarding status (`AccountabilityCoachPanel.tsx`, Roster tab)
- On each client row, show `x/5` plus chips for what's missing (e.g. "No photos", "No why"), from
  `onboardingStatus`.
- Add a filter: **"Onboarding incomplete"** (clients without `onboarding_completed_at`).
- A coach can still mark a client onboarded manually. **The manual "mark onboarded" control must set
  BOTH `onboarding_done = true` AND `onboarding_completed_at = now()`** (so the manual override and the
  automatic 5-item rule stay in sync — this is for scale-averse clients who agree measurements only,
  etc). Unmarking clears both.

## 4. Preview check (`AccountabilityPreview.tsx`)
- Make sure the Preview dashboard can show the "Finish setting up" card for a week-1+ demo client with
  incomplete onboarding, so coaches can see it.

---

## Habit rings — NO CHANGE in this brief (resolved)
The dashboard habit rings currently come from the member's own `member_habits`, not the programme
weeks. Making them the cumulative programme stack (plate+water → +protein → +steps → +planned snacks)
is a **separate follow-on** (its own brief + SQL) and is NOT in this launch scope. Leave the rings as
they are here.

---

## Acceptance checks
1. New enrolled client, before 19 Oct: can't finish onboarding without seeing the 5 items are missing;
   answers survive closing and reopening the dialog.
2. All 5 done → `onboarding_completed_at` set; Roster shows 5/5.
3. Client enrolled with nothing done, viewed as week 1 in Preview → "Finish setting up" card shows,
   lists all 5, opens the dialog; dashboard still usable underneath.
4. Roster filter "Onboarding incomplete" lists exactly the clients without `onboarding_completed_at`.
5. Coach "mark onboarded" sets BOTH fields and clears the card for that client.
6. Cohort week label on Roster reads "starts in N days" counting to 19 Oct.

**Deploy:** screens via builder export → `scripts/merge-builder-export.py` → review → push (Netlify
auto-deploys). No secrets in client code.
