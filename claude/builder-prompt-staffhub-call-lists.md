# Builder brief — ETL Staff Hub, the 3 call lists (trialists / reachout / lapsed)

Add three "call list" screens to the Staff Hub, below the existing "This month" numbers. These are
the daily call sheets: who to ring, why, and a one-tap way to log the outcome. Phone-first (coaches
use these on the gym floor).

## Data — use the existing lib, do NOT fetch or build URLs yourself
Everything comes from `src/lib/staffHubMetrics.ts`. Do not call the Netlify function directly and do
not construct any URL — import and use these:

```ts
import {
  fetchStaffHubMetrics,      // returns the whole payload incl. the lists (for staff)
  logStaffActions,           // POSTs an outcome to the append-only log
  type Trialist, type ReachoutMember, type LapsedMember,
  type StaffAction, type StaffActionInput,
} from "@/lib/staffHubMetrics";
```

`fetchStaffHubMetrics()` returns `{ ok, generated, trusted, month_name, metrics, trialists?,
reachout?, lapsed?, actions? }`. The four list fields are present **only when the caller is verified
staff** by the server. If they're `undefined`, show the "staff only" empty state (below) — never an
error. This is the SAME call Screen 1 already makes, so fetch once and share the result across the
screen; don't call it per list.

### Shapes (already typed in the lib — don't redefine)
- `Trialist`: `{ first, last, email, start, trial, category, finishes }` — `finishes`/`start` are
  `YYYY-MM-DD` strings or null.
- `ReachoutMember`: `{ first, last, email, membership, category, joined, milestone }` —
  `milestone` is the month number (3, 6, 9 or 12).
- `LapsedMember`: `{ first, last, email, membership, category, value, cancelled, window, stage,
  owner }` — `window` is "2-3 months" or "4-6 months"; `value` is a number (monthly £).
- `StaffAction` (the log): `{ logged, type, who, email, outcome, note, by }`.

The lists arrive **already sorted and filtered** server-side (trialists by finish date; reachout by
milestone; lapsed by window then value). Render in the order given — do not re-sort or re-filter, and
do not compute any dates/£ yourself; display what's there.

## Layout
A segmented control / three tabs under the "This month" block:
**Trialists · Reach out · Win back** — each with a count badge (e.g. "Trialists 6").
Each tab is a vertical list of cards. No horizontal scroll, big touch targets.

### Tab 1 — Trialists ("Trials to convert")
One card per `Trialist`, in the order given (soonest to finish first):
- **Name** `first last` (bold). Under it: the trial type (`trial`) and `category`.
- **Finishes**: show `finishes` as "Finishes Sat 11 Oct" (localise the date). If it's in the past or
  today, show a red "Finishing / overdue" chip; within 3 days, an amber "Soon" chip. (Direction only
  — don't recompute the date, just compare the given `finishes` string to today for the chip.)
- Actions: **Log outcome** (see "Logging" below) and tap-to-email (`mailto:${email}`) / tap-to-copy
  email. No phone numbers are in the data, so no tap-to-call.

### Tab 2 — Reach out ("Milestone check-ins")
One card per `ReachoutMember` (lowest milestone first):
- **Name** + `membership` + `category`.
- A clear **"{milestone}-month check-in"** chip (e.g. "3-month check-in"). Show `joined` as
  "Joined Mar 2026".
- Actions: **Log outcome**, email.

### Tab 3 — Win back ("Lapsed")
One card per `LapsedMember` (2-3 months first, then by value):
- **Name** + `membership` + `category`.
- **Window** chip: "2-3 months" / "4-6 months". Show `value` as monthly value "£39/mo" using the
  number as given (round for display only). Show `cancelled` as "Cancelled Aug 2026".
- Show current **`stage`** (e.g. "Not contacted") and **`owner`** if present ("Owner: Jo").
- Actions: **Log outcome**, email.

## Logging an outcome (the whole point)
On any card, **Log outcome** opens a small sheet/dialog:
- Preset outcome buttons (tapping one is enough):
  - Trialists: "Converting", "Thinking about it", "No answer", "Not continuing".
  - Reach out: "Spoke – all good", "Needs attention", "No answer".
  - Win back: "Interested", "Maybe later", "No answer", "Not coming back".
- Optional free-text **note**.
- On confirm, call:
  ```ts
  await logStaffActions([{
    type: "trialist" | "reachout" | "lapsed",   // the current tab
    who: `${first} ${last}`,
    email,
    outcome,                 // the chosen preset (or custom)
    note,                    // optional
    by: <signed-in staff member's name>,   // from the current session/profile
  }]);
  ```
- On success (`{ ok, logged }`), show a brief "Logged ✓" toast and mark that card as **done for
  today** (muted + a small "Logged: {outcome}" line). Keep it in the list — don't remove it — so the
  coach can see it's handled. This state can be in-memory for the session; the sheet is the record.
- On failure, toast "Couldn't log — try again" and leave the card active. Never lose the note.

## Access & resilience
- Same staff gate as Screen 1 (`fittrack_is_staff`). No second login.
- If `trialists`/`reachout`/`lapsed` come back `undefined` (caller not verified staff server-side),
  show a muted "Visible to staff only" state for the lists — the numbers above still show.
- If a list is an empty array, show a friendly empty state ("No trials to convert right now ✅"),
  not a blank area.
- Flaky wifi: the lists are **not cached** (they're personal data) — if the fetch fails, show the
  "couldn't refresh" banner and the cached NUMBERS only; the lists stay empty with a "reconnect to
  load" note. Do not try to stash names in localStorage.

## Hard rules
- No URL building, no secrets, no Apps Script calls — only the two lib functions.
- No maths on the data (no recomputing finish dates, milestones, £ or conversion). Display as given;
  the only client logic allowed is the date-chip direction (overdue/soon) by comparing to today.
- Don't re-sort or re-filter the lists.
- Keep names/emails on screen only; never log them anywhere except via `logStaffActions`.

## Acceptance
- Three tabs with counts; each renders its cards in server order with the fields above.
- Trialist cards show finish date + overdue/soon chip; reach-out show milestone chip; lapsed show
  window + £ + stage/owner.
- "Log outcome" posts via `logStaffActions` and the card shows "Logged ✓".
- Non-staff / unverified: numbers show, lists show "staff only".
- Empty lists show friendly empty states; failed refresh keeps numbers, not a blank screen.
