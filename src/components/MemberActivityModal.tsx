import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Target,
  Heart,
  Scale,
  Footprints,
  Salad,
  Dumbbell,
  Calendar,
  TrendingUp,
  Flame,
  DoorOpen,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMemberActivity } from "@/lib/store";
import type { ProgressSummary } from "@/lib/trialSummary";

interface MemberActivityModalProps {
  member: any | null;
  staffSecret: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberGoals {
  primary_goal?: string | null;
  goal_text?: string | null;
  sessions_per_week?: number | null;
  start_weight?: number | null;
  target_weight?: number | null;
  target_date?: string | null;
  focus_areas?: string[] | null;
  step_target?: number | null;
  calorie_target?: number | null;
  habit_1?: string | null;
  habit_2?: string | null;
  habit_3?: string | null;
  focus?: string | null;
  reviewDue?: string | null;
}

const goalLabel = (g?: string | null) => {
  if (!g) return null;
  if (g === "fat_loss") return "Fat loss";
  if (g === "strength") return "Strength";
  if (g === "fitness") return "Fitness";
  if (g === "health") return "Health";
  return g;
};

export function MemberActivityModal({
  member,
  staffSecret,
  open,
  onOpenChange,
}: MemberActivityModalProps) {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!open || !member) return;
    setLoading(true);
    setActivity([]);
    getMemberActivity(member.id).then((a) => {
      setActivity(a);
      setLoading(false);
    });

    // Fetch the full progress summary in staff mode so we get goals + the
    // full activity breakdown (PT, classes, gym visits, volume, streak…).
    setSummaryLoading(true);
    setSummary(null);
    (async () => {
      try {
        if (!staffSecret) throw new Error("Missing staff secret");
        // Members use a rolling 90-day window; leave start/end blank so the
        // function derives it from member_goals.set_at (or today-90).
        const { data, error } = await supabase.functions.invoke(
          "progress-summary",
          {
            body: {
              staffSecret,
              memberUserId: member.id,
              memberEmail: member.email,
              memberType: "member",
            },
          },
        );
        if (error) throw error;
        if (data && !data.error) setSummary(data as ProgressSummary);
      } catch (e) {
        console.error("Activity summary fetch failed", e);
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, [open, member, staffSecret]);

  if (!member) return null;

  const goals: MemberGoals | null = summary?.goals
    ? (summary.goals as any)
    : null;

  const hasGoals =
    goals &&
    (goals.primary_goal ||
      goals.goal_text ||
      goals.sessions_per_week ||
      goals.start_weight != null ||
      goals.target_weight != null ||
      goals.target_date ||
      goals.focus ||
      goals.habit_1 ||
      goals.habit_2 ||
      goals.habit_3 ||
      (Array.isArray(goals.focus_areas) && goals.focus_areas.length));

  const s = summary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {member.full_name || member.email}
            <span className="text-xs font-normal text-muted-foreground">
              · Activity
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {member.email}
            {member.membership && (
              <span className="ml-1">· {member.membership}</span>
            )}
            {goals?.reviewDue && (
              <span className="ml-1">
                · Review due{" "}
                {new Date(goals.reviewDue + "T00:00:00").toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short" },
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Activity breakdown tiles */}
        {summaryLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : s ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-primary" /> Coached PT
                </p>
                <p className="font-heading text-lg">
                  {s.coachedUsed} / {s.coachedTotal}
                </p>
                {s.coachedUpcoming > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{s.coachedUpcoming} booked
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" /> Classes
                </p>
                <p className="font-heading text-lg">+{s.classesCount}</p>
                <p className="text-[10px] text-muted-foreground">unlimited</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <DoorOpen className="w-3 h-3 text-primary" /> Gym Visits
                </p>
                <p className="font-heading text-lg">{s.gymVisits}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.gymScansTotal}{" "}
                  {s.gymScansTotal === 1 ? "entry" : "entries"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-primary" /> Lifted
                </p>
                <p className="font-heading text-lg">
                  {s.totalVolumeKg.toLocaleString()} kg
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.loggedSessions} sessions logged
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 text-primary" /> Streak
                </p>
                <p className="font-heading text-lg">{s.bestStreak} days</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.totalCheckins} checkins
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Salad className="w-3 h-3 text-primary" /> Nutrition
                </p>
                <p className="font-heading text-lg">{s.daysLogged}</p>
                <p className="text-[10px] text-muted-foreground">days logged</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Strength wins */}
        {!summaryLoading && s && s.prs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Strength Wins
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {s.prs.map((pr) => (
                <div
                  key={pr.exercise}
                  className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold capitalize truncate">
                      {pr.exercise.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {pr.start} → {pr.now} kg
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs font-bold text-primary"
                  >
                    +{pr.gain} kg
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals block */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Their goals
          </p>
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading goals…
            </div>
          ) : hasGoals ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-sm">
              {goals!.primary_goal && (
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium">
                    {goalLabel(goals!.primary_goal)}
                  </span>
                </div>
              )}
              {goals!.goal_text && (
                <p className="text-muted-foreground italic">
                  "{goals!.goal_text}"
                </p>
              )}
              {goals!.focus && !goals!.goal_text && (
                <p className="text-muted-foreground italic">"{goals!.focus}"</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {goals!.sessions_per_week != null && (
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    {goals!.sessions_per_week}/wk
                    {s && (
                      <span className="text-muted-foreground">
                        (actual {s.sessionsPerWeekActual})
                      </span>
                    )}
                  </span>
                )}
                {goals!.start_weight != null && (
                  <span className="flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    {goals!.start_weight}kg → {goals!.target_weight ?? "—"}kg
                  </span>
                )}
                {goals!.step_target != null && (
                  <span className="flex items-center gap-1">
                    <Footprints className="h-3 w-3" />
                    {goals!.step_target}/day
                  </span>
                )}
                {goals!.calorie_target != null && (
                  <span className="flex items-center gap-1">
                    <Salad className="h-3 w-3" />
                    {goals!.calorie_target} kcal
                  </span>
                )}
                {goals!.target_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(
                      goals!.target_date + "T00:00:00",
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
              {Array.isArray(goals!.focus_areas) &&
                goals!.focus_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {goals!.focus_areas.map((a) => (
                      <Badge
                        key={a}
                        variant="secondary"
                        className="text-[10px] py-0 px-1.5"
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              {(goals!.habit_1 || goals!.habit_2 || goals!.habit_3) && (
                <div className="flex items-start gap-1 flex-wrap">
                  <Heart className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  {[goals!.habit_1, goals!.habit_2, goals!.habit_3]
                    .filter(Boolean)
                    .map((h, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        {i > 0 ? "· " : ""}
                        {h}
                      </span>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
              No goals set yet — nudge them to set their goals in the app.
            </p>
          )}
        </div>

        {/* Recent activity */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recent sessions
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions logged yet.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activity.slice(0, 10).map((w, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs rounded-md border border-border/50 bg-muted/20 px-2 py-1.5"
                >
                  <span className="truncate">
                    {w.name || w.program || "Workout"}
                  </span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {w.date
                      ? new Date(w.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                    {w.volume ? ` · ${w.volume}kg` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
