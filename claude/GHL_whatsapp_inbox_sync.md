# GoHighLevel setup — WhatsApp conversation mirror (inbox sync)

Mirrors every WhatsApp message (both directions) from GHL into the app's `member_messages` table so
the thread shows on the member profile. GHL stays the system of record + the place replies are sent.
One edge function, two GHL workflows, one env var, one location-id constant.

## Pieces
- SQL: `supabase/sql/member_messages.sql` (run once).
- Edge function: `supabase/functions/wa-message-sync` — deploy PUBLIC:
  `supabase functions deploy wa-message-sync --no-verify-jwt`
  then `supabase secrets set WA_SYNC_WEBHOOK_SECRET=<long-random-string>`.
  Endpoint: `https://<project>.supabase.co/functions/v1/wa-message-sync?key=<WA_SYNC_WEBHOOK_SECRET>`
- App constant: set `GHL_LOCATION_ID` in `src/lib/memberMessages.ts` to your GHL sub-account id
  (from the GHL URL `app.gohighlevel.com/v2/location/<THIS>/…`). Enables the direct "Reply in GHL"
  deep-link; left blank it falls back to the GHL inbox.

## Workflow A — "WhatsApp inbound → app"
- **Trigger:** Customer Replied (or Inbound Message), filtered to the WhatsApp channel.
- **Action:** Webhook (POST) to the wa-message-sync endpoint (with `?key=`), JSON body:
  ```json
  {
    "direction": "in",
    "email": "{{contact.email}}",
    "body": "{{message.body}}",
    "message_id": "{{message.id}}",
    "status": "received",
    "contact_id": "{{contact.id}}",
    "conversation_id": "{{conversation.id}}",
    "timestamp": "{{message.date_added}}"
  }
  ```

## Workflow A2 — "SMS inbound → app" (fail-safe channel)
GHL falls back to SMS when WhatsApp can't deliver, so capture SMS replies too. Duplicate Workflow A,
change the filter to **Reply Channel = SMS**, and set the body field `"channel": "sms"` (and keep
`"direction": "in"`). Same webhook URL. (Workflow A's body should set `"channel": "whatsapp"`.) This
way each message is tagged with the right channel and the in-app thread shows a WhatsApp/SMS badge.

## Workflow B — "WhatsApp/SMS outbound → app"
- **Trigger:** an Outbound Message on the WhatsApp channel (covers BOTH the coach's free-text replies
  sent from GHL *and* the template sends). If GHL can't trigger on all outbound, at minimum add this
  same webhook step to the end of the trial-nurture / reach-out send workflows so template sends are
  mirrored.
- **Action:** Webhook (POST) to the same endpoint, body as above but:
  ```json
  { "direction": "out", "template_key": "{{ the template key if a template, else empty }}", ... }
  ```
  (Same email / body / message_id / contact_id / conversation_id / timestamp fields.)

## Field mapping notes
- The edge function is tolerant of key names: it accepts `email|contact_email`,
  `body|message|text`, `message_id|messageId|id`, `contact_id|contactId`,
  `conversation_id|conversationId`, `timestamp|dateAdded|date`. Use whichever GHL merge fields are
  available.
- `message_id` is used for idempotency — a retried webhook won't duplicate a message. Always map it.
- `email` is the join key to the member; if a GHL contact has no email the message won't attach
  (acceptable — those are rare and can be fixed by adding the email in GHL).

## Why read-only + deep-link (not send-from-app)
WhatsApp only permits free-text (non-template) messages within 24h of the client's last inbound
message. GHL manages that window and opt-outs natively. Mirroring in + linking out keeps one place to
send (no double-handling, no window logic to reimplement). A true in-app reply box can be added later
for the open-window case if the team wants it.
