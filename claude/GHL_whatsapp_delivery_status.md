# WhatsApp delivery-failure → resend-as-SMS (setup)

Adds a third GHL workflow that tells the app when an outbound WhatsApp message
**fails to deliver**, so the thread shows a "WhatsApp didn't deliver — resend as
SMS?" prompt (one tap resends the same text by SMS). Companion to
`GHL_whatsapp_inbox_sync.md`.

## How it works
- GHL fires when a message's status changes to **failed** (or delivered/read).
- It POSTs to the existing `wa-message-sync` edge function, which now patches the
  stored message's `status` by its provider id (no new message created).
- The app's thread (`MemberMessagesSection`) shows a red "failed" chip on that
  message and a **Resend as SMS** button when it's the last outbound message.
  Resending sends via the existing `ghl-send` function with `channel:"sms"`.

## GHL workflow — "WhatsApp status → app"
1. GHL → **Automation → Workflows → + Create Workflow** (blank).
2. **Trigger:** choose the message/conversation status trigger. In most GHL
   accounts this is **"Message Status"** (or "Conversation → Message Status
   Updated"). If you only see a generic outbound trigger, use that and add a
   filter on status.
   - **Filter / only continue when:** Status **is** `failed` (you can also add
     `delivered` and `read` later if you want full ticks — the app stores
     whatever status you send).
   - Channel: WhatsApp.
3. **Action:** **Custom Webhook** (PREMIUM action — must be enabled).
   - **Method:** POST
   - **URL:** `https://<your-project>.functions.supabase.co/wa-message-sync?key=<WA_SYNC_WEBHOOK_SECRET>`
     (same URL + key as the inbound/outbound sync workflows).
   - **Body (raw JSON):**
     ```json
     {
       "event": "status",
       "message_id": "{{message.id}}",
       "status": "{{message.status}}"
     }
     ```
     Pick `{{message.id}}` and `{{message.status}}` from GHL's Custom Values
     picker. `message_id` MUST be the same id GHL used when the message was sent
     (that's how the app matches the row). No trailing characters after the last
     `}` — stray text makes GHL mark the step "Skipped".
   - **Allow Re-Entry:** ON.
4. Save & publish. Send a test (or wait for a real failure) and confirm the
   thread flips to "failed" with the Resend button.

## Notes
- Nothing new to deploy for the edge function beyond redeploying `wa-message-sync`
  (it now handles `event:"status"`): `supabase functions deploy wa-message-sync --no-verify-jwt`.
- If GHL can't filter to `failed` on the trigger, send all statuses — the app
  only shows the prompt for `failed`, and the rest are harmless status updates.
- The prompt auto-clears once a newer outbound message exists (e.g. after the
  SMS resend), so it never nags.
