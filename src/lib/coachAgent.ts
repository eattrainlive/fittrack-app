/**
 * Coach AI chat client — talks to the `coach-agent` edge function.
 *
 * Living-draft protocol (all reads go through the function's service role):
 *   - chat turn (default): { message, stream, chatId?, memberId?, weekNumber?, weeksTotal? }
 *                          → { chatId, assistant }
 *   - { action: "list" }                          → { chats: [{ id, title, stream, updated_at }] }
 *   - { action: "get", chatId }                    → { messages, draft, stream, title, weeksTotal }
 *   - { action: "sync_week", chatId, weekNumber, weeksTotal, stream } → { draft }
 *   - { action: "structure", chatId, memberId?, repeatTo? }           → { draft }
 *
 * Uses the existing ANTHROPIC_API_KEY Supabase secret (same as the workout generator).
 */
import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draft?: any;
}

export interface ProgrammeDraft {
  name?: string;
  stream?: string;
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
  weeksTotal?: number;
  updated_at?: string;
}

const STAFF_SECRET =
  import.meta.env.VITE_STAFF_SECRET ||
  "42a37f4a3f9ceed78d7928187bfc339d25af43d79d5fb0b0";

/** Invoke the coach-agent function with a given body. */
const invoke = async (payload: Record<string, any>) => {
  const { data, error } = await supabase.functions.invoke("coach-agent", {
    body: { staffSecret: STAFF_SECRET, ...payload },
  });
  if (error) throw error;
  return data;
};

export const sendCoachMessage = async (params: {
  chatId?: string;
  message: string;
  stream: string;
  memberId?: string;
  weekNumber?: number;
  weeksTotal?: number;
}): Promise<{ chatId: string; assistant: string }> => {
  const data = await invoke({
    message: params.message,
    stream: params.stream,
    chatId: params.chatId,
    memberId: params.memberId,
    weekNumber: params.weekNumber,
    weeksTotal: params.weeksTotal,
  });
  return {
    chatId: data.chatId,
    assistant: data.assistant ?? data.message ?? "",
  };
};

/** Structure the AI's latest week into the draft slot (living-draft update). */
export const syncWeek = async (params: {
  chatId: string;
  weekNumber: number;
  weeksTotal: number;
  stream: string;
}): Promise<ProgrammeDraft | null> => {
  const data = await invoke({
    action: "sync_week",
    chatId: params.chatId,
    weekNumber: params.weekNumber,
    weeksTotal: params.weeksTotal,
    stream: params.stream,
  });
  if (!data || data.error) return null;
  return data.draft;
};

/** List recent chats via the function (service role — bypasses RLS). */
export const loadRecentChats = async (): Promise<CoachChat[]> => {
  const data = await invoke({ action: "list" });
  const chats = data.chats || [];
  return chats.map((r: any) => ({
    id: r.id,
    title: r.title || "Untitled chat",
    stream: r.stream,
    updated_at: r.updated_at,
    messages: [],
  }));
};

/** Reopen a chat via the function (service role). */
export const loadChat = async (chatId: string): Promise<CoachChat | null> => {
  const data = await invoke({ action: "get", chatId });
  if (!data || data.error) return null;
  return {
    id: chatId,
    title: data.title || "Untitled chat",
    stream: data.stream,
    member_id: data.member_id,
    messages: data.messages || [],
    draft: data.draft,
    weeksTotal: data.weeksTotal || data.draft?.weeks?.length || 4,
    updated_at: data.updated_at,
  };
};

/** Delete a chat (staff RLS allows this directly). */
export const deleteChat = async (chatId: string): Promise<void> => {
  await supabase.from("programme_chats").delete().eq("id", chatId);
};

/**
 * Request the stored living draft for "Open in editor" (optionally repeated).
 * Passing memberId records the committed programme against that member so
 * future chats can progress from it (cross-chat memory).
 */
export const structureDraft = async (
  chatId: string,
  memberId?: string,
  repeatTo?: number,
): Promise<ProgrammeDraft | null> => {
  const data = await invoke({
    action: "structure",
    chatId,
    memberId,
    repeatTo,
  });
  if (!data || data.error) return null;
  return data.draft;
};
