# Consolidated catch-up — direct repo changes (protect on every builder merge)

Everything below was edited STRAIGHT INTO THE REPO this session, not through the builder. The builder
has no idea these exist, so a full export + wipe-and-paste merge will silently revert them. On any
future merge: **keep the repo version of every file in Part A.** Part B is a paste-to-builder summary
if you'd rather bring the builder's own copy up to date.

Live site is fine — this is only about not losing these on the next build.

---

## Part A — Repo-owned files (do NOT let a builder export overwrite)

### Trial Nurture
- `src/lib/trialNurture.ts` — the whole engine (step catalogue w/ templateBefore/After, due/overdue,
  attendance flags, sendStep, getNurtureBoard). Recent adds: `trialProduct` / `converted` /
  `convertedProduct` fields; a **Joined** list on the board; attendance now counts **past,
  non-cancelled bookings** (GymOS leaves them "booked", so `status==="attended"` only was wrong);
  sendStep arg type accepts `{email,name}`. ⚠ The builder regenerated this once and used the wrong
  log table — never take its copy.
- `src/components/TrialNurtureCockpit.tsx` — builder-built, then hand-edited: trial type shown on
  cards, **Joined ✅** tab + `JoinedRow`.
- `src/components/StaffHubCallLists.tsx` — the "Trial Nurture" tab wiring.
- `netlify/functions/trial-nurture.js` — staff-only send proxy.

### WhatsApp conversation mirror
- `src/lib/memberMessages.ts` — ⚠ keep repo version. `GHL_LOCATION_ID = "rY0ybTWzhrquwXgUIX62"` and
  the location-based deep-link URL. The builder regenerated this and dropped the id + broke the URL.
- `src/components/MemberMessagesSection.tsx` — the thread UI (builder-built, kept).
- `src/components/MemberActivityModal.tsx` — mounts MemberMessagesSection; also the new **"Habits this
  week"** section (see below).
- `supabase/functions/wa-message-sync/index.ts`, `supabase/sql/member_messages.sql`.

### Habit adherence on the activity card
- `src/lib/habitAdherence.ts` (NEW) — getHabitAdherence(userId): last-7-day check-off per habit.
- `src/components/MemberActivityModal.tsx` — "Habits this week" section (done/7, colour-coded).

### Personal-records sync fix
- `src/lib/store.ts` — 4 `personal_records` upserts now send explicit columns (no `exerciseId` →
  was causing PGRST204 on the morning sync). Don't let a spread `{ ...p }` come back.

### Accountability — auto-WhatsApp (enrol welcome + check-in ready)
- `src/lib/accountabilityProgramme.ts` — `resolveMemberContact` (gym-email-preferred, mismatch
  fail-safe), `fireAccWelcome`, `enrolClient` fires welcome, AND `effectiveWeekOf` (week offset).
- `src/lib/accountabilityCheckins.ts` — `fireCheckinReady`, fires only when a **Loom** is newly
  added (not on edits) in `replyToCheckin`.
- `netlify/functions/acc-welcome.js`, `netlify/functions/acc-checkin-reply.js`.

### Accountability — staff week-offset (run a week ahead for testing)
- `supabase/sql/acc_week_offset.sql` (adds `acc_clients.week_offset`; Michael = 1).
- `effectiveWeekOf` used in: `AccountabilityCard.tsx`, `AccountabilityClientConsole.tsx`,
  `TodayHabitsCard.tsx`, `accDashboard/AccountabilityDashboard.tsx`, `pages/Accountability.tsx`.

### Accountability dashboard fixes (`src/pages/Accountability.tsx`)
- Removed the leftover inline "Today's habits" block (duplicate of the dashboard's Keystone habits).
- Weight save now re-mounts the dashboard (`dashKey`) so the weight stat refreshes.

### Edge function
- `supabase/functions/gymos-webhook/index.ts` — `maybeStartTrial` logs the auto-welcome to
  `trial_nurture_log` and sends step/template keys. (Builder doesn't touch edge functions, but noted.)

---

## Part B — Paste-to-builder summary (optional, to sync its context)

"Since your last export, these were added directly in the repo — keep them, don't regenerate:
a Trial Nurture cockpit + engine (`trialNurture.ts`, `TrialNurtureCockpit.tsx`) with a Joined tab and
trial-type on cards; a WhatsApp conversation thread on the member activity card (`memberMessages.ts`
with GHL_LOCATION_ID set, `MemberMessagesSection.tsx`); a 'Habits this week' section on the activity
card (`habitAdherence.ts`); a staff week-offset across the accountability screens (`effectiveWeekOf`);
auto-WhatsApp hooks in `accountabilityProgramme.ts` / `accountabilityCheckins.ts`; and a
personal_records sync fix in `store.ts`. If you touch any of these files, preserve the existing
logic — especially `trialNurture.ts` and `memberMessages.ts`, which must not be regenerated."

---

## SQL to have run (not builder-related, for reference)
`member_messages.sql`, `acc_week_offset.sql`, `trial_nurture.sql`, `mark_onboarded_fix.sql`,
`par_q.sql`, `erg_challenge.sql`. (Edge functions to deploy: wa-message-sync, gymos-webhook.)
