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
- Netlify env: STAFFHUB_SCRIPT_URL, STAFFHUB_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

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
    verified by static review + import/type checks. Pending: Michael pushes, tests live, pastes the
    catch-up prompt into the builder.
- Trial nurture sequence (v2) designed; GHL build + Phase-2 behaviour webhooks pending.

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
