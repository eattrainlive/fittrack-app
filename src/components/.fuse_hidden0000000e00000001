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
  Bell,
  CalendarClock,
  Package,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffName } from "@/components/staffHubShared";
import { getNurtureBoard } from "@/lib/trialNurture";
import { getRetentionBoard, TOUCHES, type TouchKey } from "@/lib/retentionNurture";
import { openFaultCount } from "@/lib/equipmentFaults";
import {
  dueReminderCount,
  duePostCount,
  listReminders,
  listPosts,
  listEvents,
  buildCalendar,
  completeReminder,
  DESTINATION_LABEL,
  EVENT_KIND_LABEL,
  type Reminder,
  type ContentPost,
  type StaffEvent,
} from "@/lib/staffPlanner";
import { lowStockCount, pendingChecklistCount } from "@/lib/staffBoards";
import { AnnouncementsBoard } from "@/components/AnnouncementsBoard";
import { StaffPulse } from "@/components/StaffPulse";

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
      const [trial, retention, faultCount, remCount, postCount, lowStock, pendingChecks] =
        await Promise.all([
          getNurtureBoard().catch(() => null),
          getRetentionBoard(staffSecret).catch(() => ({ members: [] as any[] })),
          openFaultCount().catch(() => 0),
          dueReminderCount().catch(() => 0),
          duePostCount().catch(() => 0),
          lowStockCount().catch(() => 0),
          pendingChecklistCount().catch(() => 0),
        ]);

      const feed: FeedItem[] = [];
      let waiting = 0;

      // ── Reminders due today ─────────────────────────────────────────────
      if (remCount > 0) {
        feed.push({
          key: "reminders",
          icon: Bell,
          title: "Reminders due",
          count: remCount,
          names: [],
          cta: "Open planner",
          tab: "planner",
          tone: "warn",
          priority: 5,
        });
      }

      // ── Content due to post ─────────────────────────────────────────────
      if (postCount > 0) {
        feed.push({
          key: "content",
          icon: CalendarClock,
          title: "Posts to publish",
          count: postCount,
          names: [],
          cta: "Open planner",
          tab: "planner",
          tone: "warn",
          priority: 12,
        });
      }

      // ── Opening/closing checklist outstanding ───────────────────────────
      if (pendingChecks > 0) {
        feed.push({
          key: "checklists",
          icon: ListChecks,
          title: "Checklist items to do",
          count: pendingChecks,
          names: [],
          cta: "Open checklists",
          tab: "checklists",
          tone: "info",
          priority: 8,
        });
      }

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

      // ── Low / out of stock ──────────────────────────────────────────────
      if (lowStock > 0) {
        feed.push({
          key: "stock",
          icon: Package,
          title: "Supplies low or out",
          count: lowStock,
          names: [],
          cta: "Open stock",
          tab: "stock",
          tone: "warn",
          priority: 18,
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

      <AnnouncementsBoard />

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

          <MyJobs />
          <TeamAgenda />
          <StaffPulse staffSecret={staffSecret} />
        </>
      )}
    </div>
  );
}

// ── My jobs (reminders assigned to the signed-in coach) ──────────────────────
const toKeyUTC = (d: Date) => d.toISOString().slice(0, 10);
function MyJobs() {
  const me = staffName();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [range, setRange] = useState<"week" | "month">("week");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setReminders(await listReminders());
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  let start: Date;
  let end: Date;
  if (range === "week") {
    const dow = (now.getUTCDay() + 6) % 7; // Mon=0
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
    end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  }
  const startKey = toKeyUTC(start);
  const endKey = toKeyUTC(end);
  const todayKey = toKeyUTC(now);

  const mine = reminders.filter(
    (r) => (r.assigned_to || "").trim().toLowerCase() === me.toLowerCase() && me !== "Staff",
  );
  const byDay = buildCalendar(mine, [], startKey, endKey);
  const rows = Object.keys(byDay)
    .sort()
    .flatMap((d) => byDay[d].filter((it) => it.kind === "reminder").map((it) => ({ d, it })));

  const tick = async (r: Reminder) => {
    setBusy(true);
    await completeReminder(r, me);
    setBusy(false);
    load();
  };

  if (me === "Staff") return null; // can't identify the coach → skip

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">My jobs</h3>
        <div className="flex gap-1.5">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              This {r}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing assigned to you this {range}.</p>
      ) : (
        <div className="space-y-1">
          {rows.map(({ d, it }) => {
            const overdue = d < todayKey && it.live;
            return (
              <div key={it.key} className="flex items-center gap-2 text-sm">
                {it.live ? (
                  <button disabled={busy} onClick={() => it.reminder && tick(it.reminder)} title="Mark done">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-emerald-500" />
                  </button>
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className={`text-[11px] w-14 shrink-0 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span className="truncate">{it.title}</span>
                {it.recurring && <span className="text-[9px] text-muted-foreground shrink-0">↻</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Team agenda — the week / month ahead (everyone's jobs + content + events) ──
function TeamAgenda() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [range, setRange] = useState<"week" | "month">("week");

  useEffect(() => {
    let live = true;
    Promise.all([listReminders(), listPosts(), listEvents()])
      .then(([r, p, e]) => {
        if (!live) return;
        setReminders(r);
        setPosts(p);
        setEvents(e);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const now = new Date();
  let start: Date;
  let end: Date;
  if (range === "week") {
    const dow = (now.getUTCDay() + 6) % 7;
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
    end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  }
  const startKey = toKeyUTC(start);
  const endKey = toKeyUTC(end);
  const todayKey = toKeyUTC(now);

  const byDay = buildCalendar(reminders, posts, startKey, endKey, events);
  const days = Object.keys(byDay)
    .filter((d) => d >= startKey && d <= endKey)
    .sort();

  const tag = (it: any) =>
    it.kind === "event"
      ? EVENT_KIND_LABEL[it.event.kind]
      : it.kind === "post"
        ? DESTINATION_LABEL[it.post.destination]
        : it.recurring
          ? "Recurring"
          : "Job";
  const tagStyle = (it: any) =>
    it.kind === "event"
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
      : it.kind === "post"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
        : "bg-violet-500/10 text-violet-700 dark:text-violet-400";

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">The {range} ahead</h3>
        <div className="flex gap-1.5">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              This {r}
            </button>
          ))}
        </div>
      </div>
      {days.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing planned this {range} yet.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {days.map((d) => (
            <div key={d} className="flex gap-2">
              <div className={`w-16 shrink-0 text-[11px] font-medium ${d === todayKey ? "text-primary" : "text-muted-foreground"}`}>
                {new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                {byDay[d].map((it) => (
                  <div key={it.key} className="flex items-center gap-1.5 text-sm">
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium shrink-0 ${tagStyle(it)}`}>{tag(it)}</span>
                    <span className="truncate">{it.title}</span>
                    {it.kind === "reminder" && it.reminder?.assigned_to && (
                      <span className="text-[10px] text-muted-foreground shrink-0">· {it.reminder.assigned_to}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StaffTodayFeed;
