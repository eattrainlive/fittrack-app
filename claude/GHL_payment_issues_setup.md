# GHL setup — Payment-issue follow-up WhatsApp (Carla's Staff Hub)

The **Payment issues** panel (Staff Hub → Call lists tab) reuses the **same** Netlify function and
GHL webhook as the reach-out call lists (`staffhub-whatsapp.js` → `GHL_WHATSAPP_WEBHOOK_URL`). There
is **no new env var and no new Netlify function** — you only add two branches + two templates to the
existing workflow.

When Carla taps **Send WhatsApp** on a flagged member, the app posts the same payload as the call
lists, with `list_type` set to the issue:

```
{
  "trigger": "staffhub_whatsapp",
  "list_type": "payment_failed" | "mandate_cancelled",
  "email": "person@example.com",
  "first_name": "...", "last_name": "...", "full_name": "...",
  "sent_by": "<staff name>", "sent_at": "..."
}
```

## Add to the existing "Staff Hub — Reach-out WhatsApp" workflow
1. Open that workflow in **GHL → Automation → Workflows** (the one whose Inbound Webhook URL is in
   Netlify as `GHL_WHATSAPP_WEBHOOK_URL`).
2. After the **Find/Update Contact by email** step, add an **If/Else (or Branch)** on
   `{{inboundWebhookRequest.list_type}}`:
   - **= `payment_failed`** → **Send WhatsApp**: *Payment-failed follow-up* template.
   - **= `mandate_cancelled`** → **Send WhatsApp**: *Mandate-cancelled follow-up* template.
   - (Leave your existing `reachout` / `lapsed` branches as they are.)
3. **Publish**. No redeploy needed on the GHL side.

## Approved WhatsApp templates (match the copy shown in the app)
The app shows Carla this exact text as a preview/copy fallback, so keep the GHL templates close to it
(personalise with `{{contact.first_name}}`):

**Payment-failed follow-up**
> Hi {{contact.first_name}}, it's the team at ETL 👋 We noticed your latest membership payment didn't
> go through — these things usually just bounce (an expired card or a one-off bank hiccup). No stress
> at all. Could you reply here and we'll get it sorted in a couple of minutes so there's no break in
> your membership? 💪

**Mandate-cancelled follow-up**
> Hi {{contact.first_name}}, it's the team at ETL 👋 It looks like your Direct Debit for your
> membership has been cancelled. If that wasn't on purpose, no worries — we can set a new one up in two
> minutes so nothing's interrupted. If you did mean to, could you give me a quick reply so we can chat
> it through? We'd love to keep you with us. 🙌

## GymOS side (already configured by Michael)
Two GymOS webhook event triggers point at the app's `gymos-webhook` function:
- **Membership payment failure** → raises a `payment_failed` flag.
- **Direct debit mandate cancelled** → raises a `mandate_cancelled` flag (and, importantly, does **not**
  cancel the membership — the member keeps their plan, they've just lost the payment method).

## What to run / deploy
- **RUN SQL:** `supabase/sql/payment_flags.sql`
- **REDEPLOY edge fn:** `gymos-webhook` (new mandate classification + flag writes)
- **PUSH:** `paymentFlags.ts`, `PaymentIssuesPanel.tsx`, `StaffHubTab.tsx`
- **GHL:** add the two branches + templates above.
