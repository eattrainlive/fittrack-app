// Retention cockpit — the active-member equivalent of the trial nurture cockpit.
// Surfaces members due a touch (missed-you / slipping / celebrate / PT-low),
// grouped by type, with the suggested WhatsApp pre-filled + Send, a cooldown so
// nobody's over-messaged, and a Waiting-for-reply hold after sending.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EmptyState, staffName } from "@/components/staffHubShared";
import {
  getRetentionBoard,
  sendTouch,
  renderTouch,
  TOUCHES,
  type RetentionMember,
  type TouchKey,
} from "@/lib/retentionNurture";

const GROUPS: { key: TouchKey; title: string }[] = [
  { key: "missed_you", title: "Missed you (at-risk)" },
  { key: "slipping", title: "Slipping" },
  { key: "pt_low", title: "PT credits low" },
  { key: "celebrate", title: "Celebrate regulars" },
];

export function RetentionCockpit({ staffSecret }: { staffSecret: string }) {
  const [members, setMembers] = useState<RetentionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TouchKey | "waiting">("missed_you");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { members } = await getRetentionBoard(staffSecret);
      setMembers(members);
    } catch (e: any) {
      console.error("retention board failed", e);
      toast.error("Couldn't load the retention board");
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);

  useEffect(() => {
    load();
  }, [load]);

  const due = (k: TouchKey) => members.filter((m) => m.dueTouch === k);
  const waiting = members.filter((m) => m.awaitingReply);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading retention board…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setTab(g.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === g.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {TOUCHES[g.key].label} {due(g.key).length}
          </button>
        ))}
        <button
          onClick={() => setTab("waiting")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            tab === "waiting"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Waiting for reply {waiting.length}
        </button>
      </div>

      {tab === "waiting" ? (
        waiting.length === 0 ? (
          <EmptyState text="Nobody's mid-conversation right now." />
        ) : (
          <div className="space-y-2">
            {waiting.map((m) => (
              <div
                key={m.email}
                className="flex items-center gap-3 rounded-lg border border-amber-400 bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Messaged · waiting for reply
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  Waiting
                </span>
              </div>
            ))}
          </div>
        )
      ) : due(tab).length === 0 ? (
        <EmptyState text={`Nobody due a "${TOUCHES[tab].label}" touch right now ✅`} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{TOUCHES[tab].blurb}</p>
          {due(tab).map((m) => (
            <TouchCard key={m.email} m={m} onSent={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function TouchCard({ m, onSent }: { m: RetentionMember; onSent: () => void }) {
  const touch = TOUCHES[m.dueTouch as TouchKey];
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const preview = renderTouch(touch, m, note);

  const send = async () => {
    setSending(true);
    const r = await sendTouch(m, touch.key, note, staffName() || "Staff");
    setSending(false);
    if (r.ok) {
      toast.success("Sent ✓");
      onSent();
    } else {
      toast.error(r.error || "Couldn't send — try again");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{m.name}</span>
            {m.membership && (
              <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
                {m.membership}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {m.attendance.visits} visits · {m.attendance.perWeek}/wk
            {m.attendance.lastVisitDays != null && ` · last ${m.attendance.lastVisitDays}d ago`}
            {touch.key === "pt_low" && m.pt_credits
              ? ` · ${m.pt_credits.remaining} PT left (resets ${m.pt_credits.resetDays}d)`
              : ""}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
          {touch.note === "coach" && (
            <div>
              <label className="text-[11px] text-muted-foreground">
                Personal note (optional)
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="A personal line to add…"
                className="mt-1"
              />
            </div>
          )}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
            {preview}
          </div>
          <Button className="w-full gap-2" disabled={sending} onClick={send}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}

export default RetentionCockpit;
