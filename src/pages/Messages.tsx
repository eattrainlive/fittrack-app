import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  MessageCircle,
  Search,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { getChatThreads, type ChatThread } from "@/lib/chatInbox";
import { MemberMessagesSection } from "@/components/MemberMessagesSection";

const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

const fmtWhen = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

type Filter = "all" | "needs";

export default function Messages() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ChatThread | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const t = await getChatThreads();
    setThreads(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isStaff()) {
      navigate("/");
      return;
    }
    load();
  }, [load, navigate]);

  const needsCount = useMemo(
    () => (threads ?? []).filter((t) => t.needsReply).length,
    [threads],
  );

  const visible = useMemo(() => {
    let list = threads ?? [];
    if (filter === "needs") list = list.filter((t) => t.needsReply);
    const term = q.trim().toLowerCase();
    if (term)
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(term) ||
          t.email.toLowerCase().includes(term),
      );
    return list;
  }, [threads, filter, q]);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-heading text-xl tracking-wide">
          <MessageCircle className="h-5 w-5 text-primary" /> Messages
        </h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,360px)_1fr]">
        {/* ── Thread list (hidden on mobile when a chat is open) ── */}
        <div className={active ? "hidden md:block" : "block"}>
          {/* filter + search */}
          <div className="mb-2 space-y-2">
            <div className="flex gap-1.5">
              <FilterPill
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label={`All ${threads?.length ?? 0}`}
              />
              <FilterPill
                active={filter === "needs"}
                onClick={() => setFilter("needs")}
                label={`Needs reply ${needsCount}`}
                accent
              />
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or email…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading chats…
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
              {filter === "needs" ? "Nothing awaiting a reply ✅" : "No chats yet"}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visible.map((t) => (
                <ThreadRow
                  key={t.email}
                  t={t}
                  active={active?.email === t.email}
                  onClick={() => setActive(t)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Conversation pane ── */}
        <div className={active ? "block" : "hidden md:block"}>
          {active ? (
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <button
                  onClick={() => setActive(null)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted md:hidden"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {active.email}
                  </p>
                </div>
              </div>
              <MemberMessagesSection email={active.email} name={active.name} />
            </div>
          ) : (
            <div className="hidden h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground md:flex">
              Pick a conversation to read & reply
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? accent
            ? "bg-amber-500 text-white"
            : "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
    >
      {label}
    </button>
  );
}

function ThreadRow({
  t,
  active,
  onClick,
}: {
  t: ChatThread;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ${
        active
          ? "border-primary bg-primary/5"
          : t.needsReply
            ? "border-amber-300/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
            : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{t.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {fmtWhen(t.lastAt)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {t.lastDirection === "out" ? "You: " : ""}
          {t.lastBody || "—"}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {t.needsReply && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              Needs reply
            </span>
          )}
          {t.needsReply && t.windowOpen && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Window open
            </span>
          )}
          {t.needsReply && !t.windowOpen && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Template only
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
