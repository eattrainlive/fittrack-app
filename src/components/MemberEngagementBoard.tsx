import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  Dumbbell,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Band = "thriving" | "steady" | "slipping" | "at-risk";
type AppStatus = "on_app" | "invited_not_joined" | "not_invited";

interface EngagementMember {
  member_ref: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  membership: string | null;
  membership_status: string | null;
  score: number;
  band: Band;
  attendance: { visits: number; perWeek: number; lastVisitDays: number | null };
  app_status: AppStatus;
  app: { on_app: boolean; workouts: number; lastLoginDays: number | null };
  flags: string[];
}

interface EngagementData {
  window: { days: number; start: string };
  summary: {
    total: number;
    thriving: number;
    steady: number;
    slipping: number;
    atRisk: number;
    notOnApp: number;
  };
  members: EngagementMember[];
}

type Filter = "all" | "at-risk" | "slipping" | "notOnApp";

export function MemberEngagementBoard({
  staffSecret,
  onViewMember,
}: {
  staffSecret: string;
  onViewMember?: (m: EngagementMember) => void;
}) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "member-engagement",
        { body: { staffSecret, days } },
      );
      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      console.error("member-engagement failed", e);
      toast.error("Couldn't load the member board");
    } finally {
      setLoading(false);
    }
  }, [staffSecret, days]);

  useEffect(() => {
    load();
  }, [load]);

  const sendInvite = async (m: EngagementMember) => {
    setInviting(m.email);
    try {
      const { data: r, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: {
            action: "invite",
            name: m.full_name || m.email,
            email: m.email,
            staffSecret,
          },
        },
      );
      if (error || r?.error) throw new Error(error?.message || r?.error);
      toast.success("App invite sent");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send invite");
    } finally {
      setInviting(null);
    }
  };

  const bandColor = (b: Band) =>
    b === "thriving"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : b === "steady"
        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
        : b === "slipping"
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";

  const appBadge = (s: AppStatus) =>
    s === "on_app"
      ? { label: "On app", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
      : s === "invited_not_joined"
        ? { label: "Invited", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
        : { label: "Not on app", cls: "bg-muted text-muted-foreground" };

  const filtered = (data?.members || []).filter((m) => {
    if (filter === "all") return true;
    if (filter === "notOnApp") return m.app_status !== "on_app";
    return m.band === filter;
  });

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the member board…
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Member retention
            </CardTitle>
            <CardDescription className="text-xs">
              Scored on attendance (gym visits + booked sessions). App use shown
              separately — even members not on the app are tracked.
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "outline"}
                className="h-7 text-xs px-2"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("all")}>
            All ({data.summary.total})
          </Button>
          <Button size="sm" variant={filter === "at-risk" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("at-risk")}>
            <TrendingDown className="h-3 w-3 mr-1" /> At-risk ({data.summary.atRisk})
          </Button>
          <Button size="sm" variant={filter === "slipping" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("slipping")}>
            Slipping ({data.summary.slipping})
          </Button>
          <Button size="sm" variant={filter === "notOnApp" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setFilter("notOnApp")}>
            <Smartphone className="h-3 w-3 mr-1" /> Not on app ({data.summary.notOnApp})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Count tiles */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {(
            [
              ["Thriving", data.summary.thriving, "border-emerald-500/30 bg-emerald-500/5", "text-emerald-600 dark:text-emerald-400"],
              ["Steady", data.summary.steady, "border-sky-500/30 bg-sky-500/5", "text-sky-600 dark:text-sky-400"],
              ["Slipping", data.summary.slipping, "border-amber-500/30 bg-amber-500/5", "text-amber-600 dark:text-amber-400"],
              ["At-risk", data.summary.atRisk, "border-red-500/30 bg-red-500/5", "text-red-600 dark:text-red-400"],
            ] as [string, number, string, string][]
          ).map(([label, n, box, txt]) => (
            <div key={label} className={`rounded-lg border p-2 text-center ${box}`}>
              <div className={`text-xl font-bold ${txt}`}>{n}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {label}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">
            No members here for the last {days} days.
          </p>
        ) : (
          filtered.map((m) => {
            const ab = appBadge(m.app_status);
            return (
              <div key={m.email} className="rounded-lg border border-border bg-muted/20">
                <button
                  className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => setExpanded((p) => (p === m.email ? null : m.email))}
                >
                  <span className={`shrink-0 w-10 text-center text-sm font-bold rounded-md border px-1 py-0.5 ${bandColor(m.band)}`}>
                    {m.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {m.full_name || m.email}
                      </span>
                      {m.membership && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 shrink-0">
                          {m.membership}
                        </Badge>
                      )}
                      <span className={`text-[10px] py-0.5 px-1.5 rounded-full shrink-0 font-medium ${ab.cls}`}>
                        {ab.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {m.attendance.visits} visit{m.attendance.visits === 1 ? "" : "s"} · {m.attendance.perWeek}/wk
                      {m.attendance.lastVisitDays != null && ` · last ${m.attendance.lastVisitDays}d ago`}
                    </div>
                  </div>
                  {expanded === m.email ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {expanded === m.email && (
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-background border border-border/50 p-2">
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1">
                          <Dumbbell className="h-2.5 w-2.5" /> Attendance
                        </p>
                        <p className="font-semibold">
                          {m.attendance.visits} visits · {m.attendance.perWeek}/wk
                        </p>
                        <p className="text-muted-foreground">
                          {m.attendance.lastVisitDays != null
                            ? `Last visit ${m.attendance.lastVisitDays}d ago`
                            : "No visits in window"}
                        </p>
                      </div>
                      <div className="rounded-md bg-background border border-border/50 p-2">
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1">
                          <Smartphone className="h-2.5 w-2.5" /> App
                        </p>
                        <p className="font-semibold">{ab.label}</p>
                        <p className="text-muted-foreground">
                          {m.app.on_app
                            ? `${m.app.workouts} logged · ${
                                m.app.lastLoginDays != null
                                  ? `in ${m.app.lastLoginDays}d`
                                  : "no login"
                              }`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {m.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.flags.map((f, i) => (
                          <span key={i} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.app_status !== "on_app" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        disabled={inviting === m.email}
                        onClick={() => sendInvite(m)}
                      >
                        {inviting === m.email ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        {m.app_status === "invited_not_joined"
                          ? "Re-send app invite"
                          : "Invite to the app"}
                      </Button>
                    )}
                    {onViewMember && (
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => onViewMember(m)}>
                        View member
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
