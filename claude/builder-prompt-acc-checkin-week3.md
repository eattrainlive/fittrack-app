# Builder brief — Accountability check-in: SOS plan, step target, weekly averages, add-on question, copy fixes

**Why:** The 19 Oct cohort's Week 3 (2–8 Nov) is built around the Motivation SOS plan and a personal
step target, but nothing in the app saves either: `acc_clients.sos_plan` is displayed on the
dashboard and coach console but never written, and the Steps card shows a default 8,000 for everyone.
The check-in also never fills `avg_weight` / `avg_steps`, has no way to ask a week-specific question,
and some wording doesn't match the programme.

**Deadline:** live by **Sun 25 Oct** (first check-in uses §3–§5). §1–§2 must be live by **Sun 8 Nov**
(Week 3 check-in) — ideally shipped together.

**Scope:** the 6 changes below. Don't touch onboarding, the final check-in, the habit rings or the
coach inbox logic.

> SQL to run first: `supabase/sql/acc_checkin_addon.sql` — adds `acc_week_content.checkin_addon text`
> and seeds the Week 1–5 questions. No other schema changes: `sos_plan`, `step_target`, `avg_weight`
> and `avg_steps` already exist. Members can already update their own `acc_clients` row (RLS).

---

## 1. Week 3: capture the SOS plan (`WeeklyCheckin.tsx`)
When `week === 3`, add a section **"Your SOS plan"** before the existing questions, with three short
text fields:
- "When I'm on it, I…" (e.g. prep lunches, walk at lunch, weigh daily)
- "The first sign I'm slipping is…"
- "When I spot it, the first thing I'll do is…"

On submit, write them to `acc_clients.sos_plan` as one text block:
```
When I'm on it: …
First sign I'm slipping: …
What I'll do: …
```
Also keep the three answers in the check-in `responses` (`sos_on`, `sos_sign`, `sos_action`).
Prefill from the existing `sos_plan` if one is already saved (re-opening the check-in).

Add a helper in `accountabilityProgramme.ts`:
`saveMySosPlan(clientId, sosPlan: string, stepTarget?: number | null)` → updates `acc_clients`
(`sos_plan`, and `step_target` when provided).

## 2. Week 3: set the step target (`WeeklyCheckin.tsx`, `accDashboard/Metrics.tsx`)
In the same Week 3 section, add **"Your daily step target from now on"** (number). Helper text:
"Your recent average plus 1,500–2,000. A bump, not a leap to 10k." Prefill with
`baseline.avg_steps_baseline + 1500` rounded to the nearest 500 if there's a baseline. Save to
`acc_clients.step_target` via `saveMySosPlan`.

**Steps card (`StepsCard`):**
- Show `client.step_target` if set. If not set, show "Set in week 3" instead of a number.
  Remove the `|| 8000` default in `AccountabilityDashboard.tsx`.
- Replace the static full bar with last week's `avg_steps` (latest check-in) vs target, e.g.
  "Last week: 7,450 avg". No bar if there's no check-in yet.
- Replace "Log steps in your daily check-ins" with "Log your average steps in your Sunday check-in".

Coaches: let the coach edit `step_target` from the client console (small number field next to the
SOS plan block) so they can adjust it on the Week 3 call.

## 3. Weekly averages (`WeeklyCheckin.tsx` → `saveCheckin`)
- New question every week (1–5): **"Your average daily steps this week"** (number) → pass as
  `avgSteps`.
- `avgWeight`: on submit, average `bodyweight_history.weight` for this user over that programme
  week's 7 days (`cohort.start_date + (week-1)*7` to `+6`). Null if no entries. No new question.
- Coach console: show both in each check-in row ("Avg weight 82.1kg · Avg steps 7,450") if not
  already displayed.

## 4. Week-specific question (`WeeklyCheckin.tsx`, `WeekContentEditor.tsx`, `AccountabilityClientConsole.tsx`)
- Add `checkin_addon` to `AccWeekContent` in `accWeekContent.ts`.
- If the current week's `checkin_addon` is set, show it as the last question before "Anything you want
  help with". Long text. Save to `responses.addon_q` (the question text, so it survives later edits)
  and `responses.addon`.
- `WeekContentEditor`: add a "Check-in question" text field per week.
- Coach console check-in log: show the add-on question + answer.

## 5. Copy fixes (`WeeklyCheckin.tsx`)
- **Q2** → "How consistently did you hit your habits this week?" Under it, small text listing the
  habits unlocked so far (from `acc_week_habits` for weeks ≤ current week, joined to `habits.name`),
  e.g. "Balanced plate · Hit my water target · Protein at every meal".
- **Q8** → weeks 1–2: "What might trip you up next week, and what will you do about it?"
  Weeks 3–5: keep the current SOS-plan wording.
- **Q10** → weeks 1, 2, 4, 5: "Progress photo (optional) — and how are you feeling about progress?"
  Week 3: "Midpoint photo — same spot and pose as day 0. It's just for you. How are you feeling about
  progress?"

## 6. Dashboard SOS card (`accDashboard/Sections.tsx`)
`SosPlanCard` keeps the line breaks of the saved text (`whitespace-pre-wrap`) and gets a small
"Edit" link that opens a dialog with the same three fields, saving via `saveMySosPlan`.

Update `accPreviewData.ts` so Preview shows: a week-3 check-in with the SOS section, a saved SOS plan,
a step target, and an add-on question.

---

## Acceptance checks
1. Week 3 check-in shows the SOS section + step target; submitting writes `acc_clients.sos_plan` and
   `step_target`; the dashboard SOS card and coach console then show the plan.
2. Re-opening the Week 3 check-in prefills the three SOS fields and the step target.
3. Steps card shows "Set in week 3" before a target exists, then the target and last week's average.
4. Any weekly check-in with steps entered saves `avg_steps`; a client with bodyweight entries that week
   gets `avg_weight`; neither breaks if empty.
5. With `checkin_addon` set for Week 2, the Week 2 check-in shows it, and the console shows Q + A.
6. Week 1 check-in: Q2 lists only plate + water; Q8 shows the weeks 1–2 wording; Q10 says optional.
7. Week 4 check-in: Q8 shows the SOS wording; no SOS section (that's Week 3 only).
8. Coach can change a client's step target from the console.

**Deploy:** run the SQL in Supabase → screens via builder export → `scripts/merge-builder-export.py`
→ review → push (Netlify auto-deploys).
