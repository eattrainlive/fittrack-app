# FitTrack — status

_Last updated: 2026-10-10_

---

## 👋 HANDSHAKE — read this first (shared by the planning chat, the build chat, and Michael)
How we work: the **planning chat** writes requirements; the **build chat** (owns the repo) decides
implementation, writes SQL + builder prompts, and guards against breakage; **Michael** runs SQL in
Supabase, pastes prompts into the AI builder, and pushes via GitHub Desktop. The repo is the source of
truth; this file is the single shared state. Keep this section short and current — detail lives below.

**⚠️ Builder exports OVERWRITE `package.json` (it's in the merge allow-list).** The `heic-to` dependency
(HEIC→JPEG photo conversion) is a build-chat addition the builder doesn't know about, so every export that
lacks it STRIPS it → photos go back to HEIC. EVERY time an export is pasted to the builder, also paste
`catch-up-heic-switch-to-heic-to.md` (keeps `heic-to` in package.json + the two-pronged imageUpload.ts).
After each merge, verify `grep heic-to package.json` before pushing.

**Hard schema gotchas (the live DB has drifted from old migrations — check before writing queries):**
- `member_habits`: `id, member_id, habit_id, habit_name, status, position, started_at` — NO `user_id`,
  NO `name`. `habit_checkins`: `member_id, habit_id, member_habit_id, date, done, count_value`.
- `member_measurements`: `member_id` + `date` (NO `user_id`, NO `created_at`); cols waist/hips/chest/
  thigh/arm (NO tummy/bodyfat).
- `acc_clients`: has `enrolled_at` (NO `created_at`); plus ad-hoc `onboarding_done`, `onboarding_completed_at`.
- `staff_users`: only `user_id` + `note` (NO email). `members.id` == auth uid.
- `nutrition_approach` ∈ {plate, tracking} (DB check — use a select, not free text).
- Programme habits 101–104 are `active=false` (hidden from member pickers via getHabitLibrary filter).

**Current focus:** 6-Week Accountability cohort — onboarding opens Mon 12 Oct, Week 1 starts 19 Oct.

**Accountability — done & live:** onboarding (required-5 + late-joiner card + roster x/5), content load
(weeks 0–6 + hidden habits + stack), C1 stacked habit rings (+ fixed broken member_habits/checkins
queries), roster bug fixes (enrolled clients show, coach list, approach select, measurements).

**Accountability — PENDING (Michael):** push export 69 (C3) + the 2 video-embed files
(`accWeekContent.ts`, `accPreviewData.ts`) + paste `catch-up-acc-video-embed-preview.md`.
✅ `acc_checkin_loom_url.sql` run. Video-embed fix: getEmbedUrl now only embeds absolute http(s) URLs
(placeholder "#" was loading the app shell in the iframe); preview seed now has real per-week Vimeo
(was one shared demo week with "#" links). Live content was already correct.
(Roster fixes 1–3 confirmed live via coach-assign working; measurements fix #4 — verify dashboard shows
latest measurements.)

**Accountability — build queue (priority order):**
1. ✅ Home-screen entry point (built, export 66 — AccountabilityCard self-hides + renders on Index Home).
2. ✅ Video cards in lessons (built, export 66 — new `AccResourceList`: play-icon cards + in-app dialog).
3. ✅ C4 live-call link (built — `acc_cohort_call_link.sql` run; `setCohortCall` + Roster editor +
   `LiveCallCard` with Wed Live-now logic). Michael sets the Zoom link in Roster header.
4. ✅ C2 weekly check-in upgrades (built, export 22): avg-steps Q + computed avg-weight (from
   bodyweight_history window) → acc_checkins.avg_steps/avg_weight; week-specific Q (checkin_addon) saved
   as responses.weekQ/weekA + shown in coach console; copy fixes (Q2 unlocked habits, Q8 no-SOS wks1–2,
   Q10 week-3 midpoint photo); Steps card shows target + last-week avg. INCLUDES the critical saveCheckin
   fix (acc_checkins has no user_id/cohort_id). PENDING push + a real end-to-end check-in test.
5. ✅ Nutrition-tracking visibility — MEMBER side live (export 23 pushed; `acc_tracking_fields.sql` run):
   TrackingBlock in weekly+final check-ins (gated on nutrition_approach='tracking'), onboarding "which app"
   Q (additive, required-5 untouched), roster plate/tracking select. COACH side now BUILT too (export 24):
   new `TrackingTargetsCard` (targets editor via setTrackingTargets + MFP diary link / per-tracker
   screenshot hint + suggested-protein-from-baseline) and `CheckinCard` per-week numbers (days/7 + <4 Low
   flag, calories ±10% amber band, protein green≥target/amber, screenshot thumbnail). Reviewed clean,
   parses OK. PUSHED (export 24, then export 68). Also fixed in export 68: roster approach change now
   calls reload() (Plate⇄Tracking updated live, not only after refresh) — `catch-up-acc-approach-refresh.md`.
   Minor leftovers (non-blocking): dead TRACKING_APP_LABELS const in AccountabilityClientConsole.tsx;
   suggested-protein reads baseline.weight (verify key).
8. Onboarding "Save failed — retry" — FIXED in source (AccountabilityOnboarding.tsx): was
   `saveBodyweight(Number(f.q10))` (number spread → no weight → sync error); now `{ weight: … }`.
   Catch-up: `catch-up-acc-onboarding-bodyweight.md`. + preview client-name fix
   (`catch-up-acc-preview-client-names.md`). → push both files + paste catch-ups.
9. ✅ HEIC photos — BUILT (export 26): heic2any + `src/lib/imageUpload.ts` toDisplayableImage(); all
   programme photo flows routed (onboarding baseline, weekly/final check-in photos, tracking screenshot,
   progress, nutrition). Reviewed clean. NOT yet routed (non-programme, low priority): Profile.tsx avatar,
   Admin.tsx uploads. PENDING: Michael push export 26.
   ⚠️ Preview client-name fix was DROPPED by export 26 again — RE-APPLIED in source (AccountabilityPreview.tsx).
   Builder must keep `catch-up-acc-preview-client-names.md` or it'll keep reverting.
   ⚠️ HEIC conversion was failing silently (heic2any double-default export → wrong callable → fell back to
   HEIC). FIXED in source `src/lib/imageUpload.ts` (robust callable resolution + array handling + logs
   error). Catch-up: `catch-up-heic-convert-robust.md`. CONFIRMED WORKING by Michael (downloads .jpg now).
10. ✅ Front/Side/Back photos end-to-end — BUILT (export 27), reviewed clean, all files parse. Onboarding
   Back tile (front+side required, back optional, onboardingStatus reads object); weekly check-in 3 pose
   tiles → responses.photos {front,side,back} (+legacy q10photo kept); final check-in adds back; dashboard
   Then (baseline F/S/B, legacy-array fallback) vs Now (latest check-in with photos). PENDING: push export 27.
   ⚠️ Export 27 REVERTED imageUpload.ts + AccountabilityPreview.tsx (names) AGAIN — both re-applied.
   Bodyweight fix survived. Combined catch-up for the two recurring fixes: `catch-up-KEEP-these-two-fixes.md`.
11. HEIC root cause = heic2any's old libheif ("ERR_LIBHEIF format not supported" on modern iPhone HEIC).
   FIXED in source: package.json heic2any→heic-to (^1.6.6); REWROTE `src/lib/imageUpload.ts` =
   native <img>+canvas decode first (iOS decodes HEIC natively; downscales to 1600px → also fixes the
   upload TIMEOUT from multi-MB photos) + heic-to fallback for desktop Chrome. Catch-up:
   `catch-up-heic-switch-to-heic-to.md` (SUPERSEDES the heic2any catch-ups). No lockfile → Netlify npm
   install picks up heic-to. ✅ CONFIRMED WORKING on iPhone (front+side render as JPEG, no timeout).
   Pushed + deployed.
   (original brief text below — SUPERSEDES
   `brief-dashboard-baseline-photos.md` — discard that one). Onboarding adds Back tile (front+side still
   required, back optional); weekly check-in goes 1→3 pose tiles; final check-in adds back; dashboard
   Photos card = Then (baseline F/S/B) vs Now (latest check-in F/S/B). Standardise on
   baseline.photos / responses.photos = { front, side, back }; keep reading old array/q10photo/afterFront
   keys on prefill. No SQL. Also fixes the "No baseline" dashboard bug (dashboard read member_photos, not
   baseline.photos). → paste to builder.
7. ✅ Filmable check-in preview — BUILT (export 25), reviewed clean, parses OK. `demo` prop on
   WeeklyCheckin + FinalCheckin + TrackingBlock (interactive, skips all saves/uploads); Plate/Tracking
   toggle + "Preview check-in form" card in AccountabilityPreview (Coach panel → Preview). No SQL.
   PENDING: Michael push export 25. (Video-embed fixes survived this export.)
6. ✅ C3 week-3 SOS plan + step target — BUILT (export 69), reviewed clean, parses OK. WeeklyCheckin
   week-3 SOS section (3 fields) + step-target (prefill baseline+1500) → `saveMySosPlan`; new
   `StepTargetCard` coach editor (all clients) via `setStepTarget`; editable dashboard `SosPlanCard`
   (readOnly prop respected). SOS block round-trips: `buildSosPlan` ⇄ `parseSosPlan` (WeeklyCheckin +
   Sections). No SQL. PENDING: Michael push export 69.

**Other workstreams (live):** Staff Hub (Insights tab + call lists), win-back engine (gym + PT, GHL).

---

## Stack
- React + Vite PWA, Tailwind/shadcn. Hosted on **Netlify** (auto-deploys from `main`).
- **Supabase** — Postgres + RLS + Deno edge functions. Member app + staff hub.
- **Netlify functions** (`netlify/functions/`) — server-side proxies that hold secrets
  (e.g. `staffhub` → ETL Staff Hub Apps Script).
- App built via the AI builder (screens) + this repo (source of truth). See `claude/workflow.md`.

## Repo layout
- `src/`, `public/` — client (builder drafts these; merge with `scripts/merge-builder-export.py`).
- `netlify/functions/` — Netlify serverless functions (Claude owns).
- `supabase/functions/<name>/index.ts` — Supabase edge functions, mirrored here for version control.
- `supabase/sql/` — SQL (schema, RLS, migrations, diagnostics) history.
- `claude/` — workflow, status, builder prompts.

> Backend in the repo MIRRORS what's deployed in Supabase (deployed via the dashboard). When Claude
> changes an edge function or runs SQL, update both the dashboard AND the repo copy.

## Deployed edge functions (16)
check-in · coach-agent · error-recent · exercise-info · generate-workout · ghl-review-webhook ·
group-pt-generate · gymos-webhook · manage-members · manage-nutrition · member-activity ·
member-engagement · progress-summary · usage-report · workout-admin  (+ import-paxton)

## Secrets (in dashboards only — never in repo/client)
- Supabase function secrets: SERVICE_ROLE, STAFF_SECRET, GHL_WEBHOOK_URL, GYMOS_WEBHOOK_SECRET,
  INVITE_REDIRECT, TRIAL_STARTED_WEBHOOK_URL (if set), ANTHROPIC_API_KEY, COACH_USER_ID.
- Netlify env: STAFFHUB_SCRIPT_URL, STAFFHUB_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  GHL_WHATSAPP_WEBHOOK_URL (reach-out WhatsApp trigger).

## In progress
- **ETL Staff Hub** inside the app, reading a Google Apps Script via the `staffhub` Netlify proxy.
  - Screen 1 "This Month" — LIVE and pulling real metrics. Comparison sub-lines fixed (now read
    "down from X last month" with direction icon, not the delta as the lead number).
  - Call lists (Trialists / Reach out / Win back): BUILT and merged (export 61). New
    `StaffHubCallLists.tsx`, `StaffHubTab.tsx`, `useStaffHubData.ts` (one shared fetch for numbers +
    lists); `StaffHubMetrics.tsx` refactored to accept shared data as props (guarded against
    double-fetch); `Admin.tsx` renders `<StaffHubTab/>` (whole page already staff-gated). Outcome
    logging via `logStaffActions` → append-only Actions tab. Re-applied the no-PII-cache fix after
    the export reverted it; catch-up prompt for the builder: `claude/catch-up-staffhub-call-lists.md`.
    Couldn't run a full typecheck in the sandbox (npm install blocked on the SheetJS CDN dep) —
    verified by static review + import/type checks. LIVE and working (confirmed 2026-10-08). Reminder:
    paste `claude/catch-up-staffhub-call-lists.md` into the builder so it keeps the no-PII-cache fix.
  - Trialist STAGE BUCKETS (in progress): Trialists tab becomes a mini pipeline — To contact /
    Booked review / Joined / Not joined. Auto-moves from live data (trial_cohort.converted → Joined
    [locked, ground truth; catches the sheet-vs-Supabase lag, e.g. Michelle Purdy]; review_bookings →
    Booked review) + manual override. New: `supabase/sql/staff_trial_stage_setup.sql` (override table,
    staff RLS), `src/lib/trialStages.ts` (`useTrialStages` hook — joins cohort/reviews/overrides,
    computes stage, setStage persists + logs). Builder brief (incl. the hook to create in the builder):
    `claude/builder-prompt-staffhub-trialist-buckets.md`. BUILT + merged (export 62): new
    `TrialistPipeline.tsx` (4 stage pills + move dropdown), `staffHubShared.tsx` (shared card/sheet
    helpers the builder factored out), wired into the Trialists tab (reach-out/win-back untouched).
    No-PII-cache fix held through this export. Verified by static review (imports/types/braces all OK;
    full typecheck still blocked by the SheetJS CDN dep). PENDING: confirm SQL was run in Supabase,
    then push + test live. LIVE and working (confirmed 2026-10-08). Minor known nit: clicking a
    card's already-current stage shows a "Moved to X" toast but does nothing (harmless no-op).
  - Reach out + Win back CONTACT CADENCE (in progress): per-person call cadence — up to 3 calls, then
    WhatsApp, note each touch, status buckets. Reach out → To do / In progress / Done; Win back → To
    do / In progress / Joined / Not interested. New: `supabase/sql/staff_contact_progress_setup.sql`
    (per email+list_type row: attempts, whatsapp_sent, status, last_note/outcome, owner; staff RLS),
    `src/lib/contactProgress.ts` (`useContactProgress` hook — buckets + `logContact` advances cadence,
    upserts, logs to Actions tab). WhatsApp step just records the touch (no phone in the data). Builder
    brief (incl. hook to create): `claude/builder-prompt-staffhub-contact-cadence.md`. BUILT + merged
    (export 63): Reach out & Win back now use a shared `ContactCadenceList` in StaffHubCallLists.tsx
    (status pills + Call1·2·3·WhatsApp tracker + No answer/WhatsApp/Answered + log sheet w/ outcome
    chips + note). Trialists/proxy untouched; no-PII-cache fix held. Verified by static review
    (imports/types/braces OK; full typecheck still blocked by SheetJS CDN dep). LIVE and working
    (confirmed 2026-10-08).
  - WhatsApp → GHL automation (in progress): "Send WhatsApp" at the WhatsApp step fires a GHL inbound
    webhook (coach-confirmed, not auto). New Netlify fn `netlify/functions/staffhub-whatsapp.js`
    (staff-verified, holds GHL_WHATSAPP_WEBHOOK_URL server-side) + `contactProgress.ts` fires it in
    the whatsapp branch (only marks sent if GHL accepts). GHL + Netlify-env steps:
    `claude/GHL_whatsapp_reachout_setup.md`; builder catch-up: `claude/catch-up-contactprogress-whatsapp.md`.
    LIVE and working (tested 2026-10-08).
  - Win-back ROUTES (in progress): lapsed members split by old membership → Gym/Core+ ("Gym route":
    2 weeks free then restart) vs Classes/PT/Group PT ("Coached route": free goal-reset + 4-week
    kickstart, with gym-access ease-back fallback). `contactProgress.ts` adds `winbackRoute()` +
    passes route/membership/category in the lapsed WhatsApp payload; `staffhub-whatsapp.js` forwards
    them to GHL; win-back cards show a route badge + offer hint. GHL branch steps + landing-page copy:
    `claude/GHL_winback_routes_and_landing_pages.md`; builder catch-up: `claude/catch-up-winback-routes.md`.
    PENDING: build 2 landing pages + GHL branches (list_type→route), push repo, paste catch-up, test.
- Trial nurture sequence (v2) designed; GHL build + Phase-2 behaviour webhooks pending.

## Insights tab (in progress)
- Merging Usage + This-Month KPIs into one **Insights** tab (This month / Trends / Usage switch) +
  splitting call lists into their own **Call Lists** tab. Backend already serves the yearly series —
  the Apps Script returns `months` (Jan–Dec), `year` (YTD), `labels` alongside `metrics`. Extended
  `staffHubMetrics.ts` (`MonthRow` type + months/year/labels on StaffHubResponse, cached — non-PII).
  Builder brief (incl. lib edits + new TrendsView with recharts): `claude/builder-prompt-staffhub-insights-tab.md`.
  No YoY yet (one year of data). BUILT + merged (export 64): `InsightsTab.tsx` (This month/Trends/
  Usage switch), `TrendsView.tsx` (Year-so-far cards + metric picker + recharts bar, keys/labels from
  payload), Admin tabs → Insights + Call Lists, StaffHubTab trimmed to call-lists-only. Win-back/
  WhatsApp/PII-cache all verified intact through this export. Static review clean (imports/types/
  braces OK; full typecheck still blocked by SheetJS CDN). PENDING: push + test live.

## Accountability (6-week, cohort starts 19 Oct)
- Onboarding launch (BUILT + merged, export 20): required 5-item minimum (why, front+side photos,
  weight+3 measurements, baseline steps, nutrition approach) via `onboardingStatus()` single source of
  truth; `onboarding_completed_at` stamped on completion; coach "mark onboarded" sets BOTH
  `onboarding_done`+`onboarding_completed_at` (`setOnboardingComplete`); dashboard "Finish setting up"
  card for late joiners; Roster x/5 + "Onboarding incomplete" filter (new `AccRosterTab.tsx`). SQL run
  (`acc_onboarding_completed.sql`: +onboarding_completed_at, cohort start → 2026-10-19). No win-back/
  Staff Hub regressions. LIVE (pushed).
- Working model (from 9 Oct): a separate planning chat sends requirements; this chat owns
  implementation + guards against breakage. Their pushes land in-repo (commit 669f9a5: acc_checkin_addon.sql,
  builder-prompt-acc-checkin-week3.md, status bullets — verified no backend wiped).
- Content load (RUN): `acc_content_load_oct2026.sql` (week content 0–6 + habits 101–104 `active=false`
  + acc_week_habits remap W1→101,102 · W2→1 · W3→103 · W4→104). Habits hidden from member pickers via
  getHabitLibrary `active!==false` filter (`trialGoals.ts`+`memberGoals.ts`, pushed; catch-up
  `catch-up-hide-inactive-habits.md`). `acc_checkin_addon.sql` RUN (checkin_addon col + W1–5 Qs).
  `acc_week_habits.sql` RUN once — do NOT re-run (would re-add old library habits to the stack).
- SCHEMA NOTE: `member_habits` has NO user_id/name — real cols: id, member_id, habit_id, habit_name,
  status, position, started_at. The acc dashboard queried user_id/name (also habit_checkins) → silently
  empty → acc habit rings currently BROKEN. C1 fixes both queries + adds the stack.
- C1 stacked rings (BUILT + merged, export 65): new `src/lib/accWeekHabits.ts` (`ensureAccHabitsUnlocked`
  + `getAccWeekHabits`/`getAccWeekHabitIds`); dashboard + accPreviewData fixed to member_id/habit_name
  (the pre-existing broken-query bug); rings sourced from the stack w/ "New this week"; unlock guarded
  in preview. No regressions. Verified by static review. PENDING: push + test.
- C4 live-call link (READY, by 21 Oct): `acc_cohort_call_link.sql` (+call_url/call_label on acc_cohorts)
  + `builder-prompt-acc-livecall.md` (staff editor + member "Join live call" card, Live-now Wed 12–13 UK).
- C2 weekly check-in upgrades (by 25 Oct): avg_steps Q, computed avg_weight, week-specific Q (checkin_addon
  seeded), copy fixes. Spec: `builder-prompt-acc-checkin-week3.md` (planning). Brief TBW.
- C3 week-3 SOS plan + step_target capture (by 8 Nov). Brief TBW.
- Breakdown doc for planning: `/Programming/ETL_6week_accountability_breakdown.md`.
- Programme content (2026-10-09, PREPPED): content load script lives in Michael's "6 Week Programmes"
  folder (`App Content Load - Oct 26 cohort.sql`) — fills `acc_week_content` W0–W6 (teaching, video,
  resources from a URL list at the top) and adds programme-worded tick habits 101–104 (Balanced plate,
  Hit my water target, Hit my step target, Snacks planned) + REMAPS `acc_week_habits` to
  101,102 (W1) · 1 (W2) · 103 (W3) · 104 (W4). Run order: `acc_week_habits.sql` → content load →
  `acc_checkin_addon.sql`. Videos must be YouTube/Vimeo/Loom links (Everfit-hosted won't embed).
- Check-in upgrade (2026-10-09, PREPPED, not built): `supabase/sql/acc_checkin_addon.sql`
  (+`acc_week_content.checkin_addon`, W1–5 questions seeded) + builder brief
  `claude/builder-prompt-acc-checkin-week3.md` — W3 SOS plan → `acc_clients.sos_plan`, W3 step target →
  `step_target` (Steps card drops the 8000 default), weekly `avg_steps` question + computed
  `avg_weight`, week add-on question, Q2/Q8/Q10 copy. Live by 25 Oct (SOS/steps by 8 Nov).
  Order for the builder: cumulative habits brief first (needed by 19 Oct), then this one.
- Decisions (2026-10-09): no WhatsApp group — cohort wall to be built instead; live call Wednesdays
  12:00; daily nudges via GHL WhatsApp (Week 1 daily, then Mon/Wed/Sun + triggered); steps are manual;
  late joiners allowed; re-sign offer on hold. Planning doc: Claude doc "6-Week Accountability
  Programme — App Build Plan (19 Oct cohort)".

## Known loose ends
- `public.notifications` table missing → console error PGRST205 from the Notifications feature (needs
  a table or the feature disabling).
- Some exercise-library entries are non-exercises ("How To Use…", "Overview") — to be cleaned.
- 2026-10-08: a raw builder export was committed directly (the "Build" commits) and DELETED
  `netlify/functions/staffhub.js` (commit 852c1fc) — the live Staff Hub proxy. Restored from
  b7cdfd0. LESSON: never commit a builder export straight through GitHub Desktop — always run
  `scripts/merge-builder-export.py` first (it skips `netlify/`). If a stray "Build" commit lands,
  check `netlify/` and `supabase/` survived.

## Workflow switch (this change)
- Repo connected to Cowork; added `scripts/merge-builder-export.py`, `claude/` docs, and brought the
  backend (`supabase/`) into the repo. From now: Claude writes/tests backend in-repo; builder drafts
  screens; merge via the script; review diff; push. See `claude/workflow.md`.

12. ✅ Coach "view full onboarding + check-in answers" — BUILT (export 70, 'fittrack-source 70'), reviewed
   clean, all parse. accFormQuestions.ts (ONBOARDING/CHECKIN/FINAL_CHECKIN_QUESTIONS + fmtAnswer +
   fallbackLabel); onboarding "View full answers" in AccountabilityCoachPanel; new AccCheckinCard with
   final-aware "View all responses" (skips curated+blanks, sweeps unmapped keys). Export KEPT heic-to +
   preview-names + bodyweight fixes (combined catch-up worked). PENDING: push export 70.
   (brief: `brief-coach-view-full-forms.md`)
   All answers already saved (acc_clients.onboarding / acc_checkins.responses); coach only sees summary.
   Add centralised question-label maps (accFormQuestions.ts from existing QLabels) + "View full answers"
   expander on onboarding summary (AccountabilityCoachPanel) + "View all responses" on each CheckinCard
   (AccountabilityClientConsole). Display-only, no SQL. → paste to builder.

13. ✅ Home-screen "Today's habits" quick check-off — BUILT (export 71), reviewed. TodayHabitsCard on
   Index (under AccountabilityCard): active member_habits, toggles today's habit_checkins, done count,
   self-hides if none. FIXED a done-match bug (was c.habit_id===h.id; h.id is the member_habit id) →
   now matches on member_habit_id OR habit_id and saves both ids so it syncs with dashboard rings both
   ways. Catch-up: `catch-up-today-habits-match.md`. All recurring fixes survived. PENDING: push export 71
   + edited TodayHabitsCard.tsx. (brief: `brief-home-habit-checkoff.md`) New TodayHabitsCard on Index (under AccountabilityCard): lists active
   member_habits, toggles today's habit_checkins via save/deleteHabitCheckin, done count, self-hides if
   none. Reuses existing plumbing; syncs with dashboard rings. No SQL. → paste to builder.

14. ✅ Million Metre erg challenge — BUILT (export 28), reviewed. SQL erg_challenge.sql (table + RLS +
   erg_challenge_summary RPC; idempotent w/ alter-add for source/source_ref) RUN by Michael. Lib
   ergChallenge.ts (ERG_MACHINES bike=2M/rower=1M/ski=1M, deadline Xmas, summary RPC, log, syncWorkoutErgMetres);
   ErgChallengeCard (home) + ErgLogDialog + ErgChallengePage (/challenge) + Community link. Phase 2
   auto-count from workouts wired into saveWorkoutToHistory (upsert on source_ref, km→m, only bike/row/ski
   ergs). FIXED: ErgChallengeCard was mounted twice in Index.tsx → now once. All recurring fixes survived.
   PENDING: push export 28 + Index.tsx fix.

15. ✅ Home-screen tidy-up — BUILT (export 29), reviewed, all parse. CheckInHeaderButton (QR in header);
   removed Up Next strip + MemberProgressCard + always-on goals card (stats grid kept); first-login goals
   setup gated (new+non-enrolled, hideHabits); goals/targets editor lives on Progress hub; TodayHabitsCard
   HabitsPickerDialog (Set/Edit habits, general only) via no-clobber setMonthlyHabits; monthly "reassess
   your habits?" nudge (never resets, goals_month). FIXED: added hideHabits to MemberProgressHub's
   MemberGoalsCard so Progress edits goals/targets only (habits single-sourced in tracker). All recurring
   fixes survived; erg card single mount. PENDING: push export 29 + MemberProgressHub.tsx; tell builder to
   keep hideHabits on that card. (brief: brief-home-tidyup.md)

16. ✅ Erg challenge — staff tools — BUILT (export 72), reviewed, parses. SQL updated in erg_challenge.sql (widen source check to allow 'staff';
   staff INSERT policy = log for any member; erg_challenge_leaderboard() RPC = per-member totals, raises
   for non-staff). → Michael re-run SQL. BRIEF OUT: brief-erg-staff-tools.md — lib logErgMetresForMember +
   getErgLeaderboard; staff-only section on ErgChallengePage (member picker + machine + metres form;
   everyone's-totals table) gated by isStaff() ({staff && …} wraps the block). Members still see only
   collective + own; leaderboard RPC raises for non-staff. All recurring fixes survived. PENDING: push export 72.

17. ✅ Call-list activity card — BUILT (export 73) + FIXED crash: MemberActivityModal did s.prs.length /
   act.months.map unguarded → threw for a contact with no app data. Guarded (s.prs ?? [], act.months ?? []).
   Then ActivityWinsGrid crashed on .toLocaleString() of undefined for NON-APP contacts (sparse
   progress-summary). FIXED: normalise `s` in MemberActivityModal (default all numeric fields to 0, prs []).
   Also guarded CoachTrialReviewModal s.prs. Only affected people not active on the app. Push
   MemberActivityModal.tsx + CoachTrialReviewModal.tsx; tell builder to keep the normalise + guards.
   Shared ActivityButton + Add an info/activity icon button
   to each contact card in StaffHubCallLists (Reach out + Win back, ContactCadenceCard) + CurrentTrialistsBoard
   that opens the same MemberActivityModal as the Members grid. Modal resolves by email (member-activity edge
   fn takes memberUserId OR memberEmail), so call-list contacts work with no backend change. Don't hijack the
   existing card tap (cadence sheet). No SQL. → paste to builder.

18. ✅ Mandatory PAR-Q — BUILT (export 74), reviewed, parses. SQL par_q.sql (table + RLS + par_q_status_all
   RPC) → Michael run. parq.ts (PARQ_QUESTIONS x7, getMyParqStatus/getMemberParqStatus, saveParq, 12mo
   validity); ParqForm (7 Qs, any-yes GP notice, declaration name+agree, fail-soft skip); ParqGate wired in
   App.tsx both route blocks (staff exempt, no-user passthrough, /auth//reset-password//checkin//tv bypass,
   fail-soft); staff visibility on MemberActivityModal + StaffParqList in Admin. Applies to all (12mo expiry
   catches existing members). heic-to kept this export. ✅ par_q.sql run + export 74 pushed.
   ⚠️ Export 74 REVERTED activity-card no-data guards again → RE-APPLIED MemberActivityModal.tsx (s
   normalise) + CoachTrialReviewModal.tsx (prs guards). Catch-up: catch-up-activity-card-guards.md. ✅ Pushed + catch-up pasted.

19. Supabase Realtime latency incident (12–13 Oct) caused slow app load + empty members list + stuck
   "checking for unlinked" — NOT our code. Resolved on Supabase side. ParqGate hardened + PUSHED (checks
   once not per-nav, caches valid until expiry, 4s timeout → fail-open so it never hangs the app on a
   blip). Catch-up: catch-up-parqgate-resilient.md.
20. Trialists "not on app" — board fixed to read `onApp` (was `activated`; CurrentTrialistsBoard.tsx,
   committed). Catch-up: catch-up-trialists-onapp.md. RE-TEST after Supabase recovery + members loading;
   if still wrong, run members-grid-vs-trialists-tab diagnostic (match vs onboarded_at).
21. Trialist nurture sequence — BUILT (engine + proxy + welcome hook done; cockpit UI = builder brief).
   30-day drip, 9 steps (welcome d1 AUTO, post_first d3, week1 d7, day10 momentum/reengage branch,
   halfway d14, results_review d21, ending_soon d25, decision d28). Welcome auto-fires + logs via
   gymos-webhook maybeStartTrial (TRIAL_STARTED_WEBHOOK_URL, step_key=welcome); all other steps Carla
   reviews+sends from the cockpit → /.netlify/functions/trial-nurture (staff-only) → GHL_TRIAL_NURTURE_
   WEBHOOK_URL (template_key + coach_note) → logs trial_nurture_log so no step repeats.
   FILES (committed): src/lib/trialNurture.ts (catalogue + due/overdue engine + attendance flags
   noShow/hotLead/neverAttended + branch-slot-satisfied-either-variant + UTC-stable day math + sendStep
   + getNurtureBoard/History); netlify/functions/trial-nurture.js (staff-only proxy, mirrors staffhub-
   whatsapp.js); gymos-webhook/index.ts maybeStartTrial (+welcome log). Engine unit-tested (day math,
   branch flip, flags, overdue grace all verified).
   DOCS: brief-trial-nurture-cockpit.md (builder UI brief, new "Trial Nurture" tab in call-lists);
   GHL_trial_nurture_setup.md (2 workflows A/B, Coach Note field, 9 WhatsApp templates, 2 env vars).
   SQL trial_nurture.sql already done. PENDING: run trial_nurture.sql; set Netlify GHL_TRIAL_NURTURE_
   WEBHOOK_URL + Supabase TRIAL_STARTED_WEBHOOK_URL; build GHL workflows A+B + 9 templates + Coach Note
   field; redeploy gymos-webhook; push repo; paste brief-trial-nurture-cockpit.md to builder.
   THEN iterate on Carla's screen UX (make it effective + easy for daily use).
   MERGE FIX (export 31): cockpit showed in builder preview but not live — repo had been pushed with
   only the lib, not the UI. Manually merged TrialNurtureCockpit.tsx + the "Trial Nurture" tab into
   StaffHubCallLists.tsx; KEPT repo trialNurture.ts (builder's copy logs to wrong table
   trial_nurture_sends vs our trial_nurture_log). Relaxed sendStep arg type for the cockpit's
   {email,name} call. All 3 files transpile clean. Catch-up: catch-up-trial-nurture-merge.md. → PUSH.
   Coach-note textarea: Enter blocked + newlines stripped (single paragraph, can't break the send).

23. WhatsApp conversation mirror (option 1 + 3 — keep the convo in-app, reply in GHL).
   Read-only thread on the member profile + one-click "Reply in GoHighLevel" deep-link. GHL stays
   system-of-record + send surface (free-text only within WhatsApp's 24h window, which GHL manages).
   FILES (committed): supabase/sql/member_messages.sql (table + staff-read RLS + wa_message_id
   idempotency); supabase/functions/wa-message-sync/index.ts (PUBLIC ?key= receiver for GHL inbound+
   outbound message webhooks → upsert, tolerant field mapping, dedup on message_id); src/lib/
   memberMessages.ts (getMemberMessages, ghlConversationUrl deep-link, GHL_LOCATION_ID const to set).
   DOCS: brief-member-messages-thread.md (add Messages thread to MemberActivityModal); GHL_whatsapp_
   inbox_sync.md (2 GHL workflows inbound/outbound, env WA_SYNC_WEBHOOK_SECRET, set GHL_LOCATION_ID).
   LIVE + TESTED (2026-10-13): table ✅, edge fn deployed+alive ✅, GHL_LOCATION_ID=rY0ybTWzhrquwXgUIX62
   set ✅. GHL workflows built+tested: Customer Replied→WhatsApp (channel=whatsapp), Customer Replied→
   SMS (channel=sms), User Replied→out (channel=whatsapp, both channels multi-selected). All use Custom
   Webhook (PREMIUM action — must be enabled) POST to wa-message-sync?key=... with raw JSON body; Allow
   Re-Entry ON. Thread UI merged from export 75: MemberMessagesSection.tsx + mount in MemberActivityModal
   (KEPT repo memberMessages.ts — builder's copy dropped location id + wrong deep-link; catch-up-member-
   messages-merge.md). In-app thread shows both sides + WhatsApp/SMS badge + "Open conversation to reply"
   deep-link to exact GHL thread. Confirmed working end-to-end.
   GHL body gotchas learned: (1) no trailing chars after } (invalid JSON = step "Skipped"); (2) message
   time field not exposed — occurred_at defaults to now() on arrival; (3) pick {{message.body}} from
   Custom values picker. WA_SYNC_WEBHOOK_SECRET=wa_sync_B8c9PlF8JvIz0fLMW6g311HFx0laDS3o.
   STILL TODO when nurture sends are built: automated template sends don't fire "User Replied", so add
   a Custom Webhook mirror step (direction=out, template_key) after each send — baked into
   GHL_trial_nurture_setup.md. (Option 2, in-app send box for the open 24h window, deferred.)

22. Outage resilience batch (after the Supabase incident):
   - ✅ AppLayout green-ring lockout FIXED in source: 4s safety timeout on getSession (ring always clears)
     + TV/checkin/auth render BEFORE the ring (never wait on auth). Catch-up: catch-up-applayout-outage.md.
     Push AppLayout.tsx.
   - ✅ ParqGate hardened (checks once, caches, 4s timeout → fail-open). catch-up-parqgate-resilient.md.
   - BRIEF OUT: brief-outage-hardening.md — (1) check-in kiosk fail-soft + offline queue (localStorage
     fittrack_checkin_queue, flush on online/interval/next scan; never error-wall members or lose visits),
     (2) TV never-blank guard, (3) /schedule added to gate bypass + default URL cache, (4) TV "today" mode
     /tv/<programId>/today (auto-selects today's dated workout, rolls over, cache-backed), (5) "Copy TV
     link" button in TvDisplayTab. Confirmed PT workouts carry workout.date. No SQL. → paste to builder.
   Facts: getPrograms()/getExercises() = pure localStorage cache (TV + Manage Programmes work offline if
   device cache warm); app bundle served by Netlify (loads during Supabase outage); physical door = Paxton
   (FitTrack check-in is greeting+logging, so fail-soft is safe).

23. ✅ Trialists "not on app" — TRUE ROOT FOUND & FIXED. "On app" = members.onboarded_at present, but
   markOnboarded did a direct `update members set onboarded_at` which RLS BLOCKS (members = SELECT-only
   policy) → silently wrote 0 rows → onboarded_at never set for new sign-ups (existing members were
   backfilled once, hence only newer trialists wrong). FIX: mark_onboarded_fix.sql = SECURITY DEFINER
   RPC mark_onboarded() + one-time backfill (stamps onboarded_at for everyone with last_sign_in_at →
   flips current trialists to on-app immediately). onboarding.ts markOnboarded → supabase.rpc("mark_onboarded").
   Catch-up: catch-up-mark-onboarded-rpc.md. (Board onApp read-fix from earlier also required + survived
   export 30.) PENDING: run SQL + push onboarding.ts + export 30.

---

## Session 2026-10-20/21 — Trials hub v2 polish (planning + build, no builder export)

All hand-edited in the repo + esbuild-checked. Independent of each other — push in any order unless noted.

24. **Trial-type / Kickstart data fix** (the "trials don't match their type / Kickstart 21 = 0" bug).
    ROOT: `trial_cohort` only got rows for the two 30-day plans; £21 gym-only Kickstart people never
    booked a coached session so `maybeStartTrial` never fired → no row → classified as 0. Data gap,
    not detection (trialType()'s `/21/` already classifies "21 Days For £21"/"21 Day Kickstart"/
    "21 Day Classes Trial" correctly).
    FIX (2 parts): (a) `supabase/functions/gymos-webhook/index.ts` — new join branch: any `/21/` plan
    (not 30-day) creates a trial_cohort row with trial_product + starts the 21-day clock at join date
    (startDateUtc/eventTs), guarded `is null` so a re-add can't reset it; NO auto-welcome (Carla-sent
    until k21 copy approved). (b) `supabase/sql/backfill_kickstart21_cohort.sql` — one-off, seeds
    existing Kickstart members from gym_members (joined_on) into trial_cohort; safe to re-run.
    ✅ Backfill RUN by Michael — now Coached30 + Kickstart21 both populate (Kickstart 21 = 13 active).
    PENDING: deploy gymos-webhook (dashboard) for new joins going forward.
    Note: Kickstart conversion % reads low at first — conversions weren't tracked for Kickstart before,
    so historical ones can't be recovered; fills in correctly going forward.

25. **PAR-Q gate bypass for exercise-demo QR codes** (medical form popping up on demo scans / new
    browsers). ROOT: QR codes point to `/x/:id` + `/machine/:slug` (ExerciseInfo/MachinePage, built to
    work signed-out) but ParqGate wrapped them, so a signed-in member without a valid PAR-Q got the
    form instead of the demo. FIX: added `/x/` + `/machine/` to ParqGate ALLOWED_PREFIXES
    (`src/components/ParqGate.tsx`). Real training routes still gated. Standalone 1-file push.

26. **Trialists tab: trial-type filter** (`src/components/TrialistPipeline.tsx`) — second pill row
    under the stage pills: All · Coached 30 · Gym 21 (live counts, same `/21/` test), filters within
    the current stage.

27. **Active-membership gate** (keep nurturing £21 who sign up; drop them from "needs review").
    `trialNurture.ts` + `trialStages.ts` now read `gym_members` product+status. Active NON-trial
    membership (not `/21/`,`/30 day/`,`/forever strong/`,`/trial/`) =:
    - Coached-30 → treated as joined/converted (out of nurture), as before.
    - **Kickstart-21 → STAYS in full nurture** (can still cancel in 21 days) but the review flag is
      suppressed + a violet "✅ Has membership" chip shows. Only the review-needed is removed.
    Reviews panel (`TrialsHub.tsx`): membership people excluded from "Needs review"; NEW **Joined**
    column (3-col grid) shows anyone who set up a membership while on trial incl. £21, with product.

28. **Kickstart (21-day) message copy** — 11 steps now in `KICKSTART21_STEPS` (trialNurture.ts):
    welcome(d1 auto) · post_first(after 1st visit) · try_class(d5) · momentum/reengage(d7 branch) ·
    app_workout(d8, only if 0 app workouts logged — conditional drop + sky "No app workout" chip from
    d7) · pt_taster(d9) · mid(d11) · review(d16) · ending_soon(d19) · decision(d21). GHL sheet:
    `claude/GHL_trial_k21_templates_carla.md` (trial_k21_* keys, {{1}}=name {{2}}=Coach Note; welcome/
    post_first/decision note-free). Carla to tweak wording → update BOTH the sheet + KICKSTART21_STEPS.

29. **Template browser** in the cockpit SendArea (`TrialNurtureCockpit.tsx`) — "Browse all" button
    opens a sheet listing every template's full copy (before + coach-note slot + after), trial-type
    aware, with "Use this" to load one into the send box.

30. **Trials → History tab** (new sub-tab in TrialsHub) — LIVE SYNC from the 2026 KPIs Google Sheet
    "Trial Conversions" tab (clean uniform source: Month·Name·Email·Trial start·Trial type·Trial
    category·Converted?·Converted onto·Onto category·Conversion date·Source). Month sub-tabs; summary
    (Trialled·Converted·Conversion%); breakdown by category + lead source; table Name·Trial·Started·
    Outcome·Joined onto·Source. (Replaces the earlier trial_cohort-based History, which only had
    Aug-onward — app only started writing trial_cohort in Aug.)
    FILES: `netlify/functions/trial-history.js` (staff-verified gviz-CSV proxy, env KPI_SHEET_ID/
    KPI_TRIALS_TAB with fallbacks), `src/lib/trialHistory.ts`, `src/components/TrialHistory.tsx`.
    DOC: `claude/trial_history_sheet_setup.md`. PENDING SETUP: set the KPI sheet sharing to
    "Anyone with the link → Viewer" (or ask build-chat to switch the proxy to a Google service account
    for a fully-private read). Env vars optional (fallbacks baked in).

    FILES TO PUSH (session): gymos-webhook/index.ts, backfill_kickstart21_cohort.sql(run),
    ParqGate.tsx, TrialistPipeline.tsx, trialNurture.ts, trialStages.ts, TrialsHub.tsx,
    TrialNurtureCockpit.tsx, TrialHistory.tsx, trialHistory.ts, netlify/functions/trial-history.js,
    + docs (GHL_trial_k21_templates_carla.md, trial_history_sheet_setup.md). All esbuild-clean.

31. **Accountability week — call recording** (host each week's group-call recording on the member's
    weekly page). SQL `acc_week_call_recording.sql` — adds `call_recording_url` to `acc_week_content`
    (idempotent, run once). Staff: WeekContentEditor.tsx new "Call recording URL (Vimeo)" field per
    week. Member: WeekContentView.tsx renders it as its own embed under "This week's call recording"
    (reuses getEmbedUrl → Vimeo incl. unlisted vimeo.com/ID/hash; link fallback if not embeddable).
    Separate from the existing teaching `video_url`. Lib: accWeekContent.ts interface + save patch.
    HOME-SCREEN FLAG (mirrors the coach-focus "new note" flag): accWeekContent.ts isCallRecordingSeen/
    markCallRecordingSeen (localStorage key `acc_call_seen:<week>:<url>` — new/changed url re-flags).
    Index.tsx shows a one-time banner "This week's call recording is up · Tap to watch" (Video icon)
    for enrolled members; cleared on tap (→ /accountability) or dismiss, and on opening the dashboard
    (Accountability.tsx markCallRecordingSeen). FILES: acc_week_call_recording.sql(run), accWeekContent.ts,
    WeekContentEditor.tsx, WeekContentView.tsx, Index.tsx, Accountability.tsx. esbuild-clean.
    USAGE: upload call to Vimeo → paste link into that week's content → members get the flag + embed.
    FOLLOW-UPS: (a) "All weeks" toggle on the accountability dashboard (Accountability.tsx) — the
    full 6-week timeline (past+current content, check-ins, coach replies, call recording) was built
    but gated behind an unreachable `view` condition; added a This week / All weeks segmented toggle
    (view "weeks") so members can revisit past weeks. (b) Vimeo embed fix: getEmbedUrl hardened to
    pull id + unlisted hash from every share format (vimeo.com/ID, /ID/hash, ?h=hash, ?share=copy,
    manage/videos/ID) — a `?h=` link was dropped → black screen. ✅ Michael confirmed fixed.

32. **In-app WhatsApp/SMS messaging** — reply + chat hub, so Carla rarely opens GHL (deep-link was
    slow/landed wrong profile). ALL LIVE + PUSHED (2026-10-22).
    - IN-APP REPLY (MemberMessagesSection.tsx): free-text reply box inside the member thread. Lib
      memberMessages.ts `waWindowStatus()` (24h window from last inbound) + `sendWhatsAppReply()`.
      Proxy `netlify/functions/ghl-send.js` (staff-verified) → GHL Conversations API POST
      /conversations/messages {type, contactId, message}; mirrors the sent msg into member_messages
      keyed on returned id (sync webhook de-dupes). GHL 24h window shown: inside = reply box + "~Xh
      left"; outside/no-contact = amber notice + GHL deep-link (templates stay in GHL).
      SETUP (done): GHL Private Integration token (scopes conversations/message.write + convos r/w +
      contacts.readonly) → Netlify env `GHL_API_TOKEN` (+ optional GHL_API_VERSION, default 2021-04-15).
      Doc: GHL_in_app_reply_setup.md.
    - CHANNEL-AWARE: inbound SMS already syncs + shows (SMS badge). Reply sends on the channel the
      member last used (SMS has no 24h gate). ghl-send type SMS|WhatsApp from body.channel.
    - SEND-TIME FALLBACK: if a WhatsApp send is REJECTED synchronously (window lapsed / not on WA),
      ghl-send auto-retries as SMS, mirrors under the sent channel, returns {channel, fellBack};
      UI toasts "WhatsApp unavailable — sent by SMS instead". Both-fail → error toast, nothing marked
      sent.
    - LATE DELIVERY FAILURE: wa-message-sync now handles `event:"status"` (patches member_messages
      .status by wa_message_id, no new row). Thread shows a red "failed" chip + "WhatsApp didn't
      deliver — Resend as SMS?" one-tap resend (only for a failed last-outbound WhATSAPP; auto-clears
      once a newer msg exists). GHL has NO WhatsApp delivery-failure trigger (only "Messaging error -
      SMS") — so wired the SMS-error trigger → Custom Webhook to wa-message-sync?key=… body
      {event:status, message_id:{{message.id}}, status:failed}. WhatsApp late-failures rely on the
      send-time fallback; if they ever prove to be a real issue, add GHL API status-polling.
      Doc: GHL_whatsapp_delivery_status.md. Redeploy wa-message-sync (--no-verify-jwt) — DONE.
    - CHAT HUB (own staff page /messages, header message-icon in AppLayout, staff-only): GHL-style
      inbox of everyone who's messaged. SQL `member_chat_threads.sql` (SECURITY DEFINER, is_staff()
      guard, latest msg per email + name + last_inbound_at). Lib chatInbox.ts. Page Messages.tsx:
      All / Needs-reply filters (needsReply = last msg inbound), search, per-thread chips (Needs
      reply / Window open / Template only); tap → thread + reply box (two-pane desktop, full-screen
      mobile). RUN SQL member_chat_threads.sql.
      FILES: ghl-send.js, memberMessages.ts, MemberMessagesSection.tsx, chatInbox.ts, Messages.tsx,
      App.tsx (route /messages ×2 blocks), AppLayout.tsx (header icon), wa-message-sync/index.ts,
      member_chat_threads.sql(run). Docs: GHL_in_app_reply_setup.md, GHL_whatsapp_delivery_status.md.
      All esbuild-clean. Project ref juvofqqtvakltlwqqhkn; WA_SYNC secret unchanged.

⚠️ PENDING — Michael action (messaging): once the new k21 templates are added, **turn OFF / retire
the OLD day-based trial drip automations in GHL for BOTH trials** (30-day coached AND 21-day
Kickstart) so trialists don't get the old auto-messages on top of the new engine/Carla sends. The new
system = welcome auto-fires via gymos-webhook + everything else Carla-sent from the cockpit/chat. The
old time-based workflows must be disabled to avoid double-messaging. (Reminder requested by Michael.)

33. **Trial nurture GO-LIVE (2026-10-26)** — both funnels now sending end-to-end via a single GHL
    workflow; Zapier removed from the loop. Confirmed working on a real GymOS join.
    - GHL "Trial nurture — send" workflow (one workflow, both funnels): Inbound Webhook → **Create/
      Update Contact** (Email + Full name + **Phone**) → **Update Coach Note** = {{inboundWebhookRequest
      .coach_note}} → **Condition branch on template_key → Send WhatsApp** (19 branches: 9 `trial_*`
      + 10 `trial_k21_*`), each with Delivered / Undelivered→**SMS** fallback (SMS body uses
      {{contact.first_name}} + {{contact.coach_note}} merge fields). GHL caps a Condition at ~10
      branches → chained a SECOND Condition on the first's None path for the k21 keys. WhatsApp
      template `{{2}}` maps to `{{contact.coach_note}}`. Note-free templates built with NO `{{2}}`
      (empty var = WhatsApp rejects). Webhook URL = …/webhook-trigger/e67d20ca-… ; set as BOTH Netlify
      `GHL_TRIAL_NURTURE_WEBHOOK_URL` (coach sends) and Supabase secret `TRIAL_STARTED_WEBHOOK_URL`
      (auto-welcome). Doc: GHL_nurture_send_workflow.md. ✅ tested — contact+phone, coach-note merge,
      both Conditions, a real k21 join (benjbernadas, k21_welcome auto) + a 30-day welcome all landed.
    - ZAPIER DROPPED: GymOS payload includes `subject.member.mobile` in +44 E.164, so the webhook now
      forwards `phone` to GHL — no Zapier needed to carry the number. (Old Zapier `u0g0sni` fed the old
      21-day funnel.)
    - gymos-webhook (REDEPLOY on each change): now passes `phone` (member.mobile) on both welcome
      fires. WELCOME TIMING (final design): 30-day welcome fires **on JOIN** (so it lands at signup)
      but `trial_start`/CLOCK still starts on their **first booked session** (maybeStartTrial; welcome
      removed from there). Guarded so a renewal/re-add can't re-send the welcome (checks
      trial_nurture_log for an existing 'welcome'). 21-day: welcome + clock both on join.
    - SENT-TEMPLATE MIRROR: coach cockpit/chat sends now show in the in-app thread immediately —
      sendStep passes `message_body` (renderFullMessage), trial-nurture.js inserts it into
      member_messages (direction out, service role). (Auto-welcome still not mirrored — fires from the
      webhook, not the proxy; shows after member replies. Could add later if wanted.)
    - OLD FUNNELS (DECISION): keep the two old GHL funnels (21-day via webhook `9f6356d8`, 30-day via
      `76366a09`) but **TRIM them to setup-only** — keep Create contact / Add Tag / Create-Update
      Opportunity / **Welcome EMAIL**; DELETE the WhatsApp Welcome + Delivered/Undelivered SMS + all
      Wait-X-days drip steps (end the funnel at the Welcome Email). New system owns ALL WhatsApp
      (welcome + steps). Zapier stays (still feeds the trimmed old funnels for tag/opportunity/email).
      ⚠️ STILL TO DO: Michael to trim both old funnels + confirm no double-welcome.
    FILES this session: gymos-webhook/index.ts(redeploy), netlify/functions/trial-nurture.js,
    trialNurture.ts, GHL_nurture_send_workflow.md, GHL_trial_k21_templates_carla.md (all 10 k21
    templates finalised + note-free flags). esbuild-clean + live-tested.

## 34 — Meal-plan Build Your Own live + recipe-load fixes (2026-10-28)
- Wired Nutrition → Meal Plans → "Build Your Own" to render the real RecipeCards
  day-planner (was a dead "coming soon"). Gated to STAFF only (localStorage
  fittrack_is_staff==="true"); members still see "Soon". File: MealPlansPage.tsx.
  Also fixed the Meal Plans route in Nutrition.tsx (was hardcoded <ComingSoon/>).
- ROOT CAUSE of "recipes won't load / spinning wheel / 0 of 0": getRecipes in
  store.ts wrote the full 452-recipe payload to localStorage BEFORE returning it.
  Safari/WebKit (and the iOS PWA) has a much smaller quota than Chrome, so the
  setItem threw QuotaExceededError and killed the load — worked in Chrome only.
  FIX: wrapped the cache write in try/catch so a quota error no longer blocks the
  return. (store.ts getRecipes.)
- Also hardened RecipeCards: loadRecipes shows shared recipes first + never blocks
  on getMyRecipes; load wrapped in try/finally so the spinner always clears; and
  calorie-band accordions now OPEN by default (were collapsed → looked empty).
- RLS: recipes table had only authenticated-scoped policies; added recipes_read
  for `public` so the shared library reads even as anon / before auth hydrates.
  SQL: recipes_read_policy_FIX.sql + recipes_read_policy_FIX2.sql (both run).
- Recipe batch 1: 25 original high-protein low-cal recipes (macros computed),
  import SQL at supabase/sql/recipes_batch1_import.sql + on-brand image tiles.
  NOT yet imported — Michael reviewing CSV first.
- Also: removed login-success toast (Auth.tsx) that covered the scan-in button;
  burn/AMRAP blocks now have the same Swap button as strength rows
  (SwapExerciseButton.tsx shared component).
- Break-glass: JJ set up as backup (own GitHub+Netlify logins; Supabase/GHL/GymOS
  via shared vault). Docs: BREAK_GLASS_RUNBOOK.md, JJ_TRAINING_WALKTHROUGH.md,
  JJ_CHEAT_SHEET.md.

## 35 — Quick Add food search fixed (2026-10-28)
- Open Food Facts search returned nothing in-app (OFF blocks/rate-limits anon
  browser traffic). Routed through new public Netlify fn netlify/functions/
  off-search.js (sends descriptive User-Agent server-side). searchFoods() in
  store.ts calls the proxy first, direct OFF as fallback.
- Relevance: switched off the v2 API (doesn't rank by query — returned random
  products) to legacy cgi full-text search, sort_by=popularity_key, biased to
  United Kingdom products so UK brands surface first.
- Portions: now carry serving_quantity/serving_size through to FoodResult
  (servingG). Add screen defaults to the product's own serving and shows quick
  buttons (1 serving (Xg), 2 servings, 50/100/150g) instead of forcing 100g.
- Michael happy with it. Note: Build Your Own still staff-gated but he's OK to
  open to members — flip the isStaff gate in MealPlansPage.tsx when ready.

## 36 — Save/reload meal plans + PDF export (2026-10-29)
- Build Your Own now has a Save / My Plans / PDF toolbar (MealPlanControls.tsx)
  under the day summary in RecipeCards.tsx.
- Save: name a plan, choose This day or This week; staff can tick "Share to
  member library" (visibility=shared). Builds items from the diary.
- My Plans: lists own + shared plans. Load prompts Add-on-top or Replace each
  time, then writes into food_diary (day plans → selected date; week plans →
  current week by dayIndex). Delete own only.
- PDF (This day / This week): printable ETL-branded page via window.print()
  (Save to PDF/Files; iOS popup-blocked fallback = Blob in same tab). Layout =
  the plan laid out per meal with macros + totals, THEN a separate "Recipes"
  section (page-break-before) listing each recipe's ingredients + method once
  (deduped; custom foods have none). Verified render via screenshot.
- New files: supabase/sql/saved_meal_plans.sql (RUN — table+RLS, read shared-or-
  own), src/lib/mealPlans.ts, src/lib/mealPlanPdf.ts, src/components/
  MealPlanControls.tsx. Edited: store.ts (added clearDiary), RecipeCards.tsx.
- TO PUSH: all the above files. TO RUN: saved_meal_plans.sql.
- Possible follow-on: make PDF method optional (ingredients-only toggle) if week
  PDFs get too long.

## 37 — Meal plan: image export + PDF trap fix (2026-10-29)
- Added "Save as image" (overview only) alongside PDF. New src/lib/mealPlanImage.ts
  renders the plan summary as an SVG (ETL dark card, per-meal items + macros, lime
  totals bar; week = 7 day blocks) and rasterises to PNG on a canvas — NO library.
  Delivers via navigator.share({files}) → native share sheet (Save Image / WhatsApp
  in one tap), falls back to <a download>. Image = summary only; recipes stay in PDF.
- Export button now opens a menu: Save as image (day/week, headline) + Save as PDF
  (day/week, full recipes). MealPlanControls.tsx.
- FIXED PDF trap: old exportMealPlanPdf opened a new window and, when popups were
  blocked (iOS standalone PWA), did window.location.href=blobURL which navigated the
  APP itself to the file — user stuck on the plan, no back. Now prints via a hidden
  iframe (stays in app); last-resort fallback opens a NEW tab via <a target=_blank>,
  never navigates the app. mealPlanPdf.ts.
- Verified image SVG + PDF HTML render via screenshots.
- TO PUSH: src/lib/mealPlanImage.ts (new), src/lib/mealPlanPdf.ts, src/components/
  MealPlanControls.tsx.

## 38 — Build Your Own live to members + recipe cookbook imports (2026-10-29)
- Removed the staff gate on Build Your Own (MealPlansPage.tsx): the meal planner
  (RecipeCards) now shows for ALL members, "Soon" badge gone. "Share to member
  library" on Save stays staff-only (members save private plans). PUSH this file.
- Recipe extraction pipeline (pdftohtml -xml positions → parse → import SQL +
  images). Scripts live in outputs/etl_recipes, etl_book2, etl_book3.
  - Book 1 "Aussie/ETL Recipes 1": 40 recipes, supabase/sql/recipes_book1_import.sql,
    etl-book1-images (CMYK → inverted to RGB; serves=int, per-unit basis in `time`).
  - Book 2 "High Protein Classics": 20 recipes, recipes_book2_import.sql (prep/cook
    in `time`, no fibre).
  - Book 3 "Stealth Health Meal Prep": 85 recipes, recipes_book3_import.sql
    (US book — oz/lb converted to grams AT SOURCE; 5 "Counter-" mix-match entries
    flagged). All images RGB.
  - Each import SQL is re-runnable (clears its own etl-bookN- tag/name list first),
    visibility=shared. Upload the matching images zip to the recipe-images bucket first.
- Unit conversion: supabase/sql/convert_oz_lb_to_grams.sql — PL/pgSQL to_grams()
  rewrites oz/lb → grams in ingredients+method across all recipes (macros untouched,
  leaves fl oz, re-runnable). Existing UK library was already metric; Book 3 baked in.
- Recipe image note: Supabase CDN caches by filename — when replacing an image, add
  ?v=N to that recipe's image_url to bust cache (see hash-browns fix).

## 39 — "Your usuals" frequent-food suggestions in Quick Add (2026-10-29)
- New src/lib/frequentFoods.ts: getFrequentFoods(meal) reads the member's own
  food_diary (last ~600 rows, 2-min in-memory cache), groups by name within the
  meal, ranks by frequency + recency (last 7d ×3, 30d ×2, older ×1), returns top
  foods with their last-logged macros/servings. refreshFrequentFoods() clears cache.
- Quick Add (RecipeCards QuickAddDialog): shows "Your usuals for <meal>" above
  search — one-tap re-add with same macros (handleAddUsual). When searching, the
  member's matching foods show INSTANTLY at the top (no OFF lookup) before Open
  Food Facts results. Cache refreshed on every add (search/manual/recipe/usual).
- Builds from logging history, so empty for new members, smarter over time.
- PUSH: src/lib/frequentFoods.ts (new), src/components/RecipeCards.tsx.

## 40 — Curated branded foods: supermarket own-brands (2026-10-29)
- Hand-verified rows from official grocer labels (Tesco/Morrisons/Ocado), per 100g
  (per 100ml for drinks), all verified=true. Re-runnable SQL (delete-by-brand+category).
- supabase/sql/foods_supermarket_batch1.sql — 5 protein yoghurts (Tesco High Protein
  Natural/Vanilla, Morrisons Protein Fat Free Natural/Strawberry, Arla Strawberry pouch),
  category 'Dairy & eggs'.
- supabase/sql/foods_supermarket_puddings.sql — 9 protein puddings/desserts (Lindahls
  Choc/Choc Brownie, Arla Choc, Müller×MyProtein Pudding Choc/Vanilla + Mousse Salted
  Caramel/Choc, Müllerlight Choc Orange, Müller Rice Protein Choc), category 'Dessert'.
- supabase/sql/foods_supermarket_drinks.sql — 5 RTD shakes PER 100ml (UFIT White Choc
  330ml + Pro50 Strawberry 500ml, Arla Choc 482ml, Barebells Choc 330ml, Grenade Carb
  Killa Fudge Brownie 330ml), category 'Drinks'.
- Earlier curated (already logged/created): foods_generic_seed.sql (162 UK staples),
  foods_brands_applied_per4m.sql (15 Per4m/Applied), foods_gsn.sql (26 GSN Pot O Gold).
- TO RUN: the three supermarket SQL files above (order doesn't matter; re-runnable).

## 41 — Food DB at scale: bulk OFF importer + member contributions (2026-10-29)
- Decision (Michael): bulk-import Open Food Facts UK subset for breadth; curated
  verified rows stay the trusted core and rank first (search orders verified desc).
- supabase/sql/foods_add_source.sql — adds `source` column (+ index) so bulk rows are
  separable from curated (curated = NULL). RUN ONCE before importing. DONE by Michael.
- scripts/import_off_uk.mjs — Node 18+ importer, runs on MICHAEL'S MAC (OFF is blocked
  from Claude's sandbox). Pulls UK products via OFF main API (api/v2/search, NO sort —
  popularity sort 503s), keeps only rows with all 4 macros + sane values, loads as
  verified=false, source='off_uk'. Needs env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
  - ACCUMULATE mode (default): skips already-stored (name|brand), adds only new. RESET=1
    wipes off_uk first for a full refresh.
  - CURSOR (scripts/.off_cursor, gitignored): remembers next page so repeated runs sweep
    THROUGH the catalogue (OFF returns same order each run). Advances only past pages that
    actually returned data — on a full OFF outage it holds position (no skipped pages);
    wraps to page 1 at the true end.
  - Retries w/ backoff on 5xx/429; skips a page after 5 tries; stops a run after 12
    consecutive fails (cursor logic still safe).
  - Run: `cd ~/Documents/GitHub/fittrack-app && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import_off_uk.mjs`
    (ONE line — multi-line paste drops the backslashes). Node installed on Michael's Mac.
  - STATUS: ~917 off_uk rows loaded so far (OFF heavily 503-ing 2026-10-29 daytime;
    much faster off-peak/evening UK). Michael re-runs manually (chose manual over
    scheduled). Grows each run.
- Member contributions: supabase/sql/foods_member_contribute.sql — SECURITY DEFINER
  add_member_food() lets members (not direct table write) insert a food when they log an
  OFF result not already in the library. Dedupes, sanity-checks macros, verified=false,
  source='member', category 'Member added'. RUN this SQL.
  - src/lib/foodsDb.ts: contributeFood() calls the RPC (fire-and-forget).
  - src/components/RecipeCards.tsx: FoodResult gained fromLibrary; handleSaveSearch fires
    contributeFood only for OFF picks (not library, not manual entries).
  - PUSH: src/lib/foodsDb.ts, src/components/RecipeCards.tsx.
- SECURITY: Michael pasted the Supabase service_role key into chat → advised to roll it
  (Settings → API → JWT Settings → Generate new JWT secret), which also rotates anon key
  (needs swapping in app code). NOT yet confirmed done.

## 42 — OFF dump importer (supersedes API page-scrape) + recipe band fix (2026-10-30)
- OFF live API kept 503-ing (page-by-page import maxed ~900 rows). Switched to the
  OFF full DUMP: Michael downloads en.openfoodfacts.org.products.csv.gz (~1GB, CDN,
  reliable) and runs scripts/import_off_dump.mjs <path>. Streams gunzip→readline,
  TSV header-indexed (robust to column order), keeps UK (countries_tags/_en contains
  united-kingdom) with all 4 macros + sane values, dedupes name|brand, wipes
  source='off_uk' then bulk-inserts (batches 500) via service role.
  - RESULT: 4.88M rows scanned → 136,789 UK products loaded in ONE pass. DONE.
  - Re-run after a fresh download to refresh. scripts/import_off_uk.mjs (API version)
    now redundant but left in place.
- Recipe browser (RecipeCards) calorie-band bug fixed: pagination was a single GLOBAL
  limit(20) across all open bands flattened → first band ate the budget, lower bands
  rendered empty ("don't load"); Load-more remaining count jumped around. Now PER BAND:
  visibleInBand = bandItems.slice(0,limit); hiddenCount = sum over open bands of
  max(0,count-limit). Also bands now DEFAULT COLLAPSED (openBands=empty set) so each is
  a tap-to-open dropdown (was auto-opening all). PUSH src/components/RecipeCards.tsx.
- Paid-DB research (if ever needed): FatSecret = only good UK branded, quote-based/
  enterprise; Edamam cheap(~$9) but weak branded; Nutritionix US-centric ~$499/mo.
  Free UK generics = CoFID (gov.uk McCance & Widdowson, ~3000 foods, no branded) — not
  imported (OFF dump covers needs).

## 43 — Service-role key exposure: decision = leave it (2026-10-30)
- Legacy service_role key was pasted in chat (private, never public → low real-world risk).
- Project is ALREADY migrated to new API keys: publishable (sb_publishable_…) + secret
  (sb_secret_…) exist, JWT Signing Keys = ECC P-256 (legacy HS256 secret now verify-only).
- To truly kill the exposed legacy key = "Disable JWT-based API keys" on Settings → API →
  Legacy tab, but ONLY after moving app + 7 Netlify fns + ~20 edge fns onto new keys
  (app anon hardcoded in src/lib/supabase.ts; Netlify fns use env SUPABASE_SERVICE_ROLE_KEY;
  edge fns use injected SUPABASE_SERVICE_ROLE_KEY — the uncertain bit).
- DECISION (Michael): leave it for now. No rotation done. Future new work should use the
  sb_publishable_/sb_secret_ keys so legacy reliance fades. Revisit full migration + disable
  if misuse ever suspected.

## 44 — Meal-plan PDF export: preview-in-new-tab (2026-10-30)
- Problem: iframe win.print() fired the OS print dialog (not the downloadable preview
  Michael wanted). Earlier same-tab blob nav had trapped users.
- Fix (src/lib/mealPlanPdf.ts): open the branded plan HTML in a NEW tab via
  window.open("","_blank") + document.write (fallback: <a target=_blank> blob link if
  popup blocked). Added a sticky ETL top bar with a lime "⬇ Save as PDF" button
  (window.print → Save to Files/PDF) + hint "Close this tab to go back". .bar hidden
  @media print. New tab = always escapable, no trap. Verified render via screenshot.
- PUSH src/lib/mealPlanPdf.ts.

## 45 — Staff view of member food diaries (view-only) (2026-10-30)
- Before: food_diary was member-only (RLS food_diary_own); staff had NO access.
- Decisions: lives in Member Activity modal; VIEW-ONLY; week avg = per logged day (+ days-logged).
- supabase/sql/food_diary_staff_read.sql (RUN) — adds select-only policy
  food_diary_staff_read using public.is_staff(). No staff write policy = read-only by design.
- src/lib/memberNutrition.ts (new) — fetchMemberDiary(memberId,from,to) + entryTotals/sumTotals
  (servings-aware: macro×servings, matches member app's dayTotals exactly).
- src/components/CoachNutritionLog.tsx (new) — Day/Week toggle, date nav (±1 day / ±7 days),
  can't page into future. Day = log grouped by meal (item ×servings + kcal/P/C/F) + day total.
  Week = 7-day totals table + "Avg / logged day" (kcal+macros, averaged over logged days only)
  + "Logged X of 7 days". Fetches rolling 7-day window ending on anchor date.
- src/components/MemberActivityModal.tsx (edited) — renders <CoachNutritionLog memberUserId=
  {member.id}/> after Past workouts, before Messages. Imported component.
- PUSH the 3 code files. RUN the SQL. Verified via esbuild compile (all 3 OK).

## 46 — Meal-plan PDF: in-app preview overlay (iOS fix) (2026-10-30)
- Entry 44's new-tab (window.open) approach was unreliable on iPhone PWA (no tab
  chrome in standalone → still felt like a print/trap). Replaced with an IN-APP
  full-screen preview.
- src/lib/mealPlanPdf.ts: exportMealPlanPdf → renamed buildMealPlanHtml(opts):string
  (returns the branded printable HTML; removed the in-page toolbar + window.open).
- src/components/MealPlanControls.tsx: doPdf now setPreviewHtml(html); renders a
  fixed inset-0 overlay with Close (X) + "Save as PDF" buttons and an <iframe
  srcDoc={html}> preview. Save = previewFrame.contentWindow.print() → iOS share/
  print sheet (Save to Files/PDF). Close always dismisses → never traps. Imported X,
  useRef. PUSH both files. Verified esbuild compile.

## 47 — Saved plans: View-PDF per plan (2026-10-30)
- My Plans rows gained a FileDown (PDF) button next to Load. viewPlanPdf(plan) rebuilds
  recipeDetails from getRecipes() for the plan's recipe_ids and calls buildMealPlanHtml
  with the plan's own title/scope/items → setPreviewHtml (same in-app preview overlay).
  No PDF files stored; regenerated from saved plan data each time (always matches).
  So each saved plan now: Load (re-log to diary) + PDF (view/save). PUSH
  src/components/MealPlanControls.tsx. Verified esbuild compile.

## 48 — Ready-Made Plans by calorie goal (shared plans surfaced) (2026-10-30)
- Shared saved plans (visibility='shared') now appear in the Meal Plans → Ready-Made
  Plans tab, grouped into calorie-goal bands (daily kcal rounded to nearest 100; day
  plan = day total, week plan = daily average). Previously that tab only had
  ResourcesSection; shared plans were only in My Plans → Library.
- src/components/ReadyMadePlans.tsx (new): listMealPlans → filter shared; dailyMacros()
  (servings-aware ÷7 for week); bandOf()=round/100*100; accordions per band, opens the
  band nearest getMemberMacros().calorie_target. Each plan: name, day/week, kcal/day +
  macros, Load (Add/Replace dialog → loadMealPlan into today / Monday-of-week) + PDF
  (buildMealPlanHtml → in-app preview overlay, same as planner).
- src/components/MealPlansPage.tsx (edited): plans tab renders <ReadyMadePlans/> then
  ResourcesSection (relabelled "More resources").
- Loop: staff Save with "Share to member library" ON → shows for all members in the
  matching calorie band. PUSH both files. Verified esbuild compile.

## 49 — Manual + % macro targets, editable by client & staff (2026-10-30)
- Calculator still autofills calorie/macro targets (unchanged). Added manual adjust on
  both sides, with macros enterable as grams OR % of calories. Decisions: no lock (both
  can edit; coach_set badge shows who set last); staff editor in Member Activity modal.
- src/components/MacroTargetEditor.tsx (new, reusable): calorie input + grams/% toggle for
  P/C/F (P4 C4 F9). % mode shows gram equivalents + flags macros-vs-calorie mismatch + %
  total. onSave returns GRAMS.
- Member (src/pages/Nutrition.tsx CalculatorSection): "Your Daily Targets" now shows all 4
  macros; Edit button opens MacroTargetEditor inline → saveManualMacros (saveMemberMacros,
  coach_set=false). Recalculate still there.
- Staff: supabase/sql/member_macros_staff.sql (RUN) = mm_staff_read select policy +
  staff_set_member_macros(uuid,int×4) SECURITY DEFINER RPC (is_staff guard, upsert,
  coach_set=true). src/lib/memberMacrosAdmin.ts (getMemberMacrosFor + staffSetMemberMacros).
  src/components/CoachMacroTargets.tsx (view + MacroTargetEditor) mounted in
  MemberActivityModal above the nutrition log.
- PUSH: MacroTargetEditor.tsx, memberMacrosAdmin.ts, CoachMacroTargets.tsx (new),
  MemberActivityModal.tsx, Nutrition.tsx. RUN member_macros_staff.sql. Verified esbuild (all OK).

## 50 — Macro targets/diary staff fixes (2026-10-30)
- "Couldn't save targets" + empty diary were a stale deploy / PostgREST schema-cache
  timing issue (DB objects all present: rpc_exists/policies/staff_users all =1, member.id
  = auth uid, direct insert OK). Resolved once latest build deployed.
- Kept: CoachMacroTargets save now surfaces the real error (res.error.message + console).
  MemberActivityModal computes authId = member.user_id || member.id, UUID-guards it, and
  shows "need a linked app account" for non-linked roster entries. PUSH
  MemberActivityModal.tsx + CoachMacroTargets.tsx.

## 51 — Staff Insights "Year tab" didn't match the KPI summary — fixed (2026-11-02)
- Cause: the app's Year/Trends reads the sheet's "App Year" tab (via the deployed Apps
  Script staffhub.gs → Netlify staffhub.js proxy). "App Year" recomputed from the monthly
  "<Month>- Overview" tabs with its OWN formulas, which defined some metrics differently
  from the "Year Summary" tab (the trusted weekly KPI table, gid 658065908; NOTE its tab
  NAME is "Year Summary", not "2026 KPI summary" which is just A1 title text — and there IS
  a separate tab literally named "2026 KPI summary" = Key Growth Areas).
- Mismatches were definitional: Cancellations excluded end-of-trial (229 vs 321) →
  Net members 186 vs 94; ad spend all-channels vs Meta-only (£3,568 vs £1,960); attrition
  monthly vs cumulative. Money/count totals already matched.
- Decision (Michael): point App Year at the Year Summary; ad metrics = Meta-only.
- Fix: ran repoint_app_year.gs (added to the Apps Script project, KPI_TAB='Year Summary')
  — rewrites App Year C6:AB18 as INDEX/MATCH into 'Year Summary' (month via MATCH on its
  header row 4 so it auto-handles new month columns; metric rows hardcoded to the current
  Year Summary layout; conv_no/conv_rate/base/attrition/cpl derived). Cols A/B untouched.
- Verified: App Year YEAR row now matches Year Summary cell-for-cell (net members 94,
  cancellations 321, ad spend £1,960, leads 274). No app deploy — sheet-only. App caches
  metrics (etl_staffhub_metrics_cache) so staff reload once to see it.
- Caveat: Year Summary row numbers are hardcoded in the formulas; if its rows are
  inserted/deleted, re-map. Script saved at outputs/repoint_app_year.gs.

## 52 — One-time events RSVP popup on app open (2026-11-02)
- New src/components/EventsAnnouncement.tsx: self-gating dialog shown once per member
  per campaign. On app open (non-staff, not seen): getUpcomingEvents() → if any, shows
  them with Count me in / Can't make it buttons + "X going" count. RSVP via setRsvp()
  (community_event_rsvps) so answers feed the Community events-page totals directly.
  Gate: localStorage "etl_events_popup_seen" === CAMPAIGN ("xmas-games-2026"); bump
  CAMPAIGN const to re-announce. Skips staff; doesn't mark seen if there are no events.
- Mounted in AppLayout.tsx next to <OnboardingTour/>. No SQL (community_events +
  community_event_rsvps already exist). PUSH EventsAnnouncement.tsx + AppLayout.tsx.
  Verified esbuild compile. Needs events published + future-dated to appear.

## 53 — In-app + public Newsletter system (2026-11-02)
- Goal: email members via GHL (AI email builder) but have real content pages that
  (a) live on a public shareable URL the GHL email links to, and (b) show inside the
  app so app users never miss an issue and it pulls people onto the app.
- SQL (RUN THIS): supabase/sql/newsletters.sql — public.newsletters table
  (slug, title, subtitle, cover_image, blocks jsonb, published, published_at, created_by).
  RLS: newsletters_read = select using (published OR is_staff()) with NO `to` clause, so
  PUBLIC/anon can read PUBLISHED issues (email recipients not logged in). Write = staff only.
- Lib: src/lib/newsletters.ts — Block model (hero|heading|text|image|callout|button|quote|
  divider), slugify, blockId, list/get/save/delete, uploadNewsletterImage (reuses
  community-images bucket, newsletters/ path, 3MB cap).
- Renderer: src/components/NewsletterRenderer.tsx — on-brand scrolling page: cover Hero
  (image + gradient + title), then typed blocks (lime callouts/buttons, quotes, images).
- Public page: src/pages/NewsletterView.tsx at /n/:slug — EAT TRAIN LIVE header, renderer,
  "Get all this in the ETL app" CTA (-> / if logged in else /auth). Readable logged-out.
- Staff builder: src/pages/NewsletterAdmin.tsx at /admin/newsletters — list issues
  (draft/published), create/edit (title/subtitle/cover + add/reorder/delete blocks per
  type), Preview, Save draft, Publish, copy /n/<slug> link (paste into GHL), delete.
- Wiring: App.tsx routes /admin/newsletters + /n/:slug (both route blocks); AppLayout.tsx
  isNewsletterPublic (paths /n/) bypasses auth redirect + renders standalone; Admin.tsx
  "Newsletters" button (Newspaper icon) next to Food Database; Community.tsx shows a live
  "Newsletters" section listing published issues (cover thumb, links to /n/:slug).
- All 8 files esbuild-compile clean. PUSH all + RUN newsletters.sql.
- FLOW: staff build issue -> Publish -> Copy link -> paste /n/<slug> into GHL email as the
  "read more" button. App users see it in Community > Newsletters automatically.

## 54 — Week-view day cards now show full workout detail (2026-11-02)
- Problem: in the programme builder's week grid, each day card showed section
  NAMES + basic sets only. Freestyle/Engine blocks (where the whole prescription
  lives in the section description — "Every 4 min x6 rounds: 10 box jump overs,
  8 burpees, max cal Air Bike, Score:...") rendered as just the movement names,
  so you had to open every day to analyse a week.
- Fix (src/pages/Admin.tsx, week-grid day card ~L3584): section rows now render
  ex.description under the name (whitespace-pre-line, 10px muted). Per-exercise
  detailText enriched: calories (Nx cal), each-side (/side), and @weight kg, in
  addition to sets x reps / time / distance. Single edit; esbuild clean.
- Result: a whole week reads at a glance incl. engine/AMRAP scoring. PUSH Admin.tsx.

## 55 — PAR-Q gate: prompt button instead of full-screen takeover (2026-11-02)
- Problem: members without a valid PAR-Q got the full-screen ParqForm *instead*
  of the app; if the form hung they were frozen/trapped with no obvious way out.
- Change: ParqGate no longer replaces the app. It always renders children and,
  when PAR-Q is invalid, shows a dismissible prompt bar (bottom-16, above nav):
  "Complete your health check" + [Fill in] + [X]. Tapping opens ParqForm as an
  overlay; ParqForm now takes an optional onClose and renders a top-right X, so
  it can always be closed. Dismiss (X) hides the prompt for the session.
- Files: src/components/ParqGate.tsx (soft prompt + showForm/dismissed state),
  src/components/ParqForm.tsx (onClose prop + close button). esbuild clean.
- NOTE/compliance: this makes PAR-Q effectively skippable (soft gate). Previously
  it was a hard gate. If you want it mandatory again but non-freezing, option is
  to block only Workouts/log actions until done, or re-prompt each session.
  PUSH both files.

## 56 — Staff: set/reset a member's password (2026-11-02)
- Why: some members can't use the email reset flow; staff need to set a password for them.
- Backend: new action "setPassword" in manage-members edge fn. Guarded by STAFF_SECRET,
  uses service role -> admin.auth.admin.updateUserById(userId,{password,email_confirm:true}).
  Resolves userId from memberId (== auth id) or falls back to email via listUsers. Min 6 chars.
  Browser NEVER holds the service key. REDEPLOY manage-members (paste updated index.ts).
- Lib: setMemberPassword(staffSecret, memberId, password, email?) in memberAccessActions.ts.
- UI: new CoachSetPassword.tsx mounted in MemberActivityModal (staff member drawer), above
  macro targets. "Set / reset password" button -> input with Generate (Etl-xxxx-9999) + Copy +
  Save. Toast on success; password never stored in plain text. Only shows for linked app
  accounts (UUID authId). PUSH: CoachSetPassword.tsx, MemberActivityModal.tsx,
  memberAccessActions.ts + redeploy manage-members fn.

## 57 — Trial nurture: suggestion no longer sticks on an early step (2026-11-03)
- Symptom (Carla's cockpit): a trialist days past their trial end was still being
  suggested the "After 1st visit" message. e.g. Samantha, k21 day 29/21, post_first
  never sent -> it stayed the earliest un-sent overdue step, so it kept being picked.
- Root cause: nextStep = actionable[0] (EARLIEST un-sent due/overdue step). A skipped
  early touch is overdue forever, so it blocked later steps.
- Fix (src/lib/trialNurture.ts, enrich()): nextStep now = the MOST ADVANCED due/overdue
  step (last in chronological schedule order), with a floor so it never goes behind a
  step already sent (latestSentDay). Early missed touches are skipped, not resurrected.
  So a past-trial trialist now surfaces the ending/decision/review message instead.
- Cockpit uses t.nextStep.step.key for the "· suggested" preselect (coach can still
  Browse all to override), so this flows straight through. esbuild clean. PUSH trialNurture.ts.

## 58 — Trial nurture: "Move out" (park) a trialist (2026-11-03)
- Want: keep past-trial un-converted trialists in Carla's list, but let staff decide
  to remove one without marking it Won/Lost.
- New outcome kind "parked": like 'lost' it drops them from the active board, but it's
  neutral (not a loss stat) and reversible (clearTrialOutcome brings them back).
- Files: trialOutcomes.ts (TrialOutcomeKind += 'parked'), trialNurture.ts board filter
  now drops 'lost' AND 'parked', TrialNurtureCockpit.tsx new "Move out" button in the
  Outcome row + toast. esbuild clean.
- SQL (RUN): supabase/sql/trial_outcomes_add_parked.sql — widens the outcome CHECK to
  allow 'parked' (was won/lost only; parked would be rejected otherwise).
- PUSH: trialOutcomes.ts, trialNurture.ts, TrialNurtureCockpit.tsx + RUN the SQL.

## 59 — Trial nurture: Parked tab + un-park (2026-11-03)
- getNurtureBoard now also returns parked[] (outcome='parked', NOT 35-day capped so
  they stay findable). NurtureBoard interface += parked. Both empty-returns updated.
- Cockpit: new "Parked N" section tab; ParkedRow shows name/day/email + "Bring back"
  (clearTrialOutcome(email) -> refresh). Fixed the catch-fallback board shape too.
- PUSH trialNurture.ts + TrialNurtureCockpit.tsx (SQL from #58 still required).

## 60 — Trial nurture: Lost tab (date + reason) (2026-11-03)
- getNurtureBoard now also returns lost[] {email,name,reason,at} built from trial_outcomes
  (select widened to reason, updated_at, created_at); names resolved from cohort rows.
  Newest first, no age cap. NurtureBoard interface += lost; LostTrialist exported.
- Cockpit: new "Lost N" tab; LostRow shows name, "Lost <date> · <reason> · email", a reason
  chip, and a Restore button (clearTrialOutcome -> refresh). esbuild clean.
- No SQL/deploy beyond #58's CHECK widen. PUSH trialNurture.ts + TrialNurtureCockpit.tsx.

## 61 — £21 gym trial: follow-on membership no longer drops them from nurture (2026-11-03)
- Problem: £21 gym trialists get a follow-on membership added on INDUCTION DAY to roll on
  after the trial. That set converted/joined, so they left the nurture list mid-trial even
  though they still need the 21-day drip (and can still cancel).
- Fix (src/lib/trialNurture.ts enrich()): kickstart21 (incl £21) is counted Joined ONLY once
  the trial window has passed — within the 21 days a membership/converted flag no longer
  pulls them out. coached30 unchanged (membership = joined).
  converted = coached30 ? (c.converted||hasMembership) : (c.converted||hasMembership) && !withinTrial.
- Also: steps that assume no membership ("let's set up your membership" = ending_soon,
  decision, k21_ending, k21_decision) now carry assumesNoMembership and are dropped for anyone
  who already has a membership — so they keep getting check-in/behaviour touches, not an
  awkward "join us" message. New optional NurtureStep.assumesNoMembership field.
- esbuild clean. No SQL. PUSH trialNurture.ts.

## 62 — Trial nurture: "Waiting for reply" bucket + funnel relabel (2026-11-03)
- After a message is sent, the trialist moves to a new "Waiting for reply" tab for
  WAITING_DAYS (3) so the board stops nagging a live conversation. Clears early the
  moment they reply (member_messages direction='in', occurred_at > last send) or when
  the cooldown expires — then they re-surface in Due now / In the funnel as normal.
- Lib: enrich() gains lastInboundAt param -> lastContactedAt + awaitingReply fields;
  getNurtureBoard fetches last inbound per email and returns waiting[]; dueNow/upcoming
  exclude awaiting ones. NurtureBoard += waiting. Resilient if member_messages errors.
- Cockpit: "Waiting for reply N" tab + amber WaitingRow (name, D/x, "messaged Xd ago",
  Open). Renamed "In the drip" tab -> "In the funnel" (people not due yet, still shown).
- esbuild clean. No SQL. PUSH trialNurture.ts + TrialNurtureCockpit.tsx.

## 63 — Trial nurture: auto "no-reply follow-up" nudge (2026-11-03)
- When the normal sequence has nothing left to send AND a coach message has gone
  unanswered past the WAITING cooldown, enrich() injects a synthetic NO_REPLY_NUDGE
  step as the nextStep (so they re-appear in Due now labelled "No-reply follow-up").
  Sending it logs step_key=no_reply_followup (templateKey trial_no_reply_followup) →
  puts them back in Waiting; re-fires each cooldown until MAX_NO_REPLY_NUDGES (2) hit.
- Reply tracking now ignores the AUTO welcome (only coach sends count), so an
  auto-welcome never triggers Waiting or a chase. Clears on inbound reply as before.
- ACTION (GHL): create an approved WhatsApp template named "trial_no_reply_followup"
  with the copy in NO_REPLY_NUDGE (single message, name var). Sends fail silently
  without it — in-app thread mirror still works.
- esbuild clean. No SQL. PUSH trialNurture.ts (cockpit already handles any nextStep).

## 64 — No-reply nudge shown as a "check first" prompt, not a silent suggestion (2026-11-03)
- Nothing auto-sends (Carla always taps Send), but the no-reply chase could blend in
  and get fired reflexively after she'd already spoken to them in the gym.
- TrialNurtureCockpit.tsx: for step key "no_reply_followup" the card now shows an amber
  "Check first" chip on the collapsed row + an amber reminder banner above the message
  ("No reply to your last message. Only send if you haven't already caught up with
  <name> in the gym"). Makes it a conscious decision. esbuild clean. PUSH cockpit file.

## 65 — Staff Guides: collapsible section folders + suggested section names (2026-11-03)
- Grouping by Category already existed (guides render under category headings; editor has a
  Category field). Made it feel like folders: each section is now a collapsible card with a
  Folder icon + count + chevron (click header to expand/collapse; stays open while searching).
- Added SUGGESTED_SECTIONS (Getting started, Trialist nurture, Member management, Reviews &
  bookings, Programming, Check-in) merged into the Category autocomplete so names stay
  consistent — Carla/you just pick "Trialist nurture" when adding a guide.
- src/components/StaffGuides.tsx only. esbuild clean. No SQL (staff_guides.category already
  exists). PUSH StaffGuides.tsx.

## 66 — Fix bodyweight_history PGRST204 "chest column" errors (2026-11-04)
- Error feed: 12x PGRST204 "Could not find the 'chest' column of bodyweight_history"
  from saveBodyweight + flushRetryQueue.bodyweight, several accounts.
- Cause: Progress page measurements form (handleSaveMeasurements) sends
  {weight, bodyFat, waist, arms, chest, legs} and saveBodyweight upserts them as
  columns; table was missing chest (and likely legs). Failed saves queue in
  localStorage and retry forever → repeated errors.
- Fix (SQL, RUN): supabase/sql/bodyweight_history_add_measurements.sql — add if not
  exists: "bodyFat", waist, arms, chest, legs, thigh, tummy (numeric). Names match
  the app's camelCase keys ("bodyFat" quoted). notify pgrst reload schema.
- Self-healing: once columns exist, each member's queued entry flushes OK on next
  app open and dequeues — no manual queue clear. No code change. SQL only.
- (The 51 JS errors are ResizeObserver-loop noise + generic "Script error." — benign.)

## 67 — First-run: single sequential flow (fixes stuck home screen) (2026-11-04)
- Problem: on first load a member got the PAR-Q medical form + events popup + onboarding
  tour ALL at once → overlapping overlays left people stuck on the home screen.
- New src/components/FirstRunFlow.tsx: one full-screen card at a time, in order, skipping
  any already done:
    1. PAR-Q medical form (members only; staff exempt) — reuses ParqForm (softFail).
    2. "Add ETL to your phone" card — iPhone (Safari Share→Add to Home Screen) + Android
       (Chrome ⋮→Install app). Shown to anyone not running the installed app; once installed (standalone) never again; if skipped, re-nudges ~weekly (etl_install_snooze_until).
    3. Live events RSVP card — only if getUpcomingEvents() returns any and campaign not
       seen (etl_events_popup_seen). Reuses communityRsvp setRsvp/getRsvpAggregates.
  Steps advance one→next; renders null when queue empty.
- AppLayout.tsx: removed onboarding-tour auto-launch (showTour/isTourDone/OnboardingTour)
  and <EventsAnnouncement/>; mounts {user && <FirstRunFlow/>}.
- ParqGate.tsx: gutted to a passthrough (medical now owned by FirstRunFlow) so the form
  isn't rendered twice; route tree in App.tsx unchanged.
- EventsAnnouncement.tsx + OnboardingTour.tsx now unused (left in repo, not mounted).
- esbuild clean. No SQL. PUSH FirstRunFlow.tsx, AppLayout.tsx, ParqGate.tsx.

## 68 — Member-facing "credits left this period" (from GymOS-synced data) (2026-11-04)
- Members couldn't see class/PT credits. GymOS/Quoox doesn't push a balance and we don't
  call their API, so DERIVED from what we already sync (Michael chose this): product →
  allowance, member_bookings → used this cycle.
- Allowance rules: open gym = none; Core+ = 5 classes/cycle; Team training = unlimited
  classes; PT = unlimited classes + numeric PT-session allowance (PT-10 → 10). PT/classes
  usage split by isCoached (semi private pt).
- Client-side (no edge fn): member reads own gym_members row (RLS own-email) for product +
  joined_on; cycle is join-day anchored with reset date; member_bookings (authenticated
  read) for used. src/lib/memberCredits.ts getMyCredits().
- UI: src/components/MemberCreditsCard.tsx (Classes + PT sessions, "X of Y left", unlimited,
  low=red, resets DD Mon). Mounted at top of src/pages/Schedule.tsx. Hidden if no allowance
  applies (e.g. open gym) or membership not synced.
- CAVEAT: it's our derived count from synced bookings — can differ from Quoox's official
  ledger (manual adjustments, rollovers, no-show rules). esbuild clean. PUSH 3 files. No SQL.

## 68b — Credit allowances: explicit per-plan rules (2026-11-04)
- Replaced name-regex guess with an ordered allowancesFor() rules table in memberCredits.ts
  so day/week counts aren't read as credits. Confirmed by Michael per plan:
  Core+ =5 classes; Open Gym/Progress Project = none(hidden); everything else unlimited
  classes; PT counts: Kickstart & "21 Day PT & Classes Bolt On" =10, 30 Day Trial & Forever
  Strong =12, 6 Weeks =18, Couples N Pt = N each. Individual "N Pt"/"Pt-N" → N. Simulated
  all 20 plans → correct. esbuild clean. PUSH memberCredits.ts (+ the card/Schedule from 68).
- Open: Core+ / Open Gym "Can switch to allowance" variant — unknown if it changes the
  product name we sync; if so we may need the variant's name to show its allowance.

## 69 — Two new Carla templates: not-attending chase + free-restart offer (2026-11-04)
- trialNurture.ts: added shared steps to BOTH schedules (same key/template so one GHL
  template serves 21 & 30 day):
  • not_attending (key "not_attending", templateKey trial_not_attending) — gated
    requiresNoAttendance (attended===0). Day 5 (30d) / day 4 (21d). Warm "we've not got
    you in yet, what day suits" chase.
  • trial_restart (key "trial_restart", templateKey trial_restart_offer) — gated
    requiresLowUsage (attended <= LOW_USAGE_MAX=2). Last step (day 29 / 22) so it auto-
    suggests at the end for barely-used trialists: "restart your trial free".
- New NurtureStep flags + filters: requiresNoAttendance / requiresLowUsage / requiresAttended.
  Gated 30d week1_win with requiresAttended so a no-show never gets "great first week".
- Both appear in Browse-all for manual send too. esbuild clean. No SQL.
- ACTION (GHL): create approved templates trial_not_attending + trial_restart_offer
  (single message, {{1}}=first name, no {{2}}). PUSH trialNurture.ts.

## 70 — Win-back "Couldn't save" fix (2026-11-04)
- Symptom: logging a call outcome (No answer etc.) in the win-back/reach-out call lists
  showed "Couldn't save — try again".
- Cause: contactProgress.ts upsert writes last_window (and removeFromList writes reopen_at +
  status 'dismissed'), but the migration adding those — supabase/sql/staff_contact_progress_remove.sql
  — was never run, so the column was missing (PGRST204) and the upsert errored.
- Fix: RUN staff_contact_progress_remove.sql (adds reopen_at, last_window, widens status
  check to include 'dismissed'). Idempotent. No code change / no push needed.

## 71 — Credits resolve via member-link (email-mismatch robustness) (2026-11-04)
- getMyCredits now resolves the roster row by member_links (user_id=auth.uid() -> member_id
  -> gym_members by id) FIRST, falling back to email match. Fixes credits for members whose
  Quoox membership email differs from their app login email (if linked).
- SQL (RUN): member_credits_link_rls.sql — adds member-read RLS so a member can read their
  own member_links row + the gym_members row they're linked to (staff policies unchanged).
- Does NOT help if the PT 15 plan simply isn't synced into gym_members yet — that still
  needs a fresh Quoox Active Memberships import. PUSH memberCredits.ts + RUN the SQL.

## 72 — "Listen & Let Go" wellness audio section (2026-11-05)
- Hosting advice for the 121MB file: compress to MP3 ~128kbps (-> ~15-40MB), host in Supabase
  Storage (streams via range requests), play with native <audio>. Avoid raw 121MB upload.
- SQL (RUN): wellness_tracks_setup.sql — wellness_tracks table (public read published / staff
  write) + public 'wellness-audio' storage bucket (200MB cap, staff write / public read).
- Lib: src/lib/wellnessTracks.ts (list/listAll/save/delete + uploadAudio to the bucket).
- UI: src/components/ListenAndLetGo.tsx — member list w/ native players (preload=none); staff
  "Add recording" (upload file OR paste URL, title/desc/length, delete, hidden/published).
- Wired into Coaching hub (Nutrition.tsx): new tile "Listen & Let Go" (🎧, alwaysOn so no
  feature-flag needed) + section route. Added tileOn() helper honouring alwaysOn.
- esbuild clean. PUSH wellnessTracks.ts, ListenAndLetGo.tsx, Nutrition.tsx + RUN the SQL.

## 73 — bodyweight_history 23502 (null weight) fix (2026-11-09)
- Error feed: 6x 23502 not-null violation on bodyweight_history from one member via
  flushRetryQueue.bodyweight — a measurement-only save (waist/chest, no weight) produced a
  null-weight row the NOT NULL column rejected, and the retry re-sent it forever.
- Fix (SQL, RUN): bodyweight_history_weight_nullable.sql — alter column weight drop not null.
  Measurement-only rows now save; the stuck retry clears on next flush. Self-healing, no code,
  no push. (weight stays optional — a legit "track measurements without the scales" case.)
- The 1x "quota exceeded" unhandled rejection = one member's browser storage full; browser-
  specific, benign, nothing server-side to fix (they can clear site data if it recurs).

## 74 — Coach can't see client 6-week progress photos (RLS) (2026-11-09)
- member_photos / member_measurements had owner-only RLS (member_id=auth.uid()); no staff read,
  so coach views (accPreviewData) got empty photo/measurement sets -> photos didn't load.
- Fix (SQL, RUN): member_photos_staff_read.sql — add mp_staff_read + mm_staff_read (select to
  authenticated using is_staff()). Owners keep read/write; staff read-only. Photos are in the
  public 'media' bucket so they render once rows return. SQL only, no code/push.

## 75 — Accountability check-in: show the member's progress photos (2026-11-09)
- Issue: 6-week check-in progress photos didn't show for the coach. They're stored IN the
  check-in (acc_checkins.responses.photos {front,side,back} weekly; after*/photos for week 6),
  as public 'media' URLs — but AccCheckinCard rendered answers and EXCLUDED photos, never
  displaying them (only the trackShot image showed).
- Fix (AccCheckinCard.tsx): added a "Progress photos" block rendering front/side/back thumbs
  (click to open full size) from responses.photos ?? q10photo/after*. esbuild clean. PUSH it.
- (Separate from #74's member_photos RLS — accountability photos live in the check-in JSON,
  not member_photos, so they were a display gap not an RLS one.)

## 76 — Member retention scoring restructured (attendance-based, all roster) (2026-11-09)
- Problem: member-engagement scored only APP accounts and blended attendance 50%/app 30%/
  habits 20%, so un-invited / not-joined PT/Classes/trial members (a) never appeared and
  (b) could never beat ~50 even attending perfectly. Penalised non-app members.
- Rewrote supabase/functions/member-engagement/index.ts: loops the ROSTER (gym_members,
  active/paused + trials), scores on ATTENDANCE ONLY = distinct active days from
  member_bookings (email) + scan_events (member_ref=gym_members.id) over the window.
  Bands (14d default): >=2 visits/wk thriving · >=1/wk steady · >=1 visit slipping · 0 at-risk.
  App usage is a SEPARATE badge (never scored). app_status = on_app / invited_not_joined /
  not_invited (from auth.users existence + last_sign_in). Dedup by email; excludes staff +
  online_client. REDEPLOY the edge fn.
- Rebuilt MemberEngagementBoard.tsx: 4 bands + "Not on app" filter/count, per-member app
  badge, attendance (visits + /wk + last), and an Invite/Re-send invite button for non-app
  members (manage-members invite). MembersGrid onViewMember now matches by email.
- esbuild clean (board, edge fn, MembersGrid). No SQL. REDEPLOY member-engagement + PUSH
  MemberEngagementBoard.tsx + MembersGrid.tsx.

## 76b — member-engagement undercounting fix: paginate bulk reads (2026-11-09)
- Numbers didn't marry up (e.g. Alana Pt-10: member-activity showed 4 Oct PT, retention board
  showed 1 visit). Cause: the roster-wide member_bookings / scan_events / workout_history reads
  had NO pagination, so Supabase's 1000-row cap silently truncated them and undercounted visits
  for members whose rows fell past the limit. (member-activity queries per-member so never hit it.)
- Fix: added pageAll() helper; all three bulk selects now page via .order().range() in 1000s.
  Also removed ??= earlier (bundler). REDEPLOY member-engagement.

## 76c — Retention board: filter by membership type (2026-11-10)
- MemberEngagementBoard.tsx: added memberType(product) classifier (pt / classes=team training
  / gym = open gym+core+ / other=trials) + a membership filter row (All / PT / Classes /
  Gym-Core+). Band + app counts now recompute within the selected membership scope. Client-side
  only — no edge-fn redeploy. esbuild clean. PUSH MemberEngagementBoard.tsx.

## 77 — Retention nurture cockpit (trial-cockpit for active members) (2026-11-10)
Built the active-member equivalent of the trial nurture cockpit: surfaces who's due a WhatsApp
nudge, pre-fills the template, Send, cooldown + waiting-for-reply hold. Reuses the trial-nurture
GHL pipe (no new webhook/workflow).
- supabase/functions/member-engagement/index.ts: added PT-credits to each member
  (ptAllowance/ptCycleStart/isCoachedPt helpers, joined_on in gym_members select, ptDatesByEmail,
  pt_credits:{allowance,used,remaining,resetDays}). ptStartTs widened to max(days,40)d so a cycle
  isn't truncated by a short window. REDEPLOY member-engagement.
- src/lib/retentionNurture.ts (new): TOUCHES catalogue (missed_you/slipping/celebrate/pt_low),
  candidateTouch priority (at-risk→missed_you, slipping→slipping, PT≤2 & reset≤10d→pt_low,
  thriving→celebrate, steady→none), getRetentionBoard (overlays retention_touch_log cooldowns +
  inbound replies → dueTouch/awaitingReply), sendTouch (POST /.netlify/functions/trial-nurture
  then insert retention_touch_log), renderTouch. Cooldowns 14/14/28/14d, WAITING_DAYS=3.
- src/components/RetentionCockpit.tsx (new): tabs per touch + Waiting-for-reply; TouchCard with
  preview, optional coach note (coach touches), Send WhatsApp.
- src/components/MembersGrid.tsx: mounts <RetentionCockpit> above MemberEngagementBoard in the
  engagement view.
- supabase/sql/retention_touch_log.sql (new): RUN — staff-only touch log (cooldown + waiting).
- claude/GHL_retention_touches.md (new): 4 approved WhatsApp templates + add 4 branches to the
  existing "Trial nurture — send" workflow (chain a Condition node if full).
TODO Michael: RUN retention_touch_log.sql; REDEPLOY member-engagement; create the 4 GHL templates
+ branches (GHL_retention_touches.md); PUSH retentionNurture.ts, RetentionCockpit.tsx,
MembersGrid.tsx, member-engagement/index.ts.

## 78 — Retention: two app-usage touches + wording tweaks (2026-11-10)
- member-engagement/index.ts: workout_history now pulled over a wide window (max(days,90)d) so we
  can tell "never used app programmes" from "used then stopped". Each member now exposes
  app.lastWorkoutDays + app.recentWorkouts (14d). REDEPLOY member-engagement.
- retentionNurture.ts: 2 new touches — app_try (on app, no workout ever → retention_app_try) and
  app_comeback (last app workout ≥14d ago & none in last 14d → retention_app_comeback), cooldown
  21d, coach-note optional. candidateTouch priority: attendance (missed/slipping) → pt_low →
  app_comeback → app_try → celebrate. Also matched copy to Michael's GHL edits (slipping "swing of
  things", celebrate opens "Hey").
- RetentionCockpit.tsx: added "Try the app" + "App drop-off" tabs + context line.
- GHL_retention_touches.md: added retention_app_try + retention_app_comeback (both {{1}} name,
  {{2}} coach note) — add 2 more branches to "Trial nurture — send".
PUSH: retentionNurture.ts, RetentionCockpit.tsx, member-engagement/index.ts. REDEPLOY
member-engagement. GHL: 2 more templates + branches.

## 79 — Staff Hub "Today" action feed (central hub v1) (2026-11-10)
First module of the central staff hub: a prioritised "what needs me today" home screen that
aggregates live items from the tools already built (no new tables — read-only aggregator).
- StaffTodayFeed.tsx (new): greeting + action cards. Pulls getNurtureBoard() (trials due) +
  getRetentionBoard() (retention touches grouped by dueTouch) + waiting-for-reply count. Cards are
  tone-ranked (urgent/warn/good/info) and each jumps to the tool that actions it (onGoto → Admin
  tab: trials→calllists, retention→members). "All caught up" empty state.
- Admin.tsx: added "Today" as the FIRST tab + made it the default landing tab (was "exercises").
  ensureTabData("today") is a no-op; mount sync unaffected.
PUSH: StaffTodayFeed.tsx, Admin.tsx. No SQL, no redeploy (retention counts populate once the
pending member-engagement redeploy lands). All-staff shared.
NEXT (agreed roadmap, not yet built): reminders + content scheduler, fault report centre, AI
content generator, plus extras (shift handover, milestones feed, birthdays, low-stock, who's-in,
checklists, announcements, enquiry inbox).

## 80 — Staff Hub: Fault / equipment report centre (hub module 2) (2026-11-10)
- equipment_faults.sql (new, RUN): equipment_faults table (title, location, severity
  low/medium/high/out_of_order, status open/in_progress/fixed, photo_url, notes, reported_by,
  resolved_by/at) + staff-only RLS + public 'equipment-faults' storage bucket (10MB, staff write).
- equipmentFaults.ts (new): listFaults/openFaultCount/uploadFaultPhoto/createFault/setFaultStatus.
- FaultReportCentre.tsx (new): log form (title/location/severity/notes/photo w/ camera capture) +
  ticket cards with open→in_progress→fixed buttons, show/hide fixed.
- Admin.tsx: added "Faults" tab (2nd, after Today) + mounted FaultReportCentre.
- StaffTodayFeed.tsx: now also pulls openFaultCount() → "Equipment faults open" card (warn,
  priority 15) jumping to the faults tab. Proves the feed aggregating a 2nd live source.
PUSH: equipmentFaults.ts, FaultReportCentre.tsx, StaffTodayFeed.tsx, Admin.tsx. RUN
equipment_faults.sql. No edge-fn redeploy.

## 81 — Staff Hub: Planner — reminders + content scheduler (hub module 3) (2026-11-10)
- staff_planner.sql (new, RUN): staff_reminders (title, detail, assigned_to, due_date, repeat
  none/daily/weekly/monthly, done + done_at/by) + content_posts (caption, destination
  private/stories/main, media_url, scheduled_for, status draft/scheduled/posted) + staff-only RLS
  + public 'content-media' bucket (25MB, staff write).
- staffPlanner.ts (new): reminders CRUD w/ roll-forward on complete (recurring reschedules to next
  due + resets done; one-off just marks done); dueReminderCount(); content CRUD + uploadContentMedia
  + markPosted; duePostCount().
- StaffPlanner.tsx (new): toggle Reminders | Content calendar. Reminders = add form (title/detail/
  assignee/date/repeat) + tickable rows w/ recurring badge + completed-oneoffs disclosure. Content =
  add form (caption/destination/date/notes/image) w/ Schedule or Save draft + cards w/ Mark posted.
- Admin.tsx: "Planner" tab (2nd) + mounted StaffPlanner.
- StaffTodayFeed.tsx: now also pulls dueReminderCount() → "Reminders due" (priority 5) + duePostCount()
  → "Posts to publish" (priority 12), both → planner tab.
NOTE: content scheduler is notify-to-post (surfaces due posts for whoever's on shift to publish), not
auto-publish — Meta API/stories out of scope for now.
PUSH: staffPlanner.ts, StaffPlanner.tsx, StaffTodayFeed.tsx, Admin.tsx. RUN staff_planner.sql.

## 82 — Staff Hub: AI content idea generator (hub module 4) (2026-11-10)
- supabase/functions/content-ideas/index.ts (new, DEPLOY): STAFF_SECRET-guarded; reuses existing
  ANTHROPIC_API_KEY + claude-sonnet-5. Input {topic, destination?, tone?, extra?}; ETL brand-voice
  system prompt; returns strict JSON {captions[3], stories[3], angles[3]} (parsed defensively).
- staffPlanner.ts: added generateIdeas(staffSecret, {topic,destination,tone,extra}) → invokes
  content-ideas; ContentIdeas type.
- StaffPlanner.tsx: ContentSection now takes staffSecret; added "Idea generator" toggle →
  IdeaGenerator (topic + destination + tone → captions/stories/angles, each Copy, captions also
  "Use in a post" → prefills PostForm). PostForm takes initialCaption.
- Admin.tsx: passes staffSecret to <StaffPlanner>.
Flow: generate → "Use in a post" prefills the scheduler caption → schedule as normal.
PUSH: staffPlanner.ts, StaffPlanner.tsx, Admin.tsx. DEPLOY content-ideas edge fn. No SQL.
All four original hub modules now built (Today feed, faults, planner, AI content).

## 83 — Staff Hub: announcements, milestones, who's-in, anniversaries, stock, checklists (2026-11-10)
- staff_hub_boards.sql (new, RUN): staff_announcements, staff_supplies, checklist_templates +
  checklist_log (unique per item/day) — all staff RLS; + pr_select_staff policy on
  personal_records so the milestones feed can read PBs.
- supabase/functions/staff-pulse/index.ts (new, DEPLOY): STAFF_SECRET-guarded read-only; returns
  whosIn (today's granted scans → gym_members name/product), milestones (recent PBs 7d via members
  name map, new joiners 7d, 4+/wk attendance streaks), anniversaries (active gym_members joined_on,
  next 7 days, 1+ yr). NOTE: no DOB anywhere in schema → true BIRTHDAYS not built; anniversaries
  only. Birthdays need DOB added to GymOS sync or a manual field.
- staffBoards.ts (new): announcements/supplies/checklists CRUD + lowStockCount + pendingChecklistCount.
- staffPulse.ts (new): getPulse() wrapper.
- Components: AnnouncementsBoard (compact=pinned only / full=composer), StaffPulse (who's-in +
  wins + anniversaries, 3-col), SuppliesBoard (ok/low/out toggles), DailyChecklists (sectioned,
  per-day tick via checklist_log).
- Admin.tsx: new tabs Checklists + Stock; Today enriched.
- StaffTodayFeed.tsx: AnnouncementsBoard (full) at top; StaffPulse below action cards; new action
  cards — Checklist items to do (info, p8), Supplies low/out (warn, p18); + lowStockCount/
  pendingChecklistCount fetches.
PUSH: staffBoards.ts, staffPulse.ts, AnnouncementsBoard.tsx, StaffPulse.tsx, SuppliesBoard.tsx,
DailyChecklists.tsx, StaffTodayFeed.tsx, Admin.tsx. RUN staff_hub_boards.sql. DEPLOY staff-pulse.
Remaining roadmap extras not built: shift handover notes, enquiry/lead inbox. BIRTHDAYS pending DOB.

## 84 — Planner: live calendar view (reminders + content) (2026-11-10)
- staffPlanner.ts: added buildCalendar(reminders, posts, start, end) — projects recurring reminders
  onto EVERY occurrence in range (daily/weekly/monthly, step fwd+back from stored due_date, live
  flag on the actual instance) + one-offs + content posts by scheduled_for. CalItem type.
- StaffPlanner.tsx: Planner now has 3 sections (Calendar default | Reminders | Content calendar).
  CalendarSection: month/week toggle, prev/next/today nav, Mon-start 7-col grid, day cells with
  colour chips (violet=reminder, sky+repeat icon=recurring, destination colour=post). Click a day →
  DayPanel (that day's items + "+ Reminder"/"+ Post" using ReminderForm/PostForm prefilled with the
  date). ReminderForm gained initialDue, PostForm gained initialDate.
No SQL, no edge fn — reads existing staff_reminders + content_posts.
PUSH: staffPlanner.ts, StaffPlanner.tsx.

## 85 — Staff home banner + coach assignment + "My jobs" (2026-11-10)
- Index.tsx: staff-only banner (fittrack_is_staff==='true') → navigate('/admin') (lands on Today).
- staffPlanner.ts: listCoaches() — staff_users → members names (same pattern as
  AccountabilityCoachPanel), sorted; Coach type.
- StaffPlanner.tsx ReminderForm: "Assign to" free-text → dropdown (Anyone on shift + each coach by
  name); stores the coach display name in assigned_to.
- StaffTodayFeed.tsx: new MyJobs section on Today — reminders assigned_to === staffName(), expanded
  via buildCalendar across This week / This month (toggle), tickable live instances (completeReminder),
  overdue in red, recurring marked ↻. Hidden if staffName()==="Staff" (can't identify coach).
PUSH: Index.tsx, staffPlanner.ts, StaffPlanner.tsx, StaffTodayFeed.tsx. No SQL/edge fn.
NOTE: "My jobs" matches on coach display name (assigned_to stores the name). Relies on
localStorage fittrack_profile full_name matching the coach name in the dropdown.

## 86 — Staff job plan seed (Steady cadence) (2026-11-10)
- staffBoards.ts + DailyChecklists.tsx: added "content" checklist section ("Content & social").
- staff_job_plan_seed.sql (new, RUN after staff_planner.sql + staff_hub_boards.sql): seeds
  weekly reminders (assigned_to 'Michael', guarded/idempotent) — client-page posts Mon/Wed/Fri,
  celebrate member Tue/Thu, member check-in sweep Mon, plan next week's content Fri, new-follower
  catch-up Sun; each due_date anchored to next occurrence of its weekday via dow arithmetic. Plus
  daily "Content & social" checklist items: post stories, DM new followers, reply to DMs/story
  replies, reply to member check-ins. Re-run safe (NOT EXISTS guards).
  To retarget owner: update staff_reminders set assigned_to='Name' where assigned_to='Michael'.
PUSH: staffBoards.ts, DailyChecklists.tsx. RUN staff_job_plan_seed.sql.

## 87 — Calendar: edit/assign a day's task incl. recurring (this day vs all) (2026-11-10)
- staff_reminders_exceptions.sql (new, RUN): adds exceptions date[] default '{}' to staff_reminders.
- staffPlanner.ts: Reminder.exceptions; buildCalendar skips exception dates when projecting a
  recurring series; updateReminder(id, patch) (series-wide edit); splitOccurrence(original, date,
  patch|null) — adds date to exceptions + inserts a one-off on that day with edited values (patch
  null = just detach/remove that day).
- StaffPlanner.tsx: DayPanel reminder rows now clickable → inline EditOccurrenceForm (title, detail,
  coach assignee dropdown). Recurring items show scope toggle "Every occurrence" / "Just this day":
  all→updateReminder, one→splitOccurrence. Remove button respects scope (one=detach day,
  all/one-off=deleteReminder). Posts stay display-only.
PUSH: staffPlanner.ts, StaffPlanner.tsx. RUN staff_reminders_exceptions.sql.
