# JJ — Break-Glass Training Walkthrough

This is the sit-down version: go through it once with Michael, have a practice, and you're set.
There's a one-page cheat sheet (`JJ_CHEAT_SHEET.md`) to keep by the desk for the real thing.

**The single most important idea:** you almost never need to "fix code". When the app breaks, the
fix is nearly always to **roll the app back to the last version that worked** — a few clicks in
Netlify, no coding. If you learn one thing, learn that (Section 3).

---

## 1. What you're actually looking after

The FitTrack app (the ETL app members use to check in, see workouts, log weights, etc.) is made of
a few pieces that talk to each other:

- **Netlify** — this is what members actually load. It "hosts" the live app. Every time Michael
  pushes a change, Netlify publishes a new version. **This is where you fix things.**
- **GitHub** — the stored source code (the master copy). You'll rarely touch this.
- **Supabase** — the database (members, check-ins, workouts) and the little background programs
  ("webhooks") that react to things like a new membership.
- **GoHighLevel (GHL)** — sends the WhatsApp/SMS messages (trial follow-ups etc.).
- **GymOS** — memberships and bookings; it tells the app when someone joins or books.

You don't need to understand how they work. You need to know: **if something breaks, which one to
look at, and when to just roll back.**

The live app is at: **https://etlfittrack.netlify.app**

---

## 2. First 2 minutes — work out what's actually wrong

Before touching anything, answer these. It saves you fixing the wrong thing.

1. **Is it the whole app, or just one feature?**
   Open etlfittrack.netlify.app on your own phone. Does it load at all? Is it just (say) check-in
   that's broken, or everything?

2. **Is it everyone, or just one person/device?**
   Try a different phone, or ask another member. If it's only one person, it's usually *their*
   phone/browser — get them to close and reopen the app, or try a different device. That's not an
   app emergency.

3. **Did anything change recently?**
   Did Michael push an update today? Was there an edit to messages or settings? **A recent change
   is the #1 cause.** If yes → go to Section 3 and roll it back.

4. **Is it us, or is a provider down?**
   Check status.supabase.com and netlifystatus.com. If one of them shows an outage, it's not us —
   there's nothing to fix, it'll come back on its own. Tell Michael and wait.

---

## 3. The main fix — roll back a bad deploy (NO coding)

Use this when: **the app broke right after a change**, or the whole thing is misbehaving and you
don't know why. This puts the app back to the last version that worked. It's safe and fast.

1. Go to **app.netlify.com** and sign in (your own login).
2. Open the site called **etlfittrack**.
3. Click the **Deploys** tab.
4. You'll see a list of versions, newest at the top. Find the most recent one that was **working**
   — i.e. the one from *before* the problem started. It'll be marked "Published" and green.
5. Click into that deploy.
6. Click **Publish deploy** (sometimes under a **⋯** menu, labelled "Publish deploy").
7. Wait ~30 seconds, then reload the app. It should be back to the working version.
8. **Message Michael**: tell him you rolled back, and roughly when the problem started.

That's it. This undoes a bad code change instantly.

⚠️ Rollback fixes **code/app** problems. It does **not** undo database changes — but those are rare
and you shouldn't be making them anyway (see Section 5).

**Practice now:** with Michael, open Netlify → Deploys, find the current live version and the one
before it, and talk through which you'd click. Don't actually republish — just find the buttons.

---

## 4. Common problems and what to do

| What you're seeing | Most likely | What you do |
| --- | --- | --- |
| Whole app broke right after an update | Bad deploy | **Roll back in Netlify** (Section 3). |
| Trial welcome WhatsApps not sending | GHL or a webhook | Check GHL → the "Trial nurture — send" workflow is **Published** (on). Then tell Michael. |
| Members can't log in / app stuck loading | Usually Supabase having a blip | Check status.supabase.com. Usually fixes itself. **Don't change code.** |
| Check-in / iPad kiosk not saving | Database/webhook | **Screenshot the exact error** and send to Michael. Don't guess-edit anything. |
| One WhatsApp didn't send | Totally normal (person not on WhatsApp / outside 24h window) | Nothing — the app automatically sends an SMS instead. |
| Just one member's phone acting up | Their device | Close + reopen app, or try another device. Not an emergency. |

Rule of thumb: **whole-app = roll back. One feature = screenshot + tell Michael.**

---

## 5. Do NOT touch these without Michael

These can lose data or make things much worse, and rolling them back is hard:

- **The database / SQL** in Supabase — don't run or edit anything.
- **Deleting** anything in Supabase, GHL, or GymOS.
- **Editing the code** directly — always prefer the Netlify rollback instead.

If the fix isn't "roll back in Netlify", your job is to **gather info and escalate**, not to
experiment. Screenshot the error, note what changed, message Michael.

---

## 6. Getting proper help (using Claude + the repo)

If Michael's unreachable and it's more than a rollback, you can get expert help yourself:

1. Sign in to **Claude** (claude.ai or the desktop app) with your own account.
2. Open / connect the **fittrack-app** project folder (or the GitHub repo
   github.com/eattrainlive/fittrack-app).
3. Tell Claude to read **`claude/status.md`** and the **`claude/catch-up-*.md`** files — these hold
   the full history of how everything is built, so a fresh Claude can get up to speed fast.
4. Describe the problem, paste any error/screenshot, and ask it to diagnose and give you the exact,
   step-by-step fix. Follow the safe steps; if it wants to touch the database, pause and get Michael.

The repo's `status.md` is basically the "backup brain" for the whole system.

---

## 7. Where all the logins are

Everything lives in the **shared password vault** ("ETL FitTrack — Break Glass" in 1Password/
Bitwarden). You've got your **own** logins for **GitHub** and **Netlify** already. For Supabase,
GHL and GymOS, use the shared logins from the vault.

Full contact + system details are in `claude/BREAK_GLASS_RUNBOOK.md`.

---

## 8. The 30-second summary

1. App broke? Check: whole app or one feature? Everyone or one person? Anything change?
2. Whole app, broke after a change → **Netlify → Deploys → publish the last good version.**
3. One feature → **screenshot + message Michael.**
4. Never edit the database or delete things.
5. Stuck and Michael's away → **ask Claude**, point it at `status.md`.
