# Catch-up prompt — paste into the builder (Current Trialists "not on app" bug)

The Current Trialists board (`src/components/CurrentTrialistsBoard.tsx`) showed **everyone as "not on
app"**. It checked `mb.activated`, but the roster data the board receives comes from the `rosterStatus`
action, which marks app status with **`onApp`** (`!!onboarded_at`), not `activated`. So every lookup read
`undefined`.

Fix: read `onApp` with `activated` as a fallback, everywhere the board decides app status:
- adoption count: `if (mb?.onApp ?? mb?.activated) onApp++;`
- not-on-app filter: `return !mb || !(mb.onApp ?? mb.activated);`
- per-trialist badge: `const onApp = !!(mb?.onApp ?? mb?.activated);`
  and `const invitedNotSetup = !!mb && !(mb.onApp ?? mb.activated);`
- add `onApp?: boolean | null;` to the `BoardMember` interface.

Keep this — don't revert to checking only `activated`.
