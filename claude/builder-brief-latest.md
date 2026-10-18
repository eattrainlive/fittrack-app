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
- New file `src/components/AccountabilitySetupTracker.tsx`: a spreadsheet-style grid on the coach accountability panel (mirrors the "6 Week Nutrition Members" Google Sheet). Rows = cohort clients, columns = Set up on FitTrack, Sent onboarding, Onboarding form, MFP diary open, Paid, Initial call done, and Week 1–6 check-ins, plus a Done count. Horizontally scrollable with a pinned name column, and a "My clients / All coaches" scope toggle (defaults to the coach's own clients).
- AUTO cells (read-only, grey, tick themselves from app data): Onboarding form (onboardingStatus complete / onboarding_done), MFP diary (tracking_app set or mfp_username present), Week 1–6 (acc_checkins submitted for that week).
- MANUAL cells (tappable, persisted): Set up on FitTrack, Sent onboarding, Paid, Initial call done — stored in acc_clients.setup_tracker (jsonb).
- `src/lib/accountabilityProgramme.ts`: added the `setup_tracker` field on AccClient, plus SETUP_COLUMNS, SETUP_WEEKS, autoSetupState(client, checkins) and setSetupTracker(clientId, obj). Keep these.
- `src/components/AccountabilityCoachPanel.tsx`: added a "Setup tracker" tab between Roster and Check-ins.
- Backed by `acc_setup_tracker.sql` (adds the `setup_tracker` jsonb column) — already deployed. Do not drop the column or the setup_tracker reads/writes.

Also keep everything already recorded in claude/catch-up-session-consolidated.md — especially src/lib/trialNurture.ts and src/lib/memberMessages.ts, which must NOT be regenerated.
