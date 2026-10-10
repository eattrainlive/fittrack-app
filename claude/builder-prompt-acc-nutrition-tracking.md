# Builder brief — Accountability nutrition-tracking visibility (live by Sun 25 Oct)

Replaces the old Everfit→MyFitnessPal link. We don't integrate with tracking apps — tracking clients
type the three numbers a coach needs each week, shown against targets in the coach console. Plate
clients (the default) see none of this. "Tracker" = `acc_clients.nutrition_approach === 'tracking'`
(coaches set it on the Roster; clients can switch to tracking in Week 5). The questions must appear
from whichever week the approach is tracking — so always gate on the live `nutrition_approach`, not a
fixed week.

> SQL already provided: `acc_tracking_fields.sql` adds to `acc_clients`: `tracking_app`,
> `tracking_app_other`, `mfp_username`, `calorie_target`, `protein_target`. The weekly numbers ride in
> `acc_checkins.responses` (no new table). Add these fields to the `AccClient` interface in
> `src/lib/accountabilityProgramme.ts`:
> ```ts
> tracking_app?: string | null;         // 'mfp' | 'nutracheck' | 'other' | 'none'
> tracking_app_other?: string | null;
> mfp_username?: string | null;
> calorie_target?: number | null;
> protein_target?: number | null;
> ```

## 1. Onboarding — which app (optional; can follow launch)
In `AccountabilityOnboarding.tsx`, add ONE optional question (do NOT change the 5 required items or the
flow): "If you track your food, which app do you use?" → **MyFitnessPal / Nutracheck / Other (text) / I
don't track.**
- If **MyFitnessPal**: show "Your MyFitnessPal username" + help text: "Set your diary to Public
  (MyFitnessPal → Settings → Diary Settings → Public) so your coach can view it."
- Save to `acc_clients`: `tracking_app` ('mfp'|'nutracheck'|'other'|'none'), `tracking_app_other`,
  `mfp_username`. Editable later by client (console/settings) and coach (console) — people start
  tracking mid-programme.

## 2. Weekly check-in — tracking clients only (`WeeklyCheckin.tsx` + `FinalCheckin.tsx`)
When `client.nutrition_approach === 'tracking'`, add a "Your tracking this week" block (weeks 1–5 weekly
+ the final check-in). Hide it entirely for plate clients.
- **Days logged this week** (0–7, number)
- **Average daily calories** (number)
- **Average daily protein (g)** (number)
- **Screenshot of your app's weekly summary** (optional image upload — same `media` storage + path
  pattern as the existing check-in photo).
- Help text: "Open your tracking app's weekly summary — the numbers are all on that screen. Under a
  minute."
- Save in `responses`: `trackDays`, `trackCalories`, `trackProtein`, `trackShot` (the uploaded URL).

## 3. Coach console (`AccountabilityClientConsole.tsx`) — targets + the weekly picture
Only for tracking clients:
- **Targets editor:** coach sets daily **calorie target** and **protein target (g)** → save to
  `acc_clients.calorie_target` / `protein_target` (add setters to `accountabilityProgramme.ts`, e.g.
  `setTrackingTargets(clientId, { calorie_target, protein_target })`). Show a **suggested protein**
  from baseline weight (`client.baseline?.weight` × 1.2, rounded) as a hint — coach decides.
- **Per check-in row:** days logged, **avg calories vs target**, **avg protein vs target**, and the
  **screenshot** (tap to enlarge in a dialog). Read from `checkin.responses.trackDays/trackCalories/
  trackProtein/trackShot`.
- **Week-by-week trend:** a small calories + protein trend across the programme's check-ins (like the
  existing non-scale trend — values joined week to week).
- **Low-logging flag:** flag a tracking client whose latest `trackDays < 4` ("Inconsistent logging").
  (Also expose this so the future at-risk/RAG view can use it — a simple derived boolean is enough.)
- **App-specific link:** if `tracking_app === 'mfp'` and `mfp_username` set → an **"Open MyFitnessPal
  diary"** link to `https://www.myfitnesspal.com/food/diary/{mfp_username}` (new tab). If
  `tracking_app === 'nutracheck'` → show **"Ask for screenshots"** text (no public diary). 
- The coach can also edit `tracking_app` / `mfp_username` here (clients start tracking mid-programme).

## 4. Roster row (`AccRosterTab.tsx`)
Show a small **tracking-app label** on each client row when set (e.g. "MyFitnessPal" / "Nutracheck" /
"Plate") so coaches see who's using what at a glance.

## 5. Client dashboard (light touch) — tracking clients only (`accDashboard/AccountabilityDashboard.tsx`)
If `client.nutrition_approach === 'tracking'` AND the coach has set targets: a small card showing **last
week's avg calories and protein vs their targets** (from the most recent check-in's
`responses.trackCalories/trackProtein`). No food logging in our app. Hidden for plate clients or when
no targets set.

## Out of scope (do NOT build)
Food logging / a calorie tracker in FitTrack; scraping MyFitnessPal/Nutracheck or asking for passwords;
Apple Health / Health Connect. (Later, separately: auto-reading the screenshot via Claude vision.)

## Acceptance (from the requirements)
1. Plate client: weekly check-in has no tracking block; console shows no tracking columns.
2. Tracking client: check-in shows the block; saves days logged, calories, protein, screenshot.
3. Coach sets targets → check-in row shows actual vs target + the trend across weeks.
4. Tracking client with 3 days logged is flagged.
5. A client switched to tracking in Week 5 sees the block from Week 5 on (gate on live approach).
6. MyFitnessPal user w/ username shows the diary link; Nutracheck shows "Ask for screenshots".
7. The 5 required onboarding items and their behaviour are unchanged.

**Deploy:** SQL in Supabase → builder export → `scripts/merge-builder-export.py` → review → push.
