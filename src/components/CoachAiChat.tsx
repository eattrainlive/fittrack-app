/**
 * Coach AI Chat — conversational programme builder (living-draft / grid flow).
 * Staff-only. Talks to the `coach-agent` edge function.
 *
 * Flow:
 *  - Coach sets Stream + Weeks total (+ optional Member) up front.
 *  - Week tabs (Week 1 … N); the "current week" is what each message targets.
 *  - On send: chat turn (returns readable markdown reply) → then sync_week
 *    (structures that week into the living draft, replacing its slot).
 *  - The draft table (right side / below on mobile) is the source of truth —
 *    it always reflects the current draft, updated each turn.
 *  - "Open in editor" hands the stored draft to the manual programme editor.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  sendCoachMessage,
  syncWeek,
  loadRecentChats,
  loadChat,
  deleteChat,
  structureDraft,
  type ChatMessage,
  type ProgrammeDraft,
  type CoachChat,
} from "@/lib/coachAgent";

interface CoachAiChatProps {
  /** Called when the coach clicks "Open in editor" — hands the structured
   *  draft to the manual programme editor. */
  onOpenInEditor: (draft: ProgrammeDraft, stream: string) => void;
  /** Members list for the member picker (optional). */
  members?: any[];
}

const STREAMS = ["Stronger", "Fusion", "Performance", "GroupPT", "Foundations"];
const WEEK_OPTIONS = [2, 3, 4, 6, 8, 12];

export const CoachAiChat = ({
  onOpenInEditor,
  members = [],
}: CoachAiChatProps) => {
  const [chats, setChats] = useState<CoachChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<ProgrammeDraft | undefined>(undefined);
  const [stream, setStream] = useState("Stronger");
  const [memberId, setMemberId] = useState<string>("");
  const [weeksTotal, setWeeksTotal] = useState(4);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [repeatTo, setRepeatTo] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const refreshChats = useCallback(async () => {
    setLoadingChats(true);
    const recent = await loadRecentChats();
    setChats(recent);
    setLoadingChats(false);
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Scroll the draft table to the current week when it changes.
  useEffect(() => {
    if (tableRef.current) {
      const el = tableRef.current.querySelector(
        `[data-week-row="${currentWeek}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentWeek, draft]);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setDraft(undefined);
    setInput("");
    setWeeksTotal(4);
    setCurrentWeek(1);
    setRepeatTo(0);
  };

  const handleOpenChat = async (chatId: string) => {
    const chat = await loadChat(chatId);
    if (!chat) {
      toast.error("Couldn't open that chat");
      return;
    }
    setCurrentChatId(chat.id);
    setMessages(chat.messages || []);
    setDraft(chat.draft);
    if (chat.stream) setStream(chat.stream);
    if (chat.member_id) setMemberId(chat.member_id);
    if (chat.weeksTotal) setWeeksTotal(chat.weeksTotal);
    setCurrentWeek(1);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (currentChatId === chatId) handleNewChat();
    refreshChats();
    toast.success("Chat deleted");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setSending(true);
    try {
      // 1) Chat turn — readable markdown reply for the current week.
      const res = await sendCoachMessage({
        chatId: currentChatId || undefined,
        message: text,
        stream,
        memberId: memberId || undefined,
        weekNumber: currentWeek,
        weeksTotal,
      });
      const replyText = res.assistant || "";
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: replyText,
      };
      const withReply = [...nextMessages, assistantMsg];
      setMessages(withReply);
      const chatId = res.chatId || currentChatId || "";
      if (!currentChatId && chatId) setCurrentChatId(chatId);
      refreshChats();

      // 2) sync_week — fold the AI's latest week into the living draft.
      if (chatId) {
        setSyncing(true);
        try {
          const updated = await syncWeek({
            chatId,
            weekNumber: currentWeek,
            weeksTotal,
            stream,
          });
          if (updated) setDraft(updated);
        } catch {
          // non-fatal — the reply is still shown; coach can retry.
          toast.error("Couldn't update the draft table — try sending again.");
        } finally {
          setSyncing(false);
        }
      }
    } catch (e: any) {
      toast.error("AI request failed: " + (e?.message || "unknown error"));
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  const handleOpenInEditor = async () => {
    if (!currentChatId) {
      toast.error("Start a conversation first");
      return;
    }
    setStructuring(true);
    try {
      const structured = await structureDraft(
        currentChatId,
        memberId || undefined,
        repeatTo || undefined,
      );
      if (!structured) {
        toast.error("Couldn't structure the programme — try refining first");
        return;
      }
      setDraft(structured);
      onOpenInEditor(structured, stream);
    } catch (e: any) {
      toast.error("Structuring failed: " + (e?.message || "unknown error"));
    } finally {
      setStructuring(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const draftWeeks: any[] = draft?.weeks || [];
  // Ensure the table shows weeksTotal slots even if draft is sparse.
  const tableWeeks = Array.from({ length: weeksTotal }, (_, i) => {
    const w = draftWeeks.find((dw) => dw.week === i + 1);
    return w || { week: i + 1, days: [], label: `Week ${i + 1}` };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* Chat column */}
      <Card
        className="bg-card border-border flex flex-col"
        style={{ minHeight: "70vh" }}
      >
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Coach
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Up-front setup: Stream + Weeks + Member */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Stream</Label>
              <Select value={stream} onValueChange={setStream}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STREAMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weeks</Label>
              <div className="flex gap-1 h-9 items-center">
                {WEEK_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWeeksTotal(w);
                      if (currentWeek > w) setCurrentWeek(w);
                    }}
                    className={`h-9 min-w-[2.25rem] px-2 rounded-md text-sm font-medium border transition-colors ${
                      weeksTotal === w
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted/50"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            {members.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Member (optional)</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Any member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any member</SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Week tabs */}
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: weeksTotal }, (_, i) => i + 1).map((w) => {
              const built = draftWeeks.find((dw) => dw.week === w)?.days
                ?.length;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setCurrentWeek(w)}
                  className={`px-3 h-8 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    currentWeek === w
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  Wk {w}
                  {built ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 rounded-lg border border-border bg-muted/20 p-4"
          >
            {messages.length === 0 && !sending && (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Start a conversation</p>
                <p className="text-sm mt-1">
                  You're building <strong>Week {currentWeek}</strong> of a{" "}
                  {weeksTotal}-week {stream} programme.
                </p>
                <p className="text-xs mt-2 text-muted-foreground/70">
                  e.g. "Build the lower-body strength day — squat focus, 4
                  working sets."
                </p>
                <p className="text-xs mt-3 text-muted-foreground/70 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Remembers your last 3 programmes for this
                  {memberId ? " member" : " stream"} — it progresses from them
                  automatically.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownText text={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Thinking…
                  </span>
                </div>
              </div>
            )}
            {syncing && (
              <div className="flex justify-start">
                <div className="bg-muted/40 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Updating draft table…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe Week ${currentWeek}…`}
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="gap-2 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sidebar: draft table + recent chats */}
      <div className="space-y-4">
        {/* Draft table — the source of truth */}
        <Card className="bg-card border-border">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Draft programme
            </CardTitle>
            {syncing && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              ref={tableRef}
              className="max-h-[460px] overflow-y-auto space-y-3"
            >
              {tableWeeks.map((week: any) => {
                const days = week.days || [];
                const isBuilt = days.length > 0;
                const isCurrent = week.week === currentWeek;
                return (
                  <div
                    key={week.week}
                    data-week-row={week.week}
                    className={`rounded-lg border p-3 ${
                      isCurrent
                        ? "border-primary/60 ring-1 ring-primary/20"
                        : "border-border"
                    } ${!isBuilt ? "opacity-60" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentWeek(week.week)}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <span className="font-semibold text-sm">
                        {week.label || `Week ${week.week}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isBuilt
                          ? `${days.length} session${days.length !== 1 ? "s" : ""}`
                          : "Not built yet"}
                      </span>
                    </button>
                    {isBuilt ? (
                      <div className="space-y-2">
                        {days.map((day: any, di: number) => (
                          <DraftDayBlock key={di} day={day} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Send a message to build this week.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Open in editor */}
            <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-border">
              <div className="space-y-1">
                <Label className="text-xs">Repeat block to</Label>
                <Select
                  value={String(repeatTo)}
                  onValueChange={(v) => setRepeatTo(Number(v))}
                >
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="8">8 weeks</SelectItem>
                    <SelectItem value="12">12 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={handleOpenInEditor}
                disabled={structuring || !currentChatId}
              >
                {structuring ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Open in editor
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep refining by sending another message, then open in editor to
              save as a programme.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Recent chats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loadingChats && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!loadingChats && chats.length === 0 && (
              <p className="text-sm text-muted-foreground">No chats yet.</p>
            )}
            {chats.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 ${
                  currentChatId === c.id ? "bg-muted/50" : ""
                }`}
                onClick={() => handleOpenChat(c.id)}
              >
                <span className="truncate flex-1">{c.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(c.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/** A single day/session in the draft table. */
const DraftDayBlock = ({ day }: { day: any }) => {
  const rows = day.rows || [];
  return (
    <div className="rounded-md bg-muted/20 p-2">
      <p className="font-medium text-xs text-foreground">
        {day.day || day.name || "Session"}
        {day.minDays ? (
          <span className="ml-1 text-muted-foreground">
            · min {day.minDays}d
          </span>
        ) : null}
        {day.theme ? (
          <span className="ml-1 text-muted-foreground">· {day.theme}</span>
        ) : null}
      </p>
      <div className="ml-1 mt-1 space-y-0.5">
        {rows.map((r: any, ri: number) =>
          r.isSection ? (
            <div key={ri} className="font-medium text-xs text-foreground">
              ▸ {r.name}
              {r.sectionType && r.sectionType !== "Normal"
                ? ` · ${r.sectionType}`
                : ""}
              {r.description ? ` (${r.description})` : ""}
            </div>
          ) : (
            <div key={ri} className="text-xs text-muted-foreground">
              {r.linkedToNext ? "🔗 " : ""}
              {r.label || r.name || "—"}
              {!r.name && r.label ? " (unmatched)" : ""}
              {r.sets || r.reps ? ` — ${r.sets || 0}×${r.reps || ""}` : ""}
              {r.timeMins || r.timeSecs
                ? ` — ${r.timeMins || 0}m ${r.timeSecs || 0}s`
                : ""}
              {r.distance ? ` · ${r.distance}m` : ""}
              {r.calories ? ` · ${r.calories}cal` : ""}
              {r.coachingNotes ? (
                <span className="block text-muted-foreground/70 italic">
                  {r.coachingNotes}
                </span>
              ) : null}
            </div>
          ),
        )}
      </div>
    </div>
  );
};

/**
 * Minimal markdown renderer for assistant replies (headings, bold, italics,
 * bullet/numbered lists, paragraphs). Avoids pulling in a markdown dependency.
 * Escapes HTML first, then applies inline + block transforms.
 */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderInline = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

const MarkdownText = ({ text }: { text: string }) => {
  const lines = (text || "").split("\n");
  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      blocks.push(
        `<${tag} class="ml-4 my-1 space-y-0.5">${list.items
          .map((it) => `<li>${renderInline(it)}</li>`)
          .join("")}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    // Escape the raw line FIRST, then apply markdown transforms.
    const line = escapeHtml(raw.trimEnd());
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      const cls =
        lvl <= 1
          ? "font-heading font-bold text-base mt-2 mb-1"
          : lvl === 2
            ? "font-semibold text-sm mt-2 mb-1"
            : "font-medium text-sm mt-1";
      blocks.push(`<p class="${cls}">${renderInline(h[2])}</p>`);
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    flush();
    blocks.push(`<p class="leading-relaxed my-0.5">${renderInline(line)}</p>`);
  }
  flush();

  return (
    <div
      className="text-sm [&_ol]:list-decimal [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: blocks.join("") }}
    />
  );
};
