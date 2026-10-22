# In-app WhatsApp reply (no more opening GHL) — setup

Carla can now reply to a member's WhatsApp straight from the in-app thread
(MemberActivityModal → Messages), instead of bouncing to the slow GHL web app.
The thread shows WhatsApp's 24-hour window state, just like GHL:

- **Inside 24h of the member's last message** → a reply box + "~Xh left" indicator.
  Sending posts through GHL's Conversations API and the message appears instantly.
- **Outside the window** (or no WhatsApp contact linked yet) → an amber notice
  ("free replies are paused… send an approved template") + the deep-link to GHL,
  since WhatsApp only allows templates outside the window.

## How it works
- UI: `src/components/MemberMessagesSection.tsx` (reply box + window banner).
- Lib: `src/lib/memberMessages.ts` — `waWindowStatus()` (computes the 24h window
  from the last inbound message) + `sendWhatsAppReply()`.
- Proxy: `netlify/functions/ghl-send.js` (staff-verified) → `POST
  https://services.leadconnectorhq.com/conversations/messages`
  `{ type:"WhatsApp", contactId, message }`. On success it mirrors the outbound
  into `member_messages` keyed on the returned messageId, so the later "User
  Replied" webhook de-dupes instead of doubling.

## One-time setup

1. **GHL Private Integration token** (this is the only new dependency):
   GHL → **Settings → Private Integrations → New** (sub-account / the ETL
   location). Give it the **Conversations / Conversation Messages — write** (and
   read) scope. Copy the token.

2. **Netlify env vars** (Site settings → Environment variables):
   - `GHL_API_TOKEN` = the Private Integration token from step 1.
   - `GHL_API_VERSION` = optional, defaults to `2021-04-15`.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — already set (other proxies use them).

3. Deploy (push to `main` → Netlify builds the function).

## Notes
- The 24h window is computed from the synced thread (inbound messages arrive via
  the existing `wa-message-sync` webhook), so it tracks GHL closely. If a send is
  rejected right as the window closes, GHL's error is surfaced as a toast and the
  deep-link is still there as a fallback.
- Templates (outside the window) stay in GHL for now — WhatsApp requires an
  approved template there. If you later want template sends in-app too, we can
  add a picker like the trial-nurture one.
- Replying needs a linked WhatsApp contact (a `ghl_contact_id` on the thread),
  which exists as soon as the member has messaged once.
