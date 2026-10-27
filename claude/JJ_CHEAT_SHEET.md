# 🚨 FitTrack — JJ's Cheat Sheet

**Live app:** https://etlfittrack.netlify.app   **Owner:** Michael — michael@eattrainlivesmart.co.uk

---

## STEP 1 — What's wrong? (30 seconds)
- **Whole app down, or just one feature?** (Open the app on your phone.)
- **Everyone, or just one person?** (If one person → it's their phone. Reopen app / try another device. Not an emergency.)
- **Did anything change today?** (A recent update = the usual cause → roll back, Step 2.)
- **Provider down?** Check status.supabase.com + netlifystatus.com. If they're down, it's not us — wait.

## STEP 2 — THE FIX: roll back in Netlify (no coding)
> Use when the whole app breaks, especially after a change.
1. **app.netlify.com** → sign in → site **etlfittrack**
2. **Deploys** tab
3. Find the last **green / Published** version from *before* the problem
4. Click it → **Publish deploy**
5. Wait 30 sec → reload the app ✅
6. **Message Michael** what you did

## STEP 3 — If it's NOT a whole-app problem
**Screenshot the exact error → message Michael.** Don't guess-fix.

---

## ✅ Safe to do
- Roll back a deploy in Netlify (Step 2)
- Check provider status pages
- Screenshot errors, note what changed

## ⛔ NEVER do without Michael
- Edit or run anything in the **database (Supabase SQL)**
- **Delete** anything (Supabase / GHL / GymOS)
- Edit the **code** directly

---

## Quick symptom guide
| Seeing | Do |
| --- | --- |
| Whole app broke after an update | **Roll back** (Step 2) |
| App stuck loading / can't log in | Check status.supabase.com — usually self-fixes. Don't touch code. |
| Trial WhatsApps not sending | GHL → "Trial nurture — send" workflow is **Published**? Then tell Michael. |
| Check-in / kiosk not saving | **Screenshot + Michael.** Don't edit anything. |
| One WhatsApp didn't send | Normal — app auto-sends SMS. Do nothing. |
| One member's phone playing up | Their device. Reopen app / try another. |

---

## Stuck and Michael's away?
Sign in to **Claude** → open the **fittrack-app** repo → tell it to read **`claude/status.md`** →
describe the problem + paste the error → follow the safe steps it gives. Pause before any database change.

**Logins:** shared vault "ETL FitTrack — Break Glass". You have your own GitHub + Netlify logins.
