import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Loader2,
  Flame,
  Dumbbell,
  Heart,
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

interface EngagementMember {
  id: string;
  email: string;
  full_name: string;
  membership: string | null;
  score: number;
  band: "thriving" | "slipping" | "atRisk";
  attendance: { attended: number; total: number };
  app: { workouts: number; lastLoginDays: number | null };
  habits: { checkins: number; bestStreak: number };
  sessionsTarget: number | null;
  lastSessionDays: number | null;
  goalText: string | null;
  flags: string[];
}

interface EngagementSummary {
  thriving: number;
  slipping: number;
  atRisk: number;
  total: number;
}

interface EngagementData {
  window: number;
  summary: EngagementSummary;
  members: EngagementMember[];
}

interface MemberEngagementBoardProps {
  staffSecret: string;
  onViewMember?: (member: EngagementMember) => void;
}

type BandFilter = "all" | "atRisk" | "slipping";

export function MemberEngagementBoard({
  staffSecret,
  onViewMember,
}: MemberEngagementBoardProps) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

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
      toast.error("Couldn't load engagement board");
    } finally {
      setLoading(false);
    }
  }, [staffSecret, days]);

  useEffect(() => {
    load();
  }, [load]);

  const bandColor = (band: string) => {
    if (band === "thriving")
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    if (band === "slipping")
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
  };

  const bandLabel = (band: string) =>
    band === "thriving"
      ? "Thriving"
      : band === "slipping"
        ? "Slipping"
        : "At-risk";

  const filtered = (data?.members || []).filter((m) => {
    if (bandFilter === "all") return true;
    return m.band === bandFilter;
  });

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading engagement board…
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
              Member activity
            </CardTitle>
            <CardDescription className="text-xs">
              Blended score: attendance 50% · app activity 30% · habits 20%
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
        <div className="flex gap-2 mt-1">
          <Button
            size="sm"
            variant={bandFilter === "all" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setBandFilter("all")}
          >
            All ({data.summary.total})
          </Button>
          <Button
            size="sm"
            variant={bandFilter === "atRisk" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setBandFilter("atRisk")}
          >
            <TrendingDown className="h-3 w-3 mr-1" />
            At-risk ({data.summary.atRisk})
          </Button>
          <Button
            size="sm"
            variant={bandFilter === "slipping" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setBandFilter("slipping")}
          >
            Slipping ({data.summary.slipping})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Count tiles */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-center">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.summary.thriving}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              <TrendingUp className="h-3 w-3 inline mr-0.5" />
              Thriving
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-center">
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {data.summary.slipping}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Slipping
            </div>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {data.summary.atRisk}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              <AlertTriangle className="h-3 w-3 inline mr-0.5" />
              At-risk
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">
            No members in this band for the last {days} days.
          </p>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-border bg-muted/20"
            >
              <button
                className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/40 transition-colors"
                onClick={() =>
                  setExpanded((prev) => (prev === m.id ? null : m.id))
                }
              >
                <span
                  className={`shrink-0 w-10 text-center text-sm font-bold rounded-md border px-1 py-0.5 ${bandColor(m.band)}`}
                >
                  {m.score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">
                      {m.full_name || m.email}
                    </span>
                    {m.membership && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5 shrink-0"
                      >
                        {m.membership}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {m.flags.slice(0, 3).map((f, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {expanded === m.id ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              {expanded === m.id && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-background border border-border/50 p-2">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1">
                        <Dumbbell className="h-2.5 w-2.5" /> Sessions
                      </p>
                      <p className="font-semibold">
                        {m.attendance.attended}/{m.attendance.total} booked
                      </p>
                      <p className="text-muted-foreground">
                        {m.app.workouts} logged in app
                      </p>
                    </div>
                    <div className="rounded-md bg-background border border-border/50 p-2">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide flex items-center gap-1">
                        <Heart className="h-2.5 w-2.5" /> Habits
                      </p>
                      <p className="font-semibold">
                        {m.habits.checkins} check-ins
                      </p>
                      <p className="text-muted-foreground flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5" />
                        {m.habits.bestStreak}d best
                      </p>
                    </div>
                    <div className="rounded-md bg-background border border-border/50 p-2">
                      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        Last session
                      </p>
                      <p className="font-semibold">
                        {m.lastSessionDays != null
                          ? `${m.lastSessionDays}d ago`
                          : "—"}
                      </p>
                      {m.sessionsTarget && (
                        <p className="text-muted-foreground">
                          Target: {m.sessionsTarget}/wk
                        </p>
                      )}
                    </div>
                  </div>
                  {m.goalText && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 rounded p-2">
                      Goal: "{m.goalText}"
                    </p>
                  )}
                  {onViewMember && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onViewMember(m)}
                    >
                      View member profile
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
