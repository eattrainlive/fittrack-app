# Catch-up — Trial Nurture cockpit merge (export 31)

**What happened:** Export 31 built `TrialNurtureCockpit.tsx` + wired a "Trial Nurture" tab into
`StaffHubCallLists.tsx`, and ALSO regenerated its own `src/lib/trialNurture.ts`. The repo was pushed
with only the hand-written lib (no cockpit), so the cockpit showed in the builder preview but not on
the live site. Fixed by manually merging just the UI:

- Copied `src/components/TrialNurtureCockpit.tsx` from export 31 → repo.
- Added the tab to `src/components/StaffHubCallLists.tsx` (import, `TabKey` += "nurture", tab entry,
  render branch `tab === "nurture" ? <TrialNurtureCockpit staffSecret={staffSecret} />`).
- **KEPT the hand-written `src/lib/trialNurture.ts`** (table `trial_nurture_log`, unit-tested engine).
- Relaxed `sendStep` arg type so the cockpit's `{email,name}` call type-checks (trial_* fields optional).

**⚠ DO NOT merge export 31's `src/lib/trialNurture.ts` over the repo's.** The builder's copy logs to a
different table (`trial_nurture_sends`) than the one that actually exists / that the gymos-webhook
welcome-log writes to (`trial_nurture_log`). If a future builder export regenerates the lib, keep the
repo version (or re-point the builder's copy to `trial_nurture_log`). The cockpit only uses the lib's
public API (getNurtureBoard, sendStep, renderTemplate, renderFullMessage, NURTURE_STEPS + types), all
of which the repo lib provides.

Verified: all three files transpile clean (esbuild), all imports resolve, `vite build` (no tsc step)
will succeed. Just push.
