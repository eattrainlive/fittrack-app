# GHL + Netlify setup — fire the reach-out WhatsApp from the Staff Hub

When a coach taps **Send WhatsApp** at the WhatsApp step (after 3 no-answers), the app calls a
secret Netlify function, which fires a **GHL Inbound Webhook** workflow. GHL matches the contact by
email and sends your WhatsApp template. The webhook URL never touches the browser.

What the app sends GHL (JSON):
```
{
  "trigger": "staffhub_whatsapp",
  "list_type": "reachout" | "lapsed",
  "email": "person@example.com",
  "first_name": "Laura",
  "last_name": "Moran",
  "full_name": "Laura Moran",
  "sent_by": "<coach name>",
  "sent_at": "2026-10-08T12:00:00.000Z"
}
```

## Step 1 — build the GHL workflow
1. GHL → **Automation → Workflows → + Create Workflow → Start from scratch**. Name it
   "Staff Hub — Reach-out WhatsApp".
2. **Add trigger → Inbound Webhook.** Save. GHL shows a **Webhook URL** — copy it (you'll paste it
   into Netlify in Step 2). *(Optional but better: click "Execute test"/send a sample first so GHL
   learns the field names — you can trigger one real send from the app once Step 2 is done, then map
   fields from that sample.)*
3. **Add action → Find Contact** (or "Update Contact") and match on **Email = `{{inboundWebhookRequest.email}}`**
   so the workflow is working with the right person. (If you'd rather it create a contact when one
   doesn't exist, use Create/Update Contact by email instead.)
4. **Add action → Send WhatsApp.** Pick your approved WhatsApp template / message. Personalise with
   the contact fields (e.g. `{{contact.first_name}}`). This is where your message lives — the app
   doesn't send any text, it just triggers this.
5. **Publish** the workflow (toggle Publish on, top right). Save.

### WhatsApp sending rules (important — we hit this before)
- The number must be WhatsApp-enabled in GHL (LC Phone / WhatsApp), and the message must use an
  **approved template** unless you're inside the 24-hour customer-service window.
- Only message contacts who've **opted in**. Add a condition in the workflow (e.g. only send if a
  "WhatsApp opt-in" field/tag is set) if you want a safety gate. The app doesn't check consent —
  keep that in GHL.

## Step 2 — add the URL to Netlify (keeps it out of the app/browser/Git)
1. Netlify → your site → **Site configuration → Environment variables → Add a variable**.
2. Key: `GHL_WHATSAPP_WEBHOOK_URL`  ·  Value: the Webhook URL you copied in Step 1.
3. Leave **"Contains secret values" unticked** (same as the other STAFFHUB_* vars, so the function
   can read it). Scope: all. Save.
4. Netlify will use it on the next deploy (the deploy that includes `staffhub-whatsapp.js`).

## Step 3 — deploy order
- `netlify/functions/staffhub-whatsapp.js` is in the repo and goes live on your next push.
- Once pushed + the env var is set, the **Send WhatsApp** button fires GHL. If GHL doesn't accept it,
  the app won't mark "WhatsApp sent" and the coach sees "Couldn't save — try again".

## Test
In the app (staff), take a reach-out/win-back card to the WhatsApp step (3 × No answer), tap **Send
WhatsApp**. Check: GHL workflow shows a run, the contact gets the WhatsApp, and the card logs
"WhatsApp sent" with a row in your Actions tab.
