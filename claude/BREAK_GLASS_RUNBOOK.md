# FitTrack — Break-Glass Runbook

**Purpose:** if the app breaks and Michael is away, this tells a trusted person how to get it
working again. Keep a printed copy in the gym office, a copy in the shared drive, and this copy in
the repo.

> ⚠️ The #1 fix for "the app suddenly stopped working" is **rolling back the last Netlify deploy**
> (Section 3). Try that first — it needs no coding and fixes most problems in under a minute.

---

## 0. Who to contact first
- **Owner / main contact:** Michael Quirk — ☎ __________  ✉ michael@eattrainlivesmart.co.uk
- **Break-glass person (backup):** JJ — ☎ 07414 657217  ✉ jjkey1995@gmail.com
- **Build/dev help (if needed):** __________

## 1. Where everything lives (the whole system)
| Thing | What it does | Where / URL | Who has access |
| --- | --- | --- | --- |
| **GitHub repo** | The app's source code (the source of truth) | github.com/eattrainlive/fittrack-app | Michael, JJ |
| **Netlify** | Hosts the live app + auto-deploys from GitHub | app.netlify.com → site "etlfittrack" | Michael, JJ |
| **Supabase** | Database + edge functions (webhooks) | supabase.com → project `juvofqqtvakltlwqqhkn` | Michael, JJ |
| **GoHighLevel (GHL)** | WhatsApp/SMS + trial nurture workflows | app.gohighlevel.com (ETL sub-account) | Michael, JJ |
| **GymOS** | Membership + bookings (feeds the webhook) | my.gymos.com | Michael, JJ |
| **Password manager** | All the logins above, shared safely | 1Password / Bitwarden vault "ETL FitTrack — Break Glass" | Michael, JJ |

The **live app** is at: https://etlfittrack.netlify.app

## 2. First checks when something "breaks"
1. Is it the **whole app** or just one feature? (Open etlfittrack.netlify.app on your phone.)
2. Is it **everyone** or just one member/device? (Try another device; clear the browser cache.)
3. Did anything **change recently** — a push to GitHub, an edge-function deploy, or a GHL edit?
   Recent change = most likely cause → see Section 3.
4. Check the services are up: Supabase status (status.supabase.com), Netlify status
   (netlifystatus.com). If a provider is down, it's not us — wait for them.

## 3. Roll back a bad deploy (the main fix — no coding)
If the app broke right after a change was pushed:
1. **app.netlify.com** → the site → **Deploys** tab.
2. Find the last deploy that was working (green, before the problem started).
3. Open it → **"Publish deploy"** (sometimes "Publish deploy" under the ⋯ menu).
4. Wait ~30 seconds, reload the app. It should be back to the earlier working version.
5. Tell Michael which deploy you rolled back to.

This undoes a bad code change instantly. It does **not** undo database/SQL changes (rare — see §5).

## 4. Common issues & quick fixes
| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Whole app broken after a push | Bad deploy | **Roll back the Netlify deploy** (§3). |
| Trial welcome WhatsApps not sending | Edge function or GHL workflow | Check Supabase → Edge Functions → `gymos-webhook` is deployed; GHL → the "Trial nurture — send" workflow is **Published**. |
| Members can't log in / app stuck loading | Supabase outage or Realtime blip | Check status.supabase.com; usually self-resolves. Don't change code. |
| Check-in / kiosk not saving | Supabase RLS / edge function | Note the exact error, screenshot it, send to Michael. Don't guess-edit SQL. |
| A WhatsApp failed to send | Normal (not on WhatsApp / out of 24h window) | The app auto-falls back to SMS. No action. |

## 5. Things to NOT touch without Michael / build help
- **SQL / database schema** in Supabase (can lose or corrupt data — rolling back is hard).
- **Deleting** anything in Supabase, GHL, or GymOS.
- **Editing code** directly unless you know what you're doing — prefer the Netlify rollback (§3).

## 6. Getting proper help (the "access Claude" part)
The break-glass person doesn't need Michael's chat — they need **their own Claude login** + the repo:
1. Sign in to Claude (claude.ai / the desktop app) with a team/personal account.
2. Connect / open the **fittrack-app repo** folder (or the GitHub repo).
3. Point Claude at **`claude/status.md`** and the **`claude/catch-up-*.md`** docs — these hold the
   full history of how the system is built, so a fresh Claude session can pick things up.
4. Describe the problem + paste any error. Ask it to diagnose and give the exact fix steps.

> The repo's `status.md` + catch-up docs ARE the backup brain. Keeping them current is what makes
> any new Claude session (or any developer) able to help. Update them after every change.

## 7. Setting JJ up as break-glass person (do these once)

**Approach:** JJ gets his own login where it's free (GitHub, Netlify). Where a service charges
for extra seats (Supabase team is £500+/mo — not worth it for a backup), JJ uses the shared
**password-manager vault** login instead. Every login lives in the vault either way, as backup.

**Status:** ✅ GitHub + Netlify — JJ has his own login (these cover the main fix, the rollback).
Supabase / GHL / GymOS — vault login only.

### 7a. Create the shared vault
- [ ] Create a shared vault in **1Password or Bitwarden** (e.g. vault name "ETL FitTrack — Break Glass").
- [ ] Invite JJ to it.
- [ ] Add every login below to it as they're set up.

### 7b. Invite JJ to each service
- [x] **Netlify** (most important — this is the rollback) → JJ has his own login. ✅
- [x] **GitHub** → JJ added as a collaborator (Write). ✅
- [ ] **Supabase** → team seats cost £500+/mo, so NOT a separate seat. Put the Supabase login in
      the shared vault; JJ signs in with that when needed. Project `juvofqqtvakltlwqqhkn`.
- [ ] **GoHighLevel** → add JJ as a user if free (Settings → My Staff); otherwise vault login.
- [ ] **GymOS** → add JJ as a staff user if free (my.gymos.com); otherwise vault login.

### 7c. Safety net
- [ ] Confirm nothing critical lives only on Michael's laptop (all code pushed to GitHub, all secrets
      in Netlify/Supabase).
- [ ] Set up an **uptime monitor** (e.g. UptimeRobot / Better Stack) pinging etlfittrack.netlify.app
      that emails/texts JJ if it goes down.
- [ ] Print this runbook; store a copy in the gym office + shared drive.
- [ ] Do a 10-minute walkthrough with JJ: show him the **Netlify rollback** (§3) — that alone covers
      most emergencies.
