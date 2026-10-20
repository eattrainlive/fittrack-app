# Trial Nurture v2 — situation-aware coach nudges (design spec)

Goal: evolve the fixed day-based drip into a smarter engine that mainly **nudges Carla** with the
right action at the right moment, aware of the trial TYPE, what the trialist has actually DONE
(booked / been in / logged), and their booked session times — not just "what day is it".

Everything surfaces as prioritised flags/tasks in Carla's cockpit; she reviews + sends. No new
auto-sends beyond the existing auto welcome.

---

## 1. Trial types

Two trials, detected from `trialProduct` (set by gymos-webhook from the membership plan name):
- **30-day Coached** — the fuller coached journey (classes + coaching). Default when not a 21-day plan.
- **21-day Kickstart** — tighter, often **gym-only** (the "21 / £21 / gym trial" the webhook already
  recognises). Shorter timeline; attendance comes from gym scans/workouts more than class bookings.

Detection helper: `trialType(trialProduct)` → `"kickstart21" | "coached30"`.
Confirmed plan-name strings:
- coached30 → "30 Day Trial", "Forever Strong 30 Day Trial"
- kickstart21 → "21 days for £21"
Rule: if `/21/.test(product)` → kickstart21; else coached30 (so "30 Day…" and "Forever Strong 30…"
fall through to coached, "21 days for £21" catches on 21).
Add `trialType` + `trialLength` (21 | 30) to the trialist object.

Each type gets its OWN step schedule (see §5). Step `key`s are unique per type so the log
(`trial_nurture_log.step_key`) stays unambiguous.

> Dependency: the 21-day Kickstart needs its own message copy from Carla (shorter, gym-focused).
> The 30-day copy is already finalised.

---

## 2. Activity / attendance signal (replaces "attended = class bookings only")

Build a single **activity** view per trialist from three sources, matched by email/user:
1. **Class bookings** — `member_bookings`, past, status != 'cancelled' (current behaviour).
2. **Kiosk scans** — `scan_events` (gym check-ins; `checkin_for` e.g. "Open gym"). Best proxy for
   gym-only Kickstart members who don't book classes.
3. **Logged workouts** — `workout_history` by the member. Shown as a handy extra signal.

Model:
- `activityDates` = union of booking dates + scan dates (these COUNT as attendance / drive the
  "attending vs quiet" branch and the no-show flag).
- `workoutDates` = logged-workout dates — DISPLAYED on the card as a secondary signal
  ("logged 3 workouts, last Tue"), not required to count as attendance.
- Recompute `attended`, `attendedWeek1`, `daysSinceActivity` from `activityDates`.
- Card shows a small breakdown: classes booked / gym scans / workouts logged.

---

## 3. Booked-session-aware "after first session" reminder

We can't see attendance, but we DO know the booked time (`member_bookings.session_at`).
- Find the trialist's **first booked session** (earliest future-or-past `session_at`).
- The "how did your first session go?" step becomes **due after that session's time + a buffer**
  (proposed: next morning, or session_at + 4h), instead of a fixed trial day.
- Fallback: if they have NO booking, it stays day-based (and the "no session booked" flag below fires
  instead).

---

## 4. Situational flags (the new nudges for Carla)

Each is a prioritised card flag with a matching message template Carla can send. Computed per trialist:

| Flag | Condition | Carla action |
|------|-----------|--------------|
| `no_session_booked` | No upcoming booking AND no activity yet, past day ~1–2 | Nudge them to book their first session |
| `first_session_done` | First booked session time has passed (+buffer) and not yet messaged | Send the "how did it go" check-in |
| `gone_quiet` | `daysSinceActivity` > threshold (type-specific) | Re-engage / re-book |
| `frequency_drop` | Was active, but visits (bookings + scans) in the last 7 days < **2** | Nudge to keep the frequency up |
| `review_not_booked` | Near trial end (type-specific day) AND no review booking on file | Push the results-review booking link |
| `ending_soon` / `decision` | Existing end-of-trial steps | Existing templates |

Thresholds differ by type (Kickstart is shorter, so "quiet" = fewer days).
`review_not_booked` needs a review-booking source — check `review_bookings` table (seen in
data-isolation list) or match `member_bookings.session_type` for the review.

---

## 5. Two step schedules

- **coached30**: the current 9 steps (finalised copy). Keep as-is, tag `trialType: "coached30"`.
- **kickstart21**: a new, tighter set (needs Carla copy). Proposed skeleton (days are trial-day):
  - Day 1 — Welcome (auto) — gym-focused: how to scan in, where to start, app education area.
  - After 1st activity (booked-session-aware OR first scan) — "how was your first one?"
  - Day 4 — Not-booked / not-been-in nudge (if no activity) — book or come in.
  - Day 7 — Week 1 win / momentum (branch on activity).
  - Day 11 — Mid-trial check + review offer (Evolt scan / chat).
  - Day 16 — Results review booking push.
  - Day 19 — Ending soon + options.
  - Day 21 — Decision / last chance.

Branches use the §2 activity signal (attending vs quiet).

---

## 6. Files / plumbing

- `src/lib/trialNurture.ts` (direct-edit, protected) — add `trialType`, two `NURTURE_STEPS` sets,
  activity model (bookings + scans + workouts), session-time reminder, situational flags.
- New data reads: `scan_events` (kiosk) and `workout_history` into the board builder
  (`getNurtureBoard`), matched by email/user. Confirm staff RLS allows reading these for the board,
  or add a SECURITY DEFINER RPC that returns per-trialist activity counts (likely cleanest — avoids
  widening table RLS).
- `TrialNurtureCockpit.tsx` (builder-built, hand-edited) — render the new flags + activity breakdown;
  surface the per-type schedule. Builder brief for the UI.
- GHL: 21-day Kickstart templates (new `template_key`s) once Carla writes the copy.

---

## 7. Suggested build order

1. **Engine foundation (no UI):** `trialType` detection + split the catalogue into coached30 /
   kickstart21 (kickstart copy as placeholders until Carla writes it).
2. **Activity signal:** RPC (or reads) for scans + workouts; fold into the board; recompute
   attended/quiet/daysSinceActivity; show the breakdown data.
3. **Session-time reminder:** first-booking lookup → booked-session-aware "after first session".
4. **Situational flags:** no_session_booked, first_session_done, gone_quiet, frequency_drop,
   review_not_booked — as cockpit flags.
5. **Cockpit UI:** builder brief to render flags + activity breakdown + per-type steps.
6. **Kickstart copy + GHL templates:** once Carla writes the 21-day messages.

---

## 8. A dedicated "Trials" home (consolidation)

Today trialist/review-window bits are spread across the members section + Staff Hub
(`TrialistPipeline`, `CurrentTrialistsBoard`, `TrialNurtureCockpit`, `TrialHubSettings`,
`trialHub.ts`, `trialStages.ts`). Michael's steer: pull the trialist buckets, review windows AND this
nurture system into **one designated place** — a "Trials" hub tab — so Carla works everything from
there instead of hunting across screens. Scope this as its own stage (builder brief for the UI shell;
the engine work below feeds it).

---

## Resolved
- Plan strings: coached30 = "30 Day Trial" / "Forever Strong 30 Day Trial"; kickstart21 =
  "21 days for £21". Detection: `/21/` → kickstart, else coached.
- `frequency_drop`: < 2 visits/week (bookings + scans in last 7 days).
- Review windows already exist as a members-section filter (trialStages/trialHub) — reuse that
  signal for `review_not_booked`.

## 9. Conversion-lifting roadmap (hub improvements)

Beyond consolidation, the hub should actively lift conversion. Priority order:

1. **Conversion dashboard + funnel** (data-driven foundation). Headline conversion rate over a
   period, split by trial type (21 vs 30) and by coach. Funnel: started → attended 1st → attended
   3+ in wk1 → review booked → converted (shows where people drop). Trend month-on-month;
   avg time-to-first-session. Uses data we already have (trial_cohort.converted + the activity signal).
2. **Stage board + health score + ranked "do today" queue.** Trialists as cards across stages
   (Not started → Settling → Active → At risk → Review due → Decision → Won/Lost). A per-trialist
   health score (attendance frequency + recency + engagement) drives "at risk". The day's actions
   ranked by conversion impact × urgency so Carla works top-down.
3. **Outcome capture.** Mark won / lost with a reason (price / timing / not for them / went
   elsewhere); log call outcomes; snooze. Needed for the dashboard to be honest + to learn.
4. **Process levers the system enforces.** Loud speed-to-first-session flag (<48h); push the review
   booking MID-trial (day ~11/14), not at the end; Evolt baseline at start + rescan at review;
   surface social proof (testimonials / results / community wins) to the trialist in-app; clear
   join-now offer visible to Carla at the decision point.
5. **Learning loop.** Track touches that precede conversion + loss reasons; feed non-converters into
   the existing win-back routes.

## Still open
- Kickstart 21-day message copy (Carla) — separate from the 30-day set.
- Confirm whether a booked **review** is detectable (a `member_bookings` session_type like
  "Trial Review", or a separate review-bookings feed) so `review_not_booked` can tell booked vs not.
