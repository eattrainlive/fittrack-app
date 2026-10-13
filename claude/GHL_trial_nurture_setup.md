# GoHighLevel setup — Trial Nurture sequence

How the FitTrack cockpit drives WhatsApp over the 30-day trial. FitTrack owns the *timing and the
decision to send*; GHL owns *sending the approved WhatsApp template and recording it on the contact*.
Two inbound-webhook workflows, one contact field, two env vars.

## Architecture (recap)
- **Welcome** auto-fires server-side: when a trialist's clock starts (first booked session), the
  Supabase `gymos-webhook` posts to `TRIAL_STARTED_WEBHOOK_URL` and logs `step_key='welcome'`.
- **Every other step** is coach-reviewed: the cockpit posts to `/.netlify/functions/trial-nurture`
  (staff-only), which posts to `GHL_TRIAL_NURTURE_WEBHOOK_URL`.

Both posts match the contact **by email** and carry `step_key`, `template_key`, `coach_note`.

## Env vars
| Where | Name | Value |
|---|---|---|
| **Netlify** | `GHL_TRIAL_NURTURE_WEBHOOK_URL` | Inbound Webhook URL of GHL workflow **B** (below) |
| **Supabase** (edge fn secret) | `TRIAL_STARTED_WEBHOOK_URL` | Inbound Webhook URL of GHL workflow **A** (below) — *may already be set from the earlier drip; if so, just extend that workflow* |

Supabase secret: `supabase secrets set TRIAL_STARTED_WEBHOOK_URL=...` (already wired into
`gymos-webhook`; redeploy the function after setting). Netlify var via Site settings → Env.

## Contact field
Create one custom field on the Contact: **Coach Note** (`coach_note`). Both workflows write the
incoming `coach_note` to it so the WhatsApp template can merge it and the coach's wording shows on
the contact timeline.

## Workflow A — "Trial started (welcome)"
- **Trigger:** Inbound Webhook (this URL = `TRIAL_STARTED_WEBHOOK_URL`).
- Payload fields: `email`, `name`, `trial_start`, `trial_end`, `step_key` (="welcome"),
  `template_key` (="trial_welcome"), `coach_note`.
- **Steps:** find/create contact by `email` → set **Coach Note** = `coach_note` → send WhatsApp
  template **trial_welcome**.

## Workflow B — "Send nurture step"
- **Trigger:** Inbound Webhook (this URL = `GHL_TRIAL_NURTURE_WEBHOOK_URL`).
- Payload: `email`, `full_name`, `step_key`, `template_key`, `coach_note`, `trial_start`,
  `trial_end`, `trial_day`, `sent_by`, `sent_at`.
- **Steps:** find contact by `email` → set **Coach Note** = `coach_note` → **branch on
  `template_key`** and send the matching approved WhatsApp template:

| `template_key` | Step (trial day) | Purpose |
|---|---|---|
| `trial_post_first` | After 1st session (d3) | How did your first session feel |
| `trial_week1` | Week 1 win (d7) | Celebrate week 1, what's next |
| `trial_momentum` | Momentum (d10, attending) | Reinforce the habit |
| `trial_reengage` | Re-engage (d10, quiet) | Gentle nudge back in |
| `trial_halfway` | Halfway check (d14) | Goal check + offer a review |
| `trial_results_review` | Results review (d21) | Book the results review (convert) |
| `trial_ending_soon` | Ending soon (d25) | Membership options |
| `trial_decision` | Decision (d28) | Last-chance offer |

Plus `trial_welcome` (sent by Workflow A).

## WhatsApp templates
Nine approved templates, one per `template_key` above. Keep them short and personal; include a
merge field for **Coach Note** (`{{contact.coach_note}}`) so Carla's edited line lands inside the
message. The cockpit's `defaultNote` text (in `trialNurture.ts`) is a good starting point for each
template's wording — mirror those so the auto-fill and the sent message read consistently.

## Notes
- FitTrack logs every send in `trial_nurture_log` and won't re-offer a sent step, so GHL does **not**
  need its own "already sent" guard — but keep each template's send idempotent per day if you add
  GHL-side retries.
- No GHL API key is used anywhere — inbound webhooks only (matches the existing reach-out/win-back
  setup).
