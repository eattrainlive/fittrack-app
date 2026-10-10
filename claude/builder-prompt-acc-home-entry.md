# Builder brief — Accountability: home-screen entry point (launch priority)

**Why:** Enrolled members can currently only reach their 6-week programme via a card near the bottom of
the **Nutrition** tab. On launch morning that's too buried — the programme should be one of the first
things an enrolled member sees when they open the app. Surface it on the **home screen**.

**Scope:** two small changes. No SQL, no new components (reuse the existing `AccountabilityCard`).

## 1. Make `AccountabilityCard` self-hide when irrelevant (`src/components/AccountabilityCard.tsx`)
Right now it only returns null when settings fail to load, so a non-enrolled member with the programme
switched off could see a "Details coming soon" card. Add a guard so it shows ONLY when the member is
enrolled, or the programme is open for sign-ups:
```tsx
if (!cfg) return null;
if (!enrolled && !cfg.enabled) return null;   // nothing relevant to show
```
(Everything else in the card stays — enrolled members get "Your programme / Open programme → /accountability";
non-enrolled with `cfg.enabled` get the marketing version.)

## 2. Render it high on the home screen (`src/pages/Index.tsx`)
- Import `AccountabilityCard` from `@/components/AccountabilityCard`.
- Render `<AccountabilityCard />` near the TOP of the home content — after `<CheckInCodeCard />` and
  before `<MemberGoalsCard />` (around line 241–243). It self-hides (step 1) for members who aren't
  enrolled and have no open programme, so it won't clutter everyone's home.
- Keep the existing card on the Nutrition tab too (no change there) — just add this second placement.

## Acceptance
1. An **enrolled** member opening the app sees a prominent "YOUR PROGRAMME → Open programme" card near
   the top of Home; tapping it opens `/accountability` (their dashboard).
2. A member who is **not enrolled** and the programme is **off** sees no accountability card on Home
   (no "coming soon" clutter).
3. If the programme is **on** for sign-ups (settings enabled) but the member isn't enrolled, they see
   the marketing version on Home.
4. The Nutrition-tab card still works as before.

**Deploy:** builder export → `scripts/merge-builder-export.py` → review → push.
