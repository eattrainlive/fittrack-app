# FitTrack — status

_Last updated: 2026-10-08_

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
