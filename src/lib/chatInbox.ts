import { supabase } from "./supabase";

/**
 * Chat inbox — one row per member WhatsApp/SMS thread for the staff Messages
 * hub. Backed by the member_chat_threads() RPC (latest message per email).
 */

export interface ChatThread {
  email: string;
  name: string;
  lastBody: string | null;
  lastDirection: "in" | "out";
  lastChannel: string;
  lastAt: string;
  lastContactId: string | null;
  lastInboundAt: string | null;
  msgCount: number;
  needsReply: boolean; // the member sent the last message → awaiting us
  windowOpen: boolean; // inside WhatsApp's 24h free-reply window
}

export async function getChatThreads(): Promise<ChatThread[]> {
  try {
    const { data, error } = await supabase.rpc("member_chat_threads");
    if (error) {
      console.warn("member_chat_threads failed", error);
      return [];
    }
    const now = Date.now();
    return ((data as any[]) ?? []).map((r) => {
      const dir = r.last_direction === "in" ? "in" : "out";
      const inboundMs = r.last_inbound_at
        ? new Date(r.last_inbound_at).getTime()
        : null;
      return {
        email: String(r.email),
        name: r.name || r.email,
        lastBody: r.last_body ?? null,
        lastDirection: dir,
        lastChannel: r.last_channel || "whatsapp",
        lastAt: r.last_at,
        lastContactId: r.last_contact_id ?? null,
        lastInboundAt: r.last_inbound_at ?? null,
        msgCount: Number(r.msg_count ?? 0),
        needsReply: dir === "in",
        windowOpen: inboundMs != null && now - inboundMs < 24 * 3600000,
      } as ChatThread;
    });
  } catch (e) {
    console.warn("getChatThreads failed", e);
    return [];
  }
}
