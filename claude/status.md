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
  - Screen 1 "This Month" — LIVE and pulling real metrics. Pending: fix the vs-last-month comparison
    sub-lines (showing the delta as the lead number instead of "down from X last month").
  - Next: the three call lists (Current trialists / Member reachout / Lapsed win-back), which use the
    staff-gated PII path of the proxy.
- Trial nurture sequence (v2) designed; GHL build + Phase-2 behaviour webhooks pending.

## Known loose ends
- `public.notifications` table missing → console error PGRST205 from the Notifications feature (needs
  a table or the feature disabling).
- Some exercise-library entries are non-exercises ("How To Use…", "Overview") — to be cleaned.

## Workflow switch (this change)
- Repo connected to Cowork; added `scripts/merge-builder-export.py`, `claude/` docs, and brought the
  backend (`supabase/`) into the repo. From now: Claude writes/tests backend in-repo; builder drafts
  screens; merge via the script; review diff; push. See `claude/workflow.md`.
