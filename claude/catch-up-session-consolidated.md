# Consolidated catch-up — direct repo changes (protect on every builder merge)

Everything below was edited STRAIGHT INTO THE REPO this session, not through the builder. The builder
has no idea these exist, so a full export + wipe-and-paste merge will silently revert them. On any
future merge: **keep the repo version of every file in Part A.** Part B is a paste-to-builder summary
if you'd rather bring the builder's own copy up to date.

Live site is fine — this is only about not losing these on the next build.

---

## Part A — Repo-owned files (do NOT let a builder export overwrite)

### Trial Nurture  (v2 — situation-aware; Carla copy finalised)
- `src/lib/trialNurture.ts` — the whole engine. ⚠ Never take the builder's copy (it once used the
  wrong log table). Carries, cumulatively:
  - Finalised Carla copy on the 30-day steps (Welcome/After-1st/Decision note-free; Ending-soon has
    the booking link). WhatsApp send is GHL-side by template_key — app copy is the cockpit preview.
  - v2: `trialType()` (kickstart21 vs coached30), `KICKSTART21_STEPS` (placeholder, k21_* keys),
    `stepsForType()`; activity = bookings + kiosk scans, workouts as a shown signal
    (`activity{classes,scans,workouts}`, `lastWorkout`); booked-session-aware "after first session"
    (`afterFirstSession`, `firstSessionAt`); situational flags noSessionBooked / firstSessionDone /
    goneQuiet / frequencyDrop / reviewNotBooked; member_bookings select includes session_type.
  - Needs RPC `trial_workout_activity.sql` deployed (staff-only, reads trialists' workout dates).
- `src/components/TrialNurtureCockpit.tsx` — builder-built, hand-edited: Joined tab; v2 adds
  per-type step dropdown (stepsForType(t.trialType)), "Day X of {trialLength}", the 5 new flag chips,
  activity breakdown line. KEEP — don't regenerate.
- `supabase/sql/trial_workout_activity.sql` (NEW) — staff-only workout-dates RPC.
- `getTrialStats(periodDays)` in trialNurture.ts — conversion dashboard data (rate by type, funnel,
  avg time-to-first-session). `src/lib/trialOutcomes.ts` (NEW) + `supabase/sql/trial_outcomes.sql`
  (NEW, staff-only) — mark won/lost + loss reason.
- Consolidated Trials hub: builder brief `claude/builder-prompt-trials-hub.md` (building).
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

### Post-workout Session Roundup (shareable card)
- `src/components/SessionRoundupModal.tsx` (merged from export 77, then hand-edited) — the branded
  card shown after a workout: total volume, `REWARD_ITEMS` animal comparison, PBs (with a **"New PB"**
  header), stats line, member name. Shares to socials (toPng → navigator.share) and to community feed
  (uploadWallImage + createPost). Hand-edits: `prettyName()` for PB exercise labels (slug/camelCase →
  Title Case); duration chip hidden unless ≥1 min; "New PB(s)" header.
- `src/components/AdLibLogSheet.tsx` — fires `onRoundup` after `saveWorkout()`.
- `src/pages/Workouts.tsx` — mounts `SessionRoundupModal`, fires it on the planned-workout save path.
  ⚠ The old PB modal + reward modal were **intentionally disabled** on both save paths (`onPBs`
  no-op; `setPbModal`/`setRewardModal` removed from the save flow) — they stacked on top of the
  roundup and darkened it. Don't let a builder export re-enable them.

### Leaderboard name resolution (block boards)
- `src/lib/blockLeaderboard.ts` — names now resolve from `members` (id = auth uid → full_name),
  with `gym_members` only as a secondary fallback. Joining `gym_members.user_id` returned nothing
  (GymOS never sets it to the auth id), so everyone showed as "Member".

### Million Metre Challenge — member-facing leaderboard
- `src/lib/ergChallenge.ts` — `getErgLeaderboardPublic()`, `buildErgBoards()`, `myErgStanding()`,
  `ERG_BOARDS`, and types (`ErgLeaderCell`, `ErgBoardKey`, `ErgBoardRow`). The old staff-only
  `getErgLeaderboard` stays.
- `src/pages/ErgChallengePage.tsx` — leaderboard visible to **all members**: Overall/Bike/Rower/Ski
  selector, top 10 per board, and a "you're Nth of N, X m off the top 10" row when below top 10
  (plus a "top 10 🔥" line when in it). `ordinal()` helper added.
- `supabase/sql/erg_leaderboard_public.sql` (NEW) — `erg_challenge_leaderboard_public()` SECURITY
  DEFINER RPC, per-member per-machine totals, names only (no email), granted to authenticated.

### Self-logged workouts — repeat + "My workouts"
- `src/lib/customWorkouts.ts` (NEW) — saved custom workouts (Supabase `custom_workouts` + localStorage).
- `src/components/AdLibLogSheet.tsx` — `prefill` prop seeds workout mode (carries last weights/reps);
  "Save as My workout" button. (Also carries the Session Roundup changes — push latest.)
- `src/pages/Workouts.tsx` — a "Mine" filter tab (next to All/Workouts/Programs) listing ONLY the
  member's saved custom workouts (tap to repeat, delete, empty-state); browse grid excluded under Mine.
  prefill wiring into AdLibLogSheet. (Also carries Session Roundup changes — push latest.)
- `supabase/sql/custom_workouts.sql` (NEW) — own-row RLS table.

### Accountability — client-facing "This week's focus"
- `src/components/ClientFocusCard.tsx` (NEW) + `src/lib/clientFocus.ts` (NEW) — per-week client-VISIBLE
  focus note, coach-set on AccountabilityClientConsole (week selector, upsert per client+week).
- `src/pages/Accountability.tsx` — member dashboard shows the current week's focus as a "Your focus
  this week" card, signed off with the ASSIGNED coach's name (coach_user_id). Fetches via getFocusForWeek.
- `src/components/AccountabilityClientConsole.tsx` — mounts `<ClientFocusCard>` above Coach notes.
- `supabase/sql/acc_client_focus.sql` (NEW) — table; member reads own, staff write only.

### Accountability — coach notes on the client profile
- `src/components/CoachNotesCard.tsx` (NEW) + `src/lib/coachNotes.ts` (NEW) — dated coach-notes
  timeline on AccountabilityClientConsole: round-ups for in-person onboarding / in-person check-ins /
  general, per-note Copy + Delete, "Copy all for Claude" (client context + all notes, pastable).
- `src/components/AccountabilityClientConsole.tsx` — mounts `<CoachNotesCard>` after the header.
- `supabase/sql/acc_coach_notes.sql` (NEW) — staff-only `acc_coach_notes` table.

### Accountability — enrol picker search by name or email
- `src/components/AccRosterTab.tsx` — the enrol-a-client member picker filtered on email only, so a
  name search returned nothing. Now matches `full_name` + `email`; placeholder "Search by name or
  email…". Keep the name+email match.

### Accountability — coach Setup tracker (spreadsheet-style grid)
- `src/components/AccountabilitySetupTracker.tsx` (NEW) — sheet-style grid on the coach panel:
  clients × milestones. Columns: Member (pinned) + Coach (from coach_user_id via `staff` prop) +
  (Set up on FitTrack, Sent onboarding, Onboarding form, MFP diary, Paid, Initial call booked,
  Initial call done, Week 1–6), Done count, Mine/All scope toggle. EVERY cell is tappable and persists
  to `acc_clients.setup_tracker`; effective value = manual override if set, else auto-derived (onboarding
  form, MFP, weekly check-ins pre-fill). Component fetches its OWN clients via getCohortClients so ticks
  don't revert on tab switch. Needs `acc_setup_tracker.sql` run or saves fail.
- `src/lib/accountabilityProgramme.ts` — added `setup_tracker` field, `SETUP_COLUMNS`, `SETUP_WEEKS`,
  `autoSetupState()`, `setSetupTracker()`. (Already a protected file for week-offset / auto-WhatsApp.)
- `src/components/AccountabilityCoachPanel.tsx` — new "Setup tracker" tab.
- `supabase/sql/acc_setup_tracker.sql` (NEW) — adds `acc_clients.setup_tracker` jsonb.

---

## Part B — Paste-to-builder summary (optional, to sync its context)

"Since your last export, these were added directly in the repo — keep them, don't regenerate:
a Trial Nurture cockpit + engine (`trialNurture.ts`, `TrialNurtureCockpit.tsx`) with a Joined tab and
trial-type on cards; a WhatsApp conversation thread on the member activity card (`memberMessages.ts`
with GHL_LOCATION_ID set, `MemberMessagesSection.tsx`); a 'Habits this week' section on the activity
card (`habitAdherence.ts`); a staff week-offset across the accountability screens (`effectiveWeekOf`);
auto-WhatsApp hooks in `accountabilityProgramme.ts` / `accountabilityCheckins.ts`; and a
personal_records sync fix in `store.ts`; a post-workout **Session Roundup** card
(`SessionRoundupModal.tsx`, wired in `AdLibLogSheet.tsx` + `Workouts.tsx` — and the old PB/reward
modals are deliberately off on the save paths); a block-leaderboard name fix (`blockLeaderboard.ts`
resolves via `members`, not `gym_members`); and a member-facing Million Metre leaderboard
(`ergChallenge.ts` + `ErgChallengePage.tsx` + `erg_leaderboard_public.sql`). If you touch any of these
files, preserve the existing logic — especially `trialNurture.ts` and `memberMessages.ts`, which must
not be regenerated, and don't re-enable the old PB/reward modals in `Workouts.tsx`."

---

## SQL to have run (not builder-related, for reference)
`member_messages.sql`, `acc_week_offset.sql`, `trial_nurture.sql`, `mark_onboarded_fix.sql`,
`par_q.sql`, `erg_challenge.sql`, `staff_contact_progress_remove.sql`, `erg_leaderboard_public.sql`.
(Edge functions to deploy: wa-message-sync, gymos-webhook.)
