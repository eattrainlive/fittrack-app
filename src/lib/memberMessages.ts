import { supabase } from "./supabase";

/**
 * WhatsApp conversation mirror for a member's profile. Read-only: messages are
 * fed from GoHighLevel by the wa-message-sync edge function. Coaches READ the
 * thread in-app; REPLIES still happen in GHL (free-text within WhatsApp's 24h
 * window) — the cockpit/profile deep-links straight to the GHL thread.
 */

// ⚠ SET THIS ONCE: your GoHighLevel location (sub-account) id. Found in the GHL
// URL: app.gohighlevel.com/v2/location/<THIS>/… Used to build the deep-link to a
// contact's conversation. If left blank, the deep-link falls back to the GHL
// conversations inbox.
export const GHL_LOCATION_ID = "rY0ybTWzhrquwXgUIX62";

export interface MemberMessage {
  id: string;
  email: string;
  direction: "in" | "out";
  body: string | null;
  channel: string;
  template_key: string | null;
  status: string | null;
  ghl_contact_id: string | null;
  ghl_conversation_id: string | null;
  occurred_at: string;
}

/** Full WhatsApp thread for one member, oldest → newest (for a chat view). */
export async function getMemberMessages(email: string): Promise<MemberMessage[]> {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  try {
    const { data } = await supabase
      .from("member_messages")
      .select(
        "id, email, direction, body, channel, template_key, status, ghl_contact_id, ghl_conversation_id, occurred_at",
      )
      .eq("email", e)
      .order("occurred_at", { ascending: true });
    return (data as MemberMessage[]) ?? [];
  } catch (err) {
    console.warn("getMemberMessages failed", err);
    return [];
  }
}

/**
 * Deep-link to the person's GoHighLevel conversation (option 3 — reply in GHL).
 * Prefers the exact conversation, falls back to the contact, then the inbox.
 * Pass the most recent message's ghl_contact_id / ghl_conversation_id.
 */
export function ghlConversationUrl(opts: {
  contactId?: string | null;
  conversationId?: string | null;
}): string {
  const base = "https://app.gohighlevel.com/v2/location";
  if (!GHL_LOCATION_ID) {
    // No location configured — best we can do is the generic app; set
    // GHL_LOCATION_ID above for a direct link.
    return "https://app.gohighlevel.com/";
  }
  const loc = `${base}/${GHL_LOCATION_ID}/conversations/conversations`;
  if (opts.conversationId) return `${loc}/${opts.conversationId}`;
  if (opts.contactId) return `${loc}/${opts.contactId}`;
  return `${base}/${GHL_LOCATION_ID}/conversations/conversations`;
}

/**
 * WhatsApp's 24-hour customer-care window. Free-text replies are only allowed
 * within 24h of the member's LAST INBOUND message; outside it, WhatsApp only
 * permits an approved template (so Carla needs GHL for those). Mirrors how GHL
 * shows the window state on the conversation.
 */
export interface WaWindow {
  open: boolean;
  lastInboundAt: string | null;
  hoursLeft: number | null; // hours remaining in the window, when open
}

export function waWindowStatus(msgs: MemberMessage[]): WaWindow {
  let lastInbound: number | null = null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].direction === "in" && msgs[i].occurred_at) {
      const t = new Date(msgs[i].occurred_at).getTime();
      if (!isNaN(t)) {
        lastInbound = t;
        break;
      }
    }
  }
  if (lastInbound == null)
    return { open: false, lastInboundAt: null, hoursLeft: null };
  const elapsedH = (Date.now() - lastInbound) / 3600000;
  const open = elapsedH < 24;
  return {
    open,
    lastInboundAt: new Date(lastInbound).toISOString(),
    hoursLeft: open ? Math.max(0, 24 - elapsedH) : null,
  };
}

/**
 * Send a free-text WhatsApp reply through GoHighLevel's API (staff-only proxy).
 * Only valid inside the 24h window — outside it, GHL/WhatsApp will reject a
 * free-text send, so the UI gates this on waWindowStatus().open.
 */
export async function sendWhatsAppReply(opts: {
  email: string;
  contactId: string;
  message: string;
  channel?: "whatsapp" | "sms";
}): Promise<{
  ok: boolean;
  error?: string;
  sentChannel?: "whatsapp" | "sms";
  fellBack?: boolean;
}> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/.netlify/functions/ghl-send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...opts, channel: opts.channel ?? "whatsapp" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error || `send failed (${res.status})` };
    }
    return { ok: true, sentChannel: data?.channel, fellBack: !!data?.fellBack };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/** The contact/conversation ids to deep-link with, taken from the latest message. */
export function latestThreadIds(msgs: MemberMessage[]): {
  contactId: string | null;
  conversationId: string | null;
} {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].ghl_contact_id || msgs[i].ghl_conversation_id) {
      return {
        contactId: msgs[i].ghl_contact_id,
        conversationId: msgs[i].ghl_conversation_id,
      };
    }
  }
  return { contactId: null, conversationId: null };
}
