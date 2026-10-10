# Builder brief — Accountability live-call link (C4; by Wed 21 Oct)

**Why:** The weekly live call is Wednesdays 12:00 (Zoom). Coaches need to set/change the link in one
place per cohort (Feb's cohort will have its own), and members need an obvious "Join live call" button
on call day. This replaces the per-week `CALL` resources.

**Scope:** staff editor for the cohort's call link + a member dashboard card. SQL already provided.
Don't touch onboarding, check-ins, Staff Hub / win-back.

> SQL (run first): `supabase/sql/acc_cohort_call_link.sql` — adds `acc_cohorts.call_url` and
> `acc_cohorts.call_label` (default "Wednesdays 12:00").

## 1. Staff editor (`AccountabilityCoachPanel.tsx` — Roster tab header, or AccountabilitySettings)
- In the cohort header on the Roster tab, add an editable **Live call link** (URL) + **label** (text,
  default "Wednesdays 12:00"), saving to the active cohort's `acc_cohorts.call_url` / `call_label`
  (staff RLS already allows). A simple inline input + Save, or a small "Edit call link" popover.
- Add a lib helper in `accountabilityProgramme.ts`: `setCohortCall(cohortId, { call_url, call_label })`
  (updates `acc_cohorts`), and make sure `getActiveCohort()` returns `call_url` + `call_label`.

## 2. Member dashboard card (`accDashboard/AccountabilityDashboard.tsx`)
- Read `call_url` + `call_label` from the cohort.
- If `call_url` is empty/null → render nothing (no card).
- If set → a **"Join live call"** card with the label and a button linking to `call_url` (opens in a
  new tab). 
- **Prominence by time (UK time, Europe/London):**
  - **Wednesday 00:00–11:59:** show it prominently ("Live call today — {label}").
  - **Wednesday 12:00–13:00:** a highlighted **"● Live now — Join"** state (e.g. lime/pulsing).
  - **Any other time:** a quieter version ("Next live call: {label}") — still visible but not loud.
  (Compute from the user's clock in Europe/London; a simple day-of-week + hour check is fine.)
- Preview/readOnly dashboard shows the card too (use the preview cohort's call_url, or a placeholder in
  demo mode so coaches can see it).

## 3. Tidy
- Once this is live, the per-week `CALL` resources in `acc_week_content.resources` are redundant — they
  can stay (harmless) or be removed from the content load later. No action needed in this brief.

## Acceptance
1. Staff set a call link + label on the cohort; it saves and persists.
2. Member dashboard shows "Join live call" → opens the link. Hidden when no link is set.
3. On a Wednesday 12:00–13:00 UK it shows "Live now"; earlier Wednesday it's prominent; other days it's
   quieter.
4. Preview dashboard shows the card.

**Deploy:** SQL in Supabase → builder export → `scripts/merge-builder-export.py` → review → push.
