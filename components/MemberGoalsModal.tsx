import { useEffect, useState } from "react";
import {
  Target,
  Scale,
  Footprints,
  Dumbbell,
  Salad,
  Heart,
  CalendarDays,
  Loader2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import type { ProgressSummary } from "@/lib/trialSummary";

interface MemberGoalsModalProps {
  member: {
    id: string;
    email?: string;
    full_name?: string;
    joined_on?: string;
    created_at?: string;
  } | null;
  staffSecret: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIMARY_GOAL_LABELS: Record<string, string> = {
  fat_loss: "Fat loss 🔥",
  strength: "Strength 💪",
  fitness: "Fitness 🏃",
  health: "Health ❤️",
};

export function MemberGoalsModal({
  member,
  staffSecret,
  open,
  onOpenChange,
}: MemberGoalsModalProps) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !member) {
      setSummary(null);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!staffSecret)
          throw new Error("Missing staff secret — cannot load member data.");
        // Rolling 90-day window for a full member (or since joined_on).
        const joinDate = member.joined_on || member.created_at;
        const ref = joinDate ? new Date(joinDate) : new Date();
        const end = new Date();
        const start = new Date(
          Math.max(ref.getTime(), end.getTime() - 90 * 86400000),
        ).toISOString();
        const { data, error } = await supabase.functions.invoke(
          "progress-summary",
          {
            body: {
              staffSecret,
              memberUserId: member.id || null,
              memberEmail: member.email || null,
              start,
              end: end.toISOString(),
              memberType: "member",
            },
          },
        );
        if (error) throw new Error(error.message || "Failed to load summary.");
        if (!data || data.error) throw new Error(data?.error || "No data.");
        if (mounted) setSummary(data as ProgressSummary);
      } catch (e: any) {
        toast.error("Failed to load goals: " + (e?.message || "Unknown error"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, member, staffSecret]);

  if (!member) return null;
  const g = summary?.goals;

  const hasGoals =
    !!g &&
    (g.primaryGoal ||
      g.goalText ||
      g.sessionsPerWeek ||
      g.startWeight != null ||
      g.targetWeight != null ||
      g.targetDate ||
      g.stepTarget ||
      g.calorieTarget ||
      g.focus ||
      g.habit_1 ||
      g.habit_2 ||
      g.habit_3 ||
      (Array.isArray(g.focusAreas) && g.focusAreas.length));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {member.full_name || "Member"} · Goals
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {member.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading goals…
          </div>
        ) : !hasGoals ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-2">
              <Target className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold">No goals set yet</p>
              <p className="text-sm text-muted-foreground">
                Nudge {member.full_name?.split(" ")[0] || "them"} to set their
                goals from the app — their focus, targets and habits. It only
                takes two minutes and gives the next review real teeth.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Primary goal + typed goal */}
            {(g!.primaryGoal || g!.goalText) && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Their goal
                  </p>
                  {g!.primaryGoal && (
                    <Badge variant="secondary" className="font-semibold">
                      {PRIMARY_GOAL_LABELS[g!.primaryGoal] || g!.primaryGoal}
                    </Badge>
                  )}
                  {g!.goalText && (
                    <p className="text-sm italic text-muted-foreground">
                      "{g!.goalText}"
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Targets grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {g!.sessionsPerWeek != null && (
                <GoalTile
                  icon={Dumbbell}
                  label="Sessions / wk"
                  value={`${g!.sessionsPerWeek}/wk`}
                  sub={
                    summary
                      ? `Actual: ${summary.sessionsPerWeekActual}/wk`
                      : undefined
                  }
                />
              )}
              {g!.startWeight != null && (
                <GoalTile
                  icon={Scale}
                  label="Start weight"
                  value={`${g!.startWeight} kg`}
                  sub={
                    summary?.weightNow != null
                      ? `Now: ${summary.weightNow} kg`
                      : undefined
                  }
                />
              )}
              {g!.targetWeight != null && (
                <GoalTile
                  icon={TrendingUp}
                  label="Target weight"
                  value={`${g!.targetWeight} kg`}
                />
              )}
              {g!.targetDate && (
                <GoalTile
                  icon={CalendarDays}
                  label="Target date"
                  value={new Date(
                    g!.targetDate + "T00:00:00",
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              )}
              {g!.stepTarget != null && (
                <GoalTile
                  icon={Footprints}
                  label="Steps / day"
                  value={`${g!.stepTarget.toLocaleString()}`}
                />
              )}
              {g!.calorieTarget != null && (
                <GoalTile
                  icon={Salad}
                  label="Calorie target"
                  value={`${g!.calorieTarget.toLocaleString()} kcal`}
                  sub={
                    summary ? `${summary.daysLogged} days logged` : undefined
                  }
                />
              )}
            </div>

            {/* Focus areas */}
            {Array.isArray(g!.focusAreas) && g!.focusAreas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Focus areas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g!.focusAreas.map((a) => (
                    <Badge key={a} variant="outline" className="font-normal">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Habits */}
            {(g!.habit_1 || g!.habit_2 || g!.habit_3) && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Their habits
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[g!.habit_1, g!.habit_2, g!.habit_3]
                    .filter((h) => h != null)
                    .map((h) => (
                      <Badge
                        key={h}
                        variant="secondary"
                        className="font-normal"
                      >
                        {String(h)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Review due */}
            {g!.reviewDue && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
                Next review:{" "}
                {new Date(g!.reviewDue + "T00:00:00").toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoalTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="font-heading text-base leading-none">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
