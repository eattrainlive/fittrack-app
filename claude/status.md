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
