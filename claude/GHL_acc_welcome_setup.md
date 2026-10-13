# GoHighLevel setup — 6-Week Accountability welcome WhatsApp

Sends a client a WhatsApp the moment a coach enrols them in the 6-Week Accountability Programme in
FitTrack, telling them they're in and to head to their FitTrack dashboard to complete the onboarding
form. One env var, one GHL workflow, one approved template.

## How it fires
Coach enrols a client (Roster → add to cohort) → `enrolClient` resolves the member's email/name and
POSTs to `/.netlify/functions/acc-welcome` (staff-only) → that posts to `GHL_ACC_WELCOME_WEBHOOK_URL`.
Best-effort: a send failure never blocks the enrolment. Fires only on a clean enrol (not re-adds that
error).

## Env var (Netlify)
`GHL_ACC_WELCOME_WEBHOOK_URL` = the Inbound Webhook URL of the GHL workflow below. (Set in Netlify →
Site settings → Environment, then redeploy.)

## Payload GHL receives
```json
{
  "trigger": "acc_welcome",
  "email": "gym-roster@example.com",
  "alt_email": "app-signup@example.com",
  "first_name": "Jade",
  "full_name": "Jade Morrison",
  "cohort": "<cohort id>",
  "sent_at": "..."
}
```
`email` is the GYM-roster email (what GHL most likely holds — resolved via the account link).
`alt_email` is the FitTrack-signup email, only set if it differs — a belt-and-braces backup.

## Workflow — "Accountability welcome" (exact steps)
1. **Trigger:** Inbound Webhook (this URL = `GHL_ACC_WELCOME_WEBHOOK_URL`). Capture the sample payload
   above so the fields map.
2. **Action: Find Contact** — one filter only: **Email = `Inbound Webhook Trigger.Email`**. Delete any
   "Full name" filter (name can differ and break the match). Tick **"Include additional emails"** so a
   contact whose gym email is stored as a secondary email still matches.
3. **Action: Send WhatsApp** → template **`acc_welcome`** (to the contact Find Contact returned).
4. **Publish** (toggle On).

**Optional extra fail-safe** (only if you want to cover a client who isn't linked yet): after Find
Contact add an **If/Else** on "contact found = false" → a second **Find Contact** on
**Email = `Inbound Webhook Trigger.Alt Email`** → **Send WhatsApp**. For linked members step 2 already
finds them, so this is belt-and-braces.

## Template `acc_welcome` (approved WhatsApp)
Human, short. Variable `{{1}}` → `{{contact.first_name}}`. Include the dashboard link (set it once in
the template — the app doesn't send the URL):

> You're in, {{first_name}}! Welcome to the 6-Week Accountability Programme — buzzing to have you.
> First thing: head to your FitTrack dashboard and fill in your onboarding form so we can tailor it
> all to you 👉 https://etlfittrack.netlify.app
> Any bother getting in, just reply here and we'll sort it.

(App URL is https://etlfittrack.netlify.app — they log in and the onboarding "Finish setting up" card
is on their dashboard. Emoji optional; drop it if you prefer.)

## Notes
- Matches contact by email, so the client needs the same email in GHL as on their FitTrack account
  (they do — they're an app member being enrolled by user id, and `members.email` is used).
- No SMS fallback here by default; if you want one, add an If/Else on WhatsApp delivery in the
  workflow and send a plain-text SMS version (no template approval needed for SMS).
- This send will also mirror into the member's in-app conversation thread **if** you add the outbound
  webhook step to this workflow (direction=out) — see GHL_whatsapp_inbox_sync.md. Optional.
