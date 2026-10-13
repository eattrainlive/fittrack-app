# Builder brief — Trial Nurture cockpit (Carla's screen)

Build the UI only. **All logic + the template copy already exist** in `src/lib/trialNurture.ts`
(committed) — wire the screen to it, don't re-implement timing/attendance/sending/copy.

A clickable reference mockup of the exact card lives at
`claude/mockups/trial-nurture-cockpit.html` — **match that layout**. (The message wording in the lib
is placeholder and will be refined later; build against the fields, not the words.)

## What it is
A daily cockpit for the coach (Carla) to work the 30-day trialist drip. The **Welcome** step
auto-sends server-side when a trial starts; **every other step the coach reviews and sends by hand**.
Each send = the step's approved WhatsApp template with an optional personal "coach note" merged in.

## Where it lives
New tab **"Trial Nurture"** in the Staff Hub call-lists area, beside Trialists / Reach-out / Lapsed
(`StaffHubCallLists.tsx`). Staff-only. Reuse from `@/components/staffHubShared`: `staffName()`,
`EmptyState`, `ActivityButton` (opens the existing `MemberActivityModal`).

## Data — from `src/lib/trialNurture.ts`
```ts
import {
  getNurtureBoard,     // () => Promise<{ dueNow: NurtureTrialist[]; upcoming: NurtureTrialist[] }>
  sendStep,            // (args) => Promise<{ ok: boolean; error?: string }>
  getNurtureHistory,   // (email) => Promise<LogRow[]>
  renderTemplate,      // (step, name) => { before, after }   — fixed copy, {name} filled
  renderFullMessage,   // (step, name, note) => string        — the "sends as" preview text
  NURTURE_STEPS,       // all 9 steps, for the template dropdown
  type NurtureTrialist, type NurtureStep, type StepStatus,
} from "@/lib/trialNurture";
```
`NurtureTrialist`: `email, name, trialStart, trialEnd, trialDay, attended, attendedWeek1,
daysSinceVisit, lastVisit, flags {noShow,hotLead,neverAttended}, steps[], nextStep`.
`NurtureStep`: `key, label, day, templateKey, category, auto?, branch?, blurb, templateBefore,
templateAfter, defaultNote`.

On mount: `const board = await getNurtureBoard();` (spinner while loading; never throws).

## The card (match the mockup)
Header row: name + `ActivityButton` + `Day {trialDay} of 30`. Flag chips when set:
🟢 **Hot lead** (`flags.hotLead`), 🟠 **No-show {daysSinceVisit}d** (`flags.noShow`),
🔴 **Not been in yet** (`flags.neverAttended`).

Below a divider, the send area — **this is the important bit, build it exactly like the mockup:**

1. **State badge** — `DUE` (blue) or `OVERDUE` (red) from `t.nextStep.state`.
2. **Template dropdown** — a `<select>` of all `NURTURE_STEPS` (`label` as text). Pre-select
   `t.nextStep.step.key`; mark that option "· suggested". Changing it swaps which template shows
   (lets Carla send a different step if she wants).
3. **Template message** — read-only block showing the selected step's fixed copy via
   `renderTemplate(step, t.name)`: render `before`, then a dashed highlighted chip **"+ coach note"**
   marking where the note lands, then `after`. Label it "Template message · approved copy — fixed".
   Also show the `step.templateKey` as a small mono tag.
4. **Coach note** — an **editable, optional** textarea. Label it "Coach note · optional — the
   personal bit you add". Pre-fill with `step.defaultNote` (currently empty). **Keep the note's
   current text when the coach switches template** (don't reset it). An empty note is valid.
5. **Sends as** — a live preview (green block) of `renderFullMessage(step, t.name, note)`; highlight
   the note portion so it's clear what's template vs. personal. Updates on dropdown change + note
   typing.
6. **Actions** — **Send WhatsApp** button + a **"View sequence ▾"** expander.

### Send
`const r = await sendStep({ trialist: t, step: <selected step>, note: <textarea>, by: staffName() })`.
Pass the **selected** step (the dropdown value), not necessarily `nextStep.step`. While sending:
disable + spinner. On `r.ok`: toast "Sent ✓", remove the card (or re-call `getNurtureBoard()`).
On `!r.ok`: toast `r.error`, leave the card.

### Sequence expander
List `t.steps`: sent → tick + `sentAt` date + `sentBy` ("auto" for welcome); the due one → "due
now"/"overdue"; upcoming → grey "Day {day}". (See mockup dots.)

## Section 2 — "In the drip" (`board.upcoming`)
Second tab or collapsed section: trialists with nothing due yet. Row = name + `ActivityButton` +
flags + "Day {trialDay} · next: {label} (Day {day})". No send button. Still opens MemberActivityModal.

**Empty state:** both lists empty → `EmptyState` "No trialists in the nurture sequence right now."

## Gotchas
- **Never show Send for the welcome step** — it's `step.auto`, fired server-side; appears in the
  sequence expander as already sent (by "auto").
- Don't compute trial day / attendance / due-state yourself — all on `NurtureTrialist`.
- `sendStep` already fires GHL via the staff-only proxy **and** logs the send, so a sent step won't
  return as due — just refresh the board after a successful send.
- Until the GHL workflows + env are wired, `sendStep` will return `{ ok:false }` (proxy 500) — that's
  expected; the screen + preview still work for layout review. Don't special-case it.
- Keep it fast and uncluttered: Carla works this every morning, top to bottom.
