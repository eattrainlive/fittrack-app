// Staff Hub — "Today" action feed. The front door of the staff hub: pulls the
// live items each tool has surfaced (trial nurture due, retention touches due,
// people waiting for a reply, wins to celebrate) into one prioritised list so
// whoever's on shift opens one screen and works top-down. Read-only aggregator —
// each card jumps to the tool that actions it (onGoto → Admin tab).
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  TrendingDown,
  Dumbbell,
  Smartphone,
  PartyPopper,
  Clock,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffName } from "@/components/staffHubShared";
import { getNurtureBoard } from "@/lib/trialNurture";
import { getRetentionBoard, TOUCHES, type TouchKey } from "@/lib/retentionNurture";
import { openFaultCount } from "@/lib/equipmentFaults";

type Tone = "urgent" | "warn" | "good" | "info";

interface FeedItem {
  key: string;
  icon: any;
  title: string;
  count: number;
  names: string[]; // a few example names for context
  cta: string; // button label
  tab: string; // Admin tab to jump to
  tone: Tone;
  priority: number; // lower = higher up
}

const toneStyles: Record<Tone, { card: string; chip: string; icon: string }> = {
  urgent: {
    card: "border-red-400/60 bg-red-500/5",
    chip: "bg-red-500/10 text-red-700 dark:text-red-400",
    icon: "text-red-600 dark:text-red-400",
  },
  warn: {
    card: "border-amber-400/60 bg-amber-500/5",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: "text-amber-600 dark:text-amber-400",
  },
  good: {
    card: "border-emerald-400/60 bg-emerald-500/5",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  info: {
    card: "border-border bg-card",
    chip: "bg-muted text-muted-foreground",
    icon: "text-muted-foreground",
  },
};

const retentionIcon: Record<TouchKey, any> = {
  missed_you: AlertTriangle,
  slipping: TrendingDown,
  pt_low: Dumbbell,
  app_try: Smartphone,
  app_comeback: Smartphone,
  celebrate: PartyPopper,
};
const retentionTone: Record<TouchKey, Tone> = {
  missed_you: "urgent",
  slipping: "warn",
  pt_low: "warn",
  app_try: "info",
  app_comeback: "warn",
  celebrate: "good",
};
const retentionPriority: Record<TouchKey, number> = {
  missed_you: 20,
  slipping: 30,
  pt_low: 35,
  app_comeback: 40,
  app_try: 45,
  celebrate: 90,
};

const firstNames = (arr: { name?: string | null; full_name?: string | null }[], n = 3) =>
  arr
    .map((x) => String(x.name || x.full_name || "").split(" ")[0])
    .filter(Boolean)
    .slice(0, n);

export function StaffTodayFeed({
  staffSecret,
  onGoto,
}: {
  staffSecret: string;
  onGoto: (tab: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [trial, retention, faultCount] = await Promise.all([
        getNurtureBoard().catch(() => null),
        getRetentionBoard(staffSecret).catch(() => ({ members: [] as any[] })),
        openFaultCount().catch(() => 0),
      ]);

      const feed: FeedItem[] = [];
      let waiting = 0;

      // ── Equipment faults ────────────────────────────────────────────────
      if (faultCount > 0) {
        feed.push({
          key: "faults",
          icon: Wrench,
          title: "Equipment faults open",
          count: faultCount,
          names: [],
          cta: "Open fault board",
          tab: "faults",
          tone: "warn",
          priority: 15,
        });
      }

      // ── Trials ──────────────────────────────────────────────────────────
      if (trial) {
        if (trial.dueNow.length) {
          feed.push({
            key: "trial_due",
            icon: Clock,
            title: "Trialists due a message",
            count: trial.dueNow.length,
            names: firstNames(trial.dueNow),
            cta: "Open trial nurture",
            tab: "calllists",
            tone: "urgent",
            priority: 10,
          });
        }
        waiting += trial.waiting.length;
      }

      // ── Retention (group members by the touch they're due) ──────────────
      const members = (retention?.members ?? []) as any[];
      const byTouch: Record<string, any[]> = {};
      for (const m of members) {
        if (m.awaitingReply) waiting += 1;
        if (m.dueTouch) (byTouch[m.dueTouch] ??= []).push(m);
      }
      for (const k of Object.keys(byTouch) as TouchKey[]) {
        const grp = byTouch[k];
        if (!grp.length) continue;
        feed.push({
          key: `ret_${k}`,
          icon: retentionIcon[k],
          title: TOUCHES[k].label + " · members",
          count: grp.length,
          names: firstNames(grp),
          cta: "Open retention board",
          tab: "members",
          tone: retentionTone[k],
          priority: retentionPriority[k],
        });
      }

      feed.sort((a, b) => a.priority - b.priority || b.count - a.count);
      setItems(feed);
      setWaitingCount(waiting);
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);
  const who = staffName();
  const totalActions = items.reduce((n, i) => n + i.count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">
          {greeting}
          {who ? `, ${who}` : ""} 👋
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Pulling together today's jobs…
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
              {totalActions} {totalActions === 1 ? "thing" : "things"} need you
            </span>
            {waitingCount > 0 && (
              <button
                onClick={() => onGoto("members")}
                className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground inline-flex items-center gap-1"
              >
                <MessageSquare className="h-3.5 w-3.5" /> {waitingCount} waiting for a reply
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/5 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <p className="font-semibold">You're all caught up</p>
              <p className="text-sm text-muted-foreground">
                No trial or retention actions outstanding. Nice work.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => {
                const s = toneStyles[it.tone];
                const Icon = it.icon;
                return (
                  <button
                    key={it.key}
                    onClick={() => onGoto(it.tab)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition hover:brightness-[0.98] ${s.card}`}
                  >
                    <span className={`shrink-0 ${s.icon}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{it.title}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${s.chip}`}>
                          {it.count}
                        </span>
                      </div>
                      {it.names.length > 0 && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {it.names.join(", ")}
                          {it.count > it.names.length ? ` +${it.count - it.names.length} more` : ""}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground inline-flex items-center gap-1">
                      {it.cta} <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StaffTodayFeed;
