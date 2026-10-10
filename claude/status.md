# FitTrack — status

_Last updated: 2026-10-10_

---

## 👋 HANDSHAKE — read this first (shared by the planning chat, the build chat, and Michael)
How we work: the **planning chat** writes requirements; the **build chat** (owns the repo) decides
implementation, writes SQL + builder prompts, and guards against breakage; **Michael** runs SQL in
Supabase, pastes prompts into the AI builder, and pushes via GitHub Desktop. The repo is the source of
truth; this file is the single shared state. Keep this section short and current — detail lives below.

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

**Accountability — PENDING (Michael):** push measurements fix (2 files) + paste `catch-up-acc-roster-fixes.md`
into builder; run `acc_checkin_loom_url.sql` before week-1 check-ins.

**Accountability — build queue (briefs written, priority order):**
1. Home-screen entry point for enrolled members (brief TBW — members currently only reach the programme
   via a card on the Nutrition tab; biggest launch risk).
2. Video cards in lessons — `builder-prompt-acc-video-cards.md`.
3. C4 live-call link — `acc_cohort_call_link.sql` + `builder-prompt-acc-livecall.md`.
4. C2 weekly check-in upgrades (by 25 Oct) — brief TBW; `acc_checkin_addon.sql` data seeded.
5. C3 week-3 SOS plan + step target (by 8 Nov) — brief TBW.

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
