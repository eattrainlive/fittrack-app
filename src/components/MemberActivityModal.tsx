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
  CalendarDays,
  DoorOpen,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { ActivityWinsGrid } from "@/components/ActivityWinsGrid";
import { CoachPastWorkouts } from "@/components/CoachPastWorkouts";
import { supabase } from "@/lib/supabase";
import { getExercises } from "@/lib/store";
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

interface MemberActivity {
  pt: {
    used: number;
    allowance: number | null;
    cycleStart: string | null;
    resetDate: string | null;
  };
  monthToDate: { classes: number; gymVisits: number; sessionsLogged: number };
  rolling30: { classes: number; gymVisits: number; sessionsLogged: number };
  months: {
    label: string;
    ym: string;
    pt: number | null;
    classes: number;
    gymVisits: number;
    sessionsLogged: number;
  }[];
  trend: "down" | "up" | "stable";
  member: { membership: string | null; membership_status: string | null };
}

const goalLabel = (g?: string | null) => {
  if (!g) return null;
  if (g === "fat_loss") return "Fat loss";
  if (g === "strength") return "Strength";
  if (g === "fitness") return "Fitness";
  if (g === "health") return "Health";
  return g;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

const currentMonthYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function MtdTile({
  icon,
  label,
  value,
  rolling,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  rolling: number;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </p>
        <p className="font-heading text-lg">{value}</p>
        <p className="text-[10px] text-muted-foreground">
          {rolling} last 30 days
        </p>
      </CardContent>
    </Card>
  );
}

export function MemberActivityModal({
  member,
  staffSecret,
  open,
  onOpenChange,
}: MemberActivityModalProps) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [act, setAct] = useState<MemberActivity | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [exercises] = useState<any[]>(getExercises());

  useEffect(() => {
    if (!open || !member) return;

    // Full progress summary in staff mode (goals, nutrition, PRs, streak).
    setSummaryLoading(true);
    setSummary(null);
    (async () => {
      try {
        if (!staffSecret) throw new Error("Missing staff secret");
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

    // Member-activity edge function (PT allowance, MTD, 3-month trend).
    setActLoading(true);
    setAct(null);
    (async () => {
      try {
        if (!staffSecret) throw new Error("Missing staff secret");
        const { data, error } = await supabase.functions.invoke(
          "member-activity",
          {
            body: {
              staffSecret,
              memberUserId: member.id,
              memberEmail: member.email,
            },
          },
        );
        if (error) throw error;
        if (data && !data.error) setAct(data as MemberActivity);
      } catch (e) {
        console.error("Member-activity fetch failed", e);
      } finally {
        setActLoading(false);
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
  const curYm = currentMonthYm();

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

        {actLoading && !act ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : act ? (
          <div className="space-y-4">
            {/* PT allowance bar — only for PT members */}
            {act.pt.allowance != null && (
              <Card className="bg-muted/20 border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5" /> PT sessions this
                      cycle
                    </p>
                    {act.pt.resetDate && (
                      <span className="text-[11px] text-muted-foreground">
                        resets {fmtDate(act.pt.resetDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="font-heading text-2xl">
                      {act.pt.used}
                      <span className="text-muted-foreground text-base">
                        {" "}
                        of {act.pt.allowance}
                      </span>
                    </p>
                    <span className="text-xs text-muted-foreground">used</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((act.pt.used / act.pt.allowance) * 100))}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Month-to-date tiles */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MtdTile
                  icon={<Calendar className="w-3 h-3 text-primary" />}
                  label="Classes"
                  value={act.monthToDate.classes}
                  rolling={act.rolling30.classes}
                />
                <MtdTile
                  icon={<DoorOpen className="w-3 h-3 text-primary" />}
                  label="Gym visits"
                  value={act.monthToDate.gymVisits}
                  rolling={act.rolling30.gymVisits}
                />
                <MtdTile
                  icon={<TrendingUp className="w-3 h-3 text-primary" />}
                  label="Sessions logged"
                  value={act.monthToDate.sessionsLogged}
                  rolling={act.rolling30.sessionsLogged}
                />
              </div>
            </div>

            {/* 3-month breakdown */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                3-month breakdown
              </p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground">
                      <th className="text-left font-medium px-3 py-2"></th>
                      {act.months.map((m) => (
                        <th
                          key={m.ym}
                          className={`text-right font-medium px-3 py-2 ${m.ym === curYm ? "text-foreground font-bold" : ""}`}
                        >
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {act.pt.allowance != null && (
                      <tr className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" /> PT
                        </td>
                        {act.months.map((m) => (
                          <td
                            key={m.ym}
                            className="text-right px-3 py-2 tabular-nums"
                          >
                            {m.pt ?? 0}
                          </td>
                        ))}
                      </tr>
                    )}
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Classes
                      </td>
                      {act.months.map((m) => (
                        <td
                          key={m.ym}
                          className="text-right px-3 py-2 tabular-nums"
                        >
                          {m.classes}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                        <DoorOpen className="w-3 h-3" /> Gym visits
                      </td>
                      {act.months.map((m) => (
                        <td
                          key={m.ym}
                          className="text-right px-3 py-2 tabular-nums"
                        >
                          {m.gymVisits}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Sessions logged
                      </td>
                      {act.months.map((m) => (
                        <td
                          key={m.ym}
                          className="text-right px-3 py-2 tabular-nums"
                        >
                          {m.sessionsLogged}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs ${act.trend === "down" ? "text-amber-600 dark:text-amber-500" : act.trend === "up" ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground"}`}
              >
                {act.trend === "down" ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" /> Trending down —
                    worth a check-in
                  </>
                ) : act.trend === "up" ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" /> Trending up —
                    building momentum
                  </>
                ) : (
                  <>
                    <Minus className="w-3.5 h-3.5" /> Stable this quarter
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Full breakdown (PRs, nutrition, streak from progress-summary) */}
        {summaryLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading summary…
          </div>
        ) : s ? (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rolling 90 days
            </p>
            <ActivityWinsGrid s={s} />
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

        {/* Past workouts — editable via workout-admin */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Past workouts
          </p>
          <CoachPastWorkouts
            staffSecret={staffSecret}
            memberUserId={member.id}
            exercises={exercises}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
