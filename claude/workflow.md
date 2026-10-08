# How this app is built (the workflow)

Michael is not a developer. He uses the AI app builder for screens, GitHub Desktop to push, and the
Supabase / Netlify dashboards to deploy. **Claude does the engineering. The repo is the source of
truth; the builder is a drafting tool that must keep in step with it.**

## Who owns what
- **Claude owns all backend and anything risky**, end to end: the Supabase schema & migrations, RLS,
  database/edge functions, the Netlify functions (proxies, webhooks), payments, bookings,
  permissions, scheduled jobs, third-party APIs. Claude writes these straight into the repo
  (`supabase/`, `netlify/`), tests them, and hands Michael exact copy-paste deploy steps.
  **The builder is never allowed to write or change backend code.** If a builder export contains
  backend files, they are ignored (the merge script skips them).
- **The builder drafts screens and client code only** (`src/`, `public/`). Every builder prompt
  Claude writes is paste-ready, names the exact functions/APIs to call, and forbids computing prices,
  permissions or statuses in the client — the server decides, the client displays.

## The loop for each feature
1. Claude writes + tests the backend, saves it to the repo, gives Michael the deploy steps.
2. Claude writes a builder prompt for the matching screens.
3. Michael pastes it into the builder, exports the source, and points Claude at the export folder.
4. Claude merges the export with the merge script (screens/client only — never backend):
   `python3 scripts/merge-builder-export.py "<unzipped export folder>"`
5. Claude reviews every merged change (`git status` / `git diff`, a build, type-check) before Michael
   pushes — catching real bugs (device-local time vs business tz, missing user filters on "my data",
   hooks after early returns, polling that never stops, wrong props, brand rules).
6. Claude fixes what it finds in the repo, then writes a short **catch-up prompt** with those fixes so
   the builder's copy matches. Michael always pastes catch-up prompts (even trivial ones) or a later
   export can overwrite a fix.
7. Michael commits + pushes in GitHub Desktop; Netlify redeploys. Michael tests live and reports back.

## Rules
- **Secrets never go into the frontend, the builder, chat, or Git.** Michael pastes keys straight into
  the dashboard secret store (Netlify env / Supabase secrets). Files containing secrets are handed
  over but never committed.
- One step at a time for Michael, with the dashboard location and what success looks like. Number
  files in the order used; say which earlier copies are replaced.
- Keep `claude/status.md` current: what's done, decisions (dated), what's deployed, what's next.
- Save each builder prompt to `claude/builder-prompt-*.md` so there's a record.
- Ask Michael only for real business decisions, with a recommended option; make sensible technical
  choices and say what was chosen.

## Protected by the merge script (never overwritten by a builder export)
`supabase/`, `netlify/`, `scripts/`, `claude/`, `vite.config.ts`, `public/sw.js`, `public/_redirects`,
`netlify.toml`, `.gitignore`.
