import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Target,
  Heart,
  Scale,
  Footprints,
  Salad,
  Dumbbell,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMemberActivity } from "@/lib/store";

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
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);

  useEffect(() => {
    if (!open || !member) return;
    setLoading(true);
    setActivity([]);
    getMemberActivity(member.id).then((a) => {
      setActivity(a);
      setLoading(false);
    });
    // Fetch goals via progress-summary (staff mode) so we get the goals block
    setGoalsLoading(true);
    setGoals(null);
    (async () => {
      try {
        const start = new Date(Date.now() - 90 * 86400000).toISOString();
        const end = new Date().toISOString();
        const { data, error } = await supabase.functions.invoke(
          "progress-summary",
          {
            body: {
              staffSecret,
              memberUserId: member.id,
              memberEmail: member.email,
              start,
              end,
              memberType: "member",
            },
          },
        );
        if (error) throw error;
        if (data?.goals) setGoals(data.goals);
      } catch (e) {
        // Goals might not be set yet — that's fine
        console.error("Goals fetch failed", e);
      } finally {
        setGoalsLoading(false);
      }
    })();
  }, [open, member, staffSecret]);

  if (!member) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            {member.full_name || member.email}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {member.email}
            {member.membership && (
              <span className="ml-1">· {member.membership}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Goals block */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Their goals
          </p>
          {goalsLoading ? (
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
