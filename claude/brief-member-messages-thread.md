# Builder brief — WhatsApp thread on the member profile (read-only + reply-in-GHL)

Add a **Messages** section to `MemberActivityModal.tsx` showing the member's WhatsApp conversation,
read-only, with a button that opens the thread in GoHighLevel to reply. Logic/data already exist in
`src/lib/memberMessages.ts` (committed).

## Why
Coaches currently jump to GHL to see what's been said. This mirrors the conversation onto the
profile so they can READ it in-app; replies still happen in GHL (WhatsApp only allows free-text
within 24h of the client's last message, and GHL manages that), reached via a one-click deep-link.

## Data — from `src/lib/memberMessages.ts`
```ts
import {
  getMemberMessages,   // (email) => Promise<MemberMessage[]>  (oldest → newest)
  ghlConversationUrl,  // ({contactId, conversationId}) => string  (deep-link)
  latestThreadIds,     // (msgs) => { contactId, conversationId }
  type MemberMessage,
} from "@/lib/memberMessages";
```
`MemberMessage`: `direction ("in"|"out")`, `body`, `template_key` (set for outbound templates),
`status`, `occurred_at`, `ghl_contact_id`, `ghl_conversation_id`.

## Where / how
In `MemberActivityModal` (keyed by `member.email`), add a **Messages** section near the bottom
(after the activity/wins, before PAR-Q — or as its own collapsible card). On open / when the modal's
member changes:
```ts
const msgs = await getMemberMessages(member.email);
```
Render a simple chat thread:
- **Inbound** (`direction === "in"`): bubble aligned left, muted background.
- **Outbound** (`direction === "out"`): bubble aligned right, brand/primary background. If
  `template_key` is set, show a tiny "template" tag on the bubble (so coaches can tell an automated
  template from a typed reply).
- **Channel badge:** messages can arrive on WhatsApp OR SMS (GHL falls back to SMS when WhatsApp
  fails). Show a small channel chip on each bubble from `msg.channel` ("WhatsApp" / "SMS") so the
  coach sees how it came in. Default/empty → treat as WhatsApp.
- Each bubble: `body`, with a small timestamp (`occurred_at`, e.g. "14 Oct, 3:42pm"). Keep it compact
  and scrollable (max-height, newest at the bottom, auto-scroll to bottom).
- Empty → a muted "No WhatsApp messages yet."

Above or below the thread, a **"Reply in GoHighLevel ↗"** button:
```ts
const ids = latestThreadIds(msgs);
const href = ghlConversationUrl(ids);
// render as <a href={href} target="_blank" rel="noopener noreferrer">
```
Opens the exact GHL conversation in a new tab. (If no messages / no ids yet, it falls back to the
GHL inbox — still fine.)

## Notes
- Read-only. Do **not** build a send box here — replies go through GHL (that's deliberate; see the
  24h-window reasoning). The deep-link is the reply path.
- Staff-only data (RLS on `member_messages` is staff-read); the modal is already staff-gated.
- Don't poll; load once on open. The modal already has a pattern for per-member async loads
  (see the PAR-Q / activity loads) — mirror that, keyed off `member.email`, guarded against the
  modal closing.
- Keep it lightweight: this is context-at-a-glance, not a full inbox.
