# Builder brief — Trial Nurture cockpit (Carla's screen)

Build the UI only. **All logic already exists** in `src/lib/trialNurture.ts` (committed) —
wire the screen to it, don't re-implement timing/attendance/sending.

## What it is
A daily cockpit for the coach (Carla) to work the 30-day trialist drip. Each trialist gets a
sequence of WhatsApp touchpoints keyed off their trial day. The **Welcome** step auto-sends
server-side when their trial starts; **every other step the coach reviews and sends by hand**.
The screen tells her who's due a touch today, lets her tweak the personal note, and sends it.

## Where it lives
New tab **"Trial Nurture"** in the Staff Hub call-lists area, alongside the existing Trialists /
Reach-out / Lapsed tabs (see `StaffHubCallLists.tsx`). Staff-only (same gating as the other call
lists). Reuse from `@/components/staffHubShared`: `staffName()`, `EmptyState`, and the
`ActivityButton` (clicking a trialist opens the existing `MemberActivityModal`, same as the other
lists).

## Data — use these exports from `src/lib/trialNurture.ts`
```ts
import {
  getNurtureBoard,      // () => Promise<{ dueNow: NurtureTrialist[]; upcoming: NurtureTrialist[] }>
  sendStep,             // (args) => Promise<{ ok: boolean; error?: string }>
  getNurtureHistory,    // (email) => Promise<LogRow[]>  (newest first)
  renderNote,           // (tpl, name) => string  — fills {name} with first name
  NURTURE_STEPS,        // the full catalogue (for the "sequence" reference view, optional)
  type NurtureTrialist, type NurtureStep, type StepStatus,
} from "@/lib/trialNurture";
```

`NurtureTrialist` shape (already computed for you):
- `email`, `name`, `trialStart`, `trialEnd`, `trialDay` (1-based), `trialEnd`
- `attended`, `attendedWeek1`, `daysSinceVisit` (null = never), `lastVisit`
- `flags: { noShow, hotLead, neverAttended }`
- `steps: StepStatus[]` — every step with `state: "sent" | "due" | "overdue" | "upcoming"`, plus `sentAt`/`sentBy` when sent
- `nextStep: StepStatus | null` — **the single step to action now** (the one the send button fires)

`NurtureStep` (inside `step.step`): `key`, `label`, `day`, `templateKey`, `category`
(`welcome|checkin|behaviour|convert`), `blurb` (what the touch is for), `defaultNote` (suggested
note with `{name}`), `auto?` (welcome only).

## Layout
On mount: `const board = await getNurtureBoard();` (show a spinner; it never throws — empty arrays
on error).

**Section 1 — "Due today" (`board.dueNow`):** the working list, already sorted (overdue first, then
hot leads, then oldest trial day). One card per trialist:
- Name + `ActivityButton` (opens MemberActivityModal) + `Day {trialDay} of 30`.
- Flag chips when set: 🔥 **Hot lead** (green), ⚠️ **No-show {daysSinceVisit}d** (amber),
  **Not been in yet** (red) — from `t.flags`.
- The due step: `t.nextStep.step.label` with a state badge — **OVERDUE** (red) if
  `nextStep.state === "overdue"`, else **DUE** (blue). Show `nextStep.step.blurb` as sub-text.
- An **editable note textarea** pre-filled with `renderNote(nextStep.step.defaultNote, t.name)`.
  Keep per-card local state so edits don't bleed across cards.
- A **Send** button → `await sendStep({ trialist: t, step: t.nextStep.step, note: <textarea>, by: staffName() })`.
  While sending, disable + spinner. On `ok`, toast "Sent ✓", optimistically remove the card (or
  re-call `getNurtureBoard()` to refresh). On `!ok`, toast the `error` and leave the card.
- A small **"View sequence"** expander per card: list `t.steps` with their state (sent → show
  `sentAt` date + `sentBy`; upcoming → grey "Day {day}"). Lets Carla see the whole journey.

**Section 2 — "In the drip" (`board.upcoming`):** collapsed by default; trialists with nothing due
yet. Each row: name, `Day {trialDay}`, flags, and the next upcoming step label + its day. No send
button. Still clickable → MemberActivityModal.

**Empty state:** if both lists empty → `EmptyState` "No trialists in the nurture sequence right now."

## Notes / gotchas
- **Never show a Send button for the welcome step** — it's `auto` and fired server-side; it appears
  in the sequence expander as already sent (sentBy "auto").
- `sendStep` already (a) fires the GHL workflow via the staff-only proxy and (b) logs the send, so
  after a successful send that step won't come back as due. Just refresh the board.
- Don't compute trial day / attendance / which step is due yourself — it's all on `NurtureTrialist`.
- Keep it fast and uncluttered: Carla works this list every morning. Due-today first, one obvious
  action per card, flags that tell her who to *call* (hot leads, no-shows) vs just message.
