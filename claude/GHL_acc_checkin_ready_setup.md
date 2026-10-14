# GoHighLevel setup — "Check-in reviewed" WhatsApp

WhatsApps a 6-Week Accountability client the moment a coach finishes reviewing their check-in (saves
the reply + Loom video + notes), telling them to head to their FitTrack profile to watch it. One env
var, one GHL workflow, one approved template. Same shape as the enrol-welcome setup.

## How it fires
Coach saves a check-in reply in the app (`replyToCheckin`) → the app resolves the client's email
(gym-roster email preferred, app email as backup — via the account link) → POSTs to
`/.netlify/functions/acc-checkin-reply` (staff-only) → that posts to `GHL_ACC_CHECKIN_WEBHOOK_URL`.
Best-effort: a send failure never blocks the coach's save. Fires only on a successful reply save.

## Env var (Netlify)
`GHL_ACC_CHECKIN_WEBHOOK_URL` = the Inbound Webhook URL of the GHL workflow below. (Netlify → Site
settings → Environment, then redeploy.)

## Mapping-reference sample (paste / send to capture the fields)
```json
{
  "trigger": "acc_checkin_ready",
  "email": "gym-roster@example.com",
  "alt_email": "app-signup@example.com",
  "first_name": "Jade",
  "full_name": "Jade Morrison",
  "sent_at": "2026-10-14T09:00:00.000Z"
}
```

## Workflow — "Check-in reviewed" (exact steps)
1. **Trigger:** Inbound Webhook (this URL = `GHL_ACC_CHECKIN_WEBHOOK_URL`). Capture the sample above.
2. **Find Contact** — one filter: **Email = `Inbound Webhook Trigger.Email`**; tick **"Include
   additional emails"**. (Optional belt-and-braces: If/Else on "found = false" → second Find Contact
   on `Alt Email`.)
3. **Send WhatsApp** → template **`acc_checkin_ready`**, variable → `{{contact.first_name}}`.
4. **Publish.**

## Template `acc_checkin_ready` (approved WhatsApp)
Human + short. `{{1}}` → `{{contact.first_name}}`. Include the app link (set once in the template):

> Your check-in's back, {{first_name}}! I've left you a video and some notes — head to your FitTrack
> profile to have a watch 👉 https://etlfittrack.netlify.app
> Give me a shout on here if anything needs a chat.

(App URL https://etlfittrack.netlify.app → they log in and open their 6-week programme to see the
coach reply. Emoji optional.)

## Notes
- Matches contact by the gym-roster email (what GHL holds), app email as backup — same reliable
  resolution as the enrol-welcome, so a mismatched FitTrack email still finds them when they're linked.
- To also mirror this send into the member's in-app conversation thread, add the outbound webhook step
  (direction=out) to this workflow — see GHL_whatsapp_inbox_sync.md. Optional.
