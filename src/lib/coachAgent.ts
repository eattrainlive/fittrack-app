/**
 * Coach AI chat client — talks to the `coach-agent` edge function.
 *
 * Action-based protocol (all reads go through the function's service role,
 * never a direct Supabase table query — RLS would block those):
 *   - chat turn (default): { message, stream, chatId?, draft?, memberId? } → { chatId, assistant, draft }
 *   - { action: "list" }   → { chats: [{ id, title, stream, updated_at }] }
 *   - { action: "get", chatId } → { messages, draft, stream, title }
 *   - { action: "structure", chatId } → { draft }  (structured JSON for the editor)
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
  draft?: ProgrammeDraft;
  memberId?: string;
}): Promise<{ chatId: string; assistant: string; draft?: ProgrammeDraft }> => {
  const data = await invoke({
    message: params.message,
    stream: params.stream,
    chatId: params.chatId,
    draft: params.draft,
    memberId: params.memberId,
  });
  return {
    chatId: data.chatId,
    assistant: data.assistant ?? data.message ?? "",
    draft: data.draft,
  };
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
    updated_at: data.updated_at,
  };
};

/** Delete a chat (staff RLS allows this directly). */
export const deleteChat = async (chatId: string): Promise<void> => {
  await supabase.from("programme_chats").delete().eq("id", chatId);
};

/**
 * Request the structured programme JSON for "Open in editor".
 * The function asks Claude to produce strict editor-shape JSON from the
 * conversation, resolving exercises to library ids server-side.
 * Passing memberId records the committed programme against that member so
 * future chats can progress from it (cross-chat memory).
 * Passing repeatTo (e.g. 8 or 12) repeats the built block to that many weeks
 * (exact copy, wrapping) — handy for Group PT's 12-week structure.
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
