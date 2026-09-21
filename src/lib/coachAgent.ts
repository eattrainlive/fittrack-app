/**
 * Coach AI chat client — talks to the `coach-agent` edge function.
 * Sends { chatId, message, stream, draft, memberId } and receives
 * { chatId, message, draft }.
 */
import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draft?: any;
}

export interface ProgrammeDraft {
  weeks?: any[];
  days?: any[];
  exercises?: any[];
  [key: string]: any;
}

export interface CoachChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  draft?: ProgrammeDraft;
  stream?: string;
  member_id?: string | null;
  updated_at?: string;
}

const STAFF_SECRET =
  import.meta.env.VITE_STAFF_SECRET ||
  "42a37f4a3f9ceed78d7928187bfc339d25af43d79d5fb0b0";

export const sendCoachMessage = async (params: {
  chatId?: string;
  message: string;
  stream: string;
  draft?: ProgrammeDraft;
  memberId?: string;
}): Promise<{ chatId: string; message: string; draft?: ProgrammeDraft }> => {
  const { data, error } = await supabase.functions.invoke("coach-agent", {
    body: {
      staffSecret: STAFF_SECRET,
      chatId: params.chatId,
      message: params.message,
      stream: params.stream,
      draft: params.draft,
      memberId: params.memberId,
    },
  });
  if (error) throw error;
  return {
    chatId: data.chatId,
    message: data.message,
    draft: data.draft,
  };
};

export const loadRecentChats = async (): Promise<CoachChat[]> => {
  const { data, error } = await supabase
    .from("programme_chats")
    .select("id, title, stream, member_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title || "Untitled chat",
    stream: r.stream,
    member_id: r.member_id,
    updated_at: r.updated_at,
    messages: [],
  }));
};

export const loadChat = async (chatId: string): Promise<CoachChat | null> => {
  const { data, error } = await supabase
    .from("programme_chats")
    .select("id, title, stream, member_id, messages, draft, updated_at")
    .eq("id", chatId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title || "Untitled chat",
    stream: data.stream,
    member_id: data.member_id,
    messages: data.messages || [],
    draft: data.draft,
    updated_at: data.updated_at,
  };
};

export const deleteChat = async (chatId: string): Promise<void> => {
  await supabase.from("programme_chats").delete().eq("id", chatId);
};
