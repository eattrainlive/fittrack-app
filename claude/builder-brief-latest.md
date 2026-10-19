Since my last export, the following were edited directly in the repo. Keep them exactly as they are — do not regenerate or revert them. If you need to touch any of these files, preserve the existing logic.

1) Post-workout SESSION ROUNDUP card (shareable)
- New file `src/components/SessionRoundupModal.tsx`: a branded card shown after a workout is saved — total volume lifted, a fun "that's X 🐘 Baby Elephants" comparison from REWARD_ITEMS, any PBs under a "New PB(s)" header, a stats line, and the member's name. Two share buttons: Share to socials (html-to-image toPng → navigator.share, download fallback) and Share to feed (uploadWallImage + createPost from communityWall.ts).
- `src/components/AdLibLogSheet.tsx`: after saveWorkout() it calls an `onRoundup` prop with the volume/PB/stats data.
- `src/pages/Workouts.tsx`: mounts SessionRoundupModal and fires it on the planned-workout save path too.
- IMPORTANT: the old PB modal and reward modal are DELIBERATELY disabled on both save paths (onPBs is a no-op; setPbModal/setRewardModal are not called from the save flow). They used to stack on top of the roundup and darken it. Do NOT re-enable them.

2) LEADERBOARD NAME FIX (block / "This Week's Boards")
- `src/lib/blockLeaderboard.ts`: member names now resolve from the `members` table (members.id = the FitTrack auth uid → full_name), with `gym_members` only as a secondary fallback. Joining gym_members.user_id returned nothing (the GymOS webhook never sets it to the auth id), so everyone showed as "Member". Keep the members-first resolution.

3) MILLION METRE CHALLENGE — member-facing leaderboard (new)
- `src/lib/ergChallenge.ts`: added getErgLeaderboardPublic(), buildErgBoards(), myErgStanding(), ERG_BOARDS, and the types ErgLeaderCell / ErgBoardKey / ErgBoardRow. The old staff-only getErgLeaderboard stays as-is.
- `src/pages/ErgChallengePage.tsx`: the leaderboard is now visible to ALL members (not just staff). It has a category selector (Overall / Bike / Rower / Ski), shows the top 10 per board, and when the current user is outside the top 10 it shows a "You · Nth of N — just X m off the top 10" row (and a "top 10 🔥" line when they're in it). An `ordinal()` helper was added.
- Backed by a new Supabase RPC `erg_challenge_leaderboard_public()` (SECURITY DEFINER, per-member per-machine totals, names only). This is already deployed via SQL — do not remove the RPC call.

4) ACCOUNTABILITY — COACH SETUP TRACKER (new)
- New file `src/components/AccountabilitySetupTracker.tsx`: a spreadsheet-style grid on the coach accountability panel (mirrors the "6 Week Nutrition Members" Google Sheet). Rows = cohort clients. First two columns are the member name (pinned) and their assigned Coach (resolved from coach_user_id via the staff list; "Unassigned" shown amber). Then the milestone columns: Set up on FitTrack, Sent onboarding, Onboarding form, MFP diary open, Paid, Initial call booked, Initial call done, and Week 1–6 check-ins, plus a Done count. Horizontally scrollable with a pinned name column, and a "My clients / All coaches" scope toggle (defaults to the coach's own clients). The component takes a `staff` prop ({ user_id, name }[]) from AccountabilityCoachPanel to resolve coach names.
- EVERY cell is tappable and persists to acc_clients.setup_tracker (jsonb). The effective value for a cell = the coach's manual tick if they've set one, else the auto-derived value. Do NOT make any column read-only.
- AUTO pre-fill (shown when the coach hasn't overridden): Onboarding form (onboardingStatus complete / onboarding_done), MFP diary (tracking_app set or mfp_username present), Week 1–6 (acc_checkins submitted for that week, keys w1..w6).
- Manual keys: setup_fittrack, sent_onboarding, paid, initial_call_booked, initial_call (plus overrides of any auto key incl. onboarding_form, mfp, w1..w6).
- The component fetches its OWN fresh client list via getCohortClients(cohort.id) in load() (not just the parent prop) and keeps rows in sync on save, so ticks don't revert when switching tabs. Keep this — relying only on a stale parent prop makes saved ticks disappear.
- REQUIRES acc_setup_tracker.sql to have been run (adds the setup_tracker column); without it every save fails.
- `src/lib/accountabilityProgramme.ts`: added the `setup_tracker` field on AccClient, plus SETUP_COLUMNS, SETUP_WEEKS, autoSetupState(client, checkins) and setSetupTracker(clientId, obj). Keep these.
- `src/components/AccountabilityCoachPanel.tsx`: added a "Setup tracker" tab between Roster and Check-ins.
- Backed by `acc_setup_tracker.sql` (adds the `setup_tracker` jsonb column) — already deployed. Do not drop the column or the setup_tracker reads/writes.

5) ACCOUNTABILITY ENROL PICKER — search by name OR email
- `src/components/AccRosterTab.tsx`: the "enrol a client" member picker previously filtered `availableMembers` on email only, so searching a member's name found nothing. It now matches on `full_name` + `email` (`\`${full_name} ${email}\`.toLowerCase().includes(q)\`, empty query shows all), and the input placeholder is "Search by name or email…". Keep the name+email match.

6) ACCOUNTABILITY — COACH NOTES on the client profile (new)
- A dated coach-notes timeline on the accountability client console (AccountabilityClientConsole) for conversation round-ups: in-person onboarding sessions, in-person (non-Loom) check-ins, and ad-hoc notes. Separate from acc_checkins.coach_reply_note (that stays the reply on a specific weekly check-in).
- New file `src/components/CoachNotesCard.tsx`: add-note form (kind pills Onboarding/Check-in/General; Check-in reveals an optional week number), textarea, Save; plus a newest-first timeline with per-note Copy + Delete, and a "Copy all for Claude" button that assembles the client's context (name, nutrition approach, why, baseline) + all notes oldest-first into one pastable block.
- New file `src/lib/coachNotes.ts`: CoachNote type, COACH_NOTE_KINDS, getCoachNotes / addCoachNote / deleteCoachNote.
- `src/components/AccountabilityClientConsole.tsx`: mounts <CoachNotesCard client={client} clientName={name} /> just after the header, before TrackingTargetsCard.
- Backed by `acc_coach_notes.sql` (new staff-only table acc_coach_notes) — already deployed. Keep the table + reads/writes.

7) ACCOUNTABILITY — CLIENT-FACING "THIS WEEK'S FOCUS" (new)
- A per-week, client-VISIBLE note the coach sets: what you agreed to focus on for the week. Separate from the private acc_coach_notes.
- New file `src/components/ClientFocusCard.tsx`: coach editor on AccountabilityClientConsole — week selector (defaults to the client's current week; dots mark weeks that already have a focus), textarea, Save (upsert per client+week). Clearly labelled "The client sees this on their dashboard".
- New file `src/lib/clientFocus.ts`: ClientFocus type, getClientFocus / getFocusForWeek / upsertClientFocus / deleteClientFocus.
- `src/components/AccountabilityClientConsole.tsx`: mounts <ClientFocusCard client currentWeek totalWeeks> above the Coach notes card.
- `src/pages/Accountability.tsx` (member dashboard): fetches the current week's focus (getFocusForWeek) and shows it at the top of the dashboard as a highlighted "Your focus this week" card, signed off with the client's ASSIGNED coach name (from coach_user_id, not whoever saved it). Only renders when a focus exists for the current week.
- Backed by `acc_client_focus.sql` (new table; member reads own via acc_clients.user_id, staff write only) — already deployed. Keep the member-read / staff-write RLS.

8) SELF-LOGGED WORKOUTS — repeat + "My workouts" (new)
- Members logging their own (non-programme) session can now save it as a reusable workout and repeat past ones.
- New file `src/lib/customWorkouts.ts`: getCustomWorkouts / saveCustomWorkout / deleteCustomWorkout (Supabase `custom_workouts` table + localStorage cache). cleanExercises() normalises the saved shape and resets `completed`.
- `src/components/AdLibLogSheet.tsx`: new optional `prefill?: { name, exercises }` prop — when the sheet opens with a prefill it jumps straight into workout mode seeded with those exercises. IMPORTANT: it seeds each exercise from its MOST RECENT logged sets via getExerciseHistory(name, 1) (so progress carries forward every repeat), falling back to the saved template's sets only when there's no history. Fresh ids, nothing marked completed. Added a "Save as My workout (reuse later)" button beside "Save workout" that calls saveCustomWorkout. Keep the latest-history seeding — do NOT revert to seeding from the saved snapshot (that froze weights at save time).
- `src/pages/Workouts.tsx`: a "Mine" filter tab (added to the ["All","Workouts","Programs"] row) shows ONLY the member's own saved custom workouts — tap to start (prefilled logger), delete, with an empty-state prompt. It does NOT list our programme sessions. The browse template grid is excluded under the Mine tab (`.filter(() => activeTab !== "Mine")`). Wires `prefill={adLibPrefill}` into <AdLibLogSheet> and reloads the saved list when the sheet closes. Helpers: startCustomWorkout, removeCustomWorkout. (The earlier always-on "My workouts" strip + recent-self-logged list were removed — don't reintroduce them.)
- Past Lifts already keys off exercise name, so repeated workouts show previous numbers automatically. Custom-typed exercises log + show history by name too (they're not added to the searchable library — that's fine).
- Backed by `custom_workouts.sql` (own-row RLS) — already deployed. Keep the table + the prefill/save wiring.

Also keep everything already recorded in claude/catch-up-session-consolidated.md — especially src/lib/trialNurture.ts and src/lib/memberMessages.ts, which must NOT be regenerated.
