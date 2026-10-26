# GHL — the ONE workflow that makes both trial funnels send

This is the missing piece. The app is fully built: the gymos-webhook starts each trial +
auto-fires the welcome, and the Nurture cockpit / chat posts a `template_key` when Carla taps Send.
Nothing sends until GHL has a workflow that receives that `template_key` and sends the matching
approved WhatsApp template. ONE workflow covers BOTH funnels (30-day coached + 21-day Kickstart) and
both the auto-welcome and the coach-sent steps.

## How the app talks to it
Two places in the app POST to a GHL **Inbound Webhook**, both carrying `email`, `template_key`,
`coach_note` (+ name/dates):
- **Auto-welcome** — the `gymos-webhook` edge fn, when a trial starts. URL lives in the Supabase
  secret **`TRIAL_STARTED_WEBHOOK_URL`**.
- **Coach taps Send** — the `trial-nurture` Netlify fn. URL lives in the Netlify env
  **`GHL_TRIAL_NURTURE_WEBHOOK_URL`**.

➡️ **Point BOTH of those env vars at the SAME workflow's Inbound Webhook URL.** Then one workflow
handles everything, branching on `template_key`.

---

## Step 1 — Coach Note contact field (once)
GHL → **Settings → Custom Fields → Add**. Field name **Coach Note**, type Single-line text. Note its
key (should be `coach_note`). Templates use `{{2}}` = this field.

## Step 2 — Create the workflow
GHL → **Automation → Workflows → Create (blank)**. Name it **"Trial nurture — send"**.

### Trigger
Add trigger **Inbound Webhook**. Save the workflow so GHL generates the webhook URL, then **copy that
URL**. Send one test POST (or use the app once) so GHL captures a sample payload with these fields:
`email`, `full_name`, `template_key`, `coach_note`, `step_key`, `trial_start`, `trial_end`.

### Step 2a — Set the env vars to this URL
- Netlify → `GHL_TRIAL_NURTURE_WEBHOOK_URL` = this URL.
- Supabase secret → `TRIAL_STARTED_WEBHOOK_URL` = this URL. **Redeploy `gymos-webhook`** after.

### Step 2b — Find the contact
Add action **Update Contact** (or "Find Contact") keyed on **Email = `{{inboundWebhookRequest.email}}`**
so the rest of the workflow runs on the right person. (Create-if-missing is fine.)

### Step 2c — Write the coach note
Add action **Update Contact Field → Coach Note = `{{inboundWebhookRequest.coach_note}}`**. This makes
`{{2}}` resolve. (For the note-free templates it's just empty — and those templates have no `{{2}}`,
so nothing breaks.)

### Step 2d — Branch on template_key and send
Add an **If/Else** (or a series of them) on `{{inboundWebhookRequest.template_key}}`. One branch per
key below; each branch's action = **Send WhatsApp → the matching approved template**:

**30-day coached**
| template_key | template |
| --- | --- |
| `trial_welcome` | Welcome (30-day) |
| `trial_post_first` | After 1st session |
| `trial_week1` | Week 1 win |
| `trial_momentum` | Momentum |
| `trial_reengage` | Re-engage |
| `trial_halfway` | Halfway check |
| `trial_results_review` | Book results review |
| `trial_ending_soon` | Ending soon |
| `trial_decision` | Decision |

**21-day Kickstart**
| template_key | template |
| --- | --- |
| `trial_k21_welcome` | Welcome (Kickstart) |
| `trial_k21_post_first` | After 1st visit |
| `trial_k21_try_class` | Try a class |
| `trial_k21_momentum` | Momentum |
| `trial_k21_reengage` | Re-engage |
| `trial_k21_app_workout` | App workout |
| `trial_k21_pt_taster` | PT taster |
| `trial_k21_mid` | Mid-trial |
| `trial_k21_ending_soon` | Ending soon |
| `trial_k21_decision` | Decision |

### Step 2e — (recommended) mirror the sent message into the app thread
Workflow-sent WhatsApps don't trigger your "User Replied" sync, so after each Send add a **Custom
Webhook → POST** to the message-sync fn so the message shows in the in-app chat thread:
- URL: `https://juvofqqtvakltlwqqhkn.supabase.co/functions/v1/wa-message-sync?key=wa_sync_B8c9PlF8JvIz0fLMW6g311HFx0laDS3o`
- Body:
  ```json
  {
    "email": "{{inboundWebhookRequest.email}}",
    "direction": "out",
    "channel": "whatsapp",
    "template_key": "{{inboundWebhookRequest.template_key}}",
    "body": ""
  }
  ```
  (Optional but keeps the chat hub complete. One such step covering all branches is fine if placed
  after the If/Else, since template_key carries through.)

### Step 3 — Publish
Toggle the workflow **Publish / Live**. Set **Allow Re-Entry: ON** (a contact gets many sends over a trial).

---

## Step 4 — Test both funnels
- Start a test **21-day** trial in GymOS → the **welcome should arrive automatically**; the person
  shows in the Nurture cockpit; tapping **Send** on a step delivers it.
- Start a test **30-day** trial → same check.

## Step 5 — ONLY now, turn off the old automations
Switch off your old day-based drip workflows for BOTH trials. Keep ON: this new "Trial nurture — send"
workflow, and the inbound/outbound WhatsApp **sync** workflows.

## Notes
- Templates 1, 2, 6, 7, 10 of the Kickstart set (and welcome/post_first/decision of the 30-day set)
  are **note-free** — build those templates in GHL with **no `{{2}}` variable** (an empty `{{2}}`
  makes WhatsApp reject the send). The app already sends an empty note for them.
- All templates must show **Approved** in WhatsApp Manager before they'll send.
