import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Flame, Sparkles, Pencil, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import { getMemberGoals } from "@/lib/memberGoals";
import { toast } from "sonner";
import {
  getActiveCohort,
  getMyClientRecord,
  currentWeekOf,
} from "@/lib/accountabilityProgramme";
import { ensureAccHabitsUnlocked } from "@/lib/accWeekHabits";
import { HabitsPickerDialog } from "@/components/HabitsPickerDialog";

interface ActiveHabit {
  id: string;
  habit_id: number | null;
  habit_name?: string;
  name?: string;
}

interface CheckinRow {
  date: string;
  habit_id?: number | null;
  member_habit_id?: string | null;
}

const todayStr = () => new Date().toISOString().split("T")[0];
const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = () =>
  new Date().toLocaleDateString("en-GB", { month: "long" });

export default function TodayHabitsCard() {
  const [habits, setHabits] = useState<ActiveHabit[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accEnrolled, setAccEnrolled] = useState(false);
  const [goalsMonth, setGoalsMonth] = useState<string | null>(null);
  const [curHabits, setCurHabits] = useState<(string | null)[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const today = todayStr();

    // Unlock the programme habit stack for enrolled accountability members.
    try {
      const cohort = await getActiveCohort();
      if (cohort) {
        const client = await getMyClientRecord(cohort.id);
        setAccEnrolled(!!client);
        if (client) {
          const week = currentWeekOf(cohort.start_date, cohort.weeks);
          if (week >= 1 && week <= cohort.weeks) {
            await ensureAccHabitsUnlocked(week);
          }
        }
      }
    } catch {
      /* best-effort */
    }

    // Read goals for the monthly nudge + current habits prefill.
    try {
      const g = await getMemberGoals();
      setGoalsMonth(g?.goals_month ?? null);
      setCurHabits([
        g?.habit_1 ?? null,
        g?.habit_2 ?? null,
        g?.habit_3 ?? null,
      ]);
    } catch {
      /* ignore */
    }

    const [{ data: mh }, { data: hc }] = await Promise.all([
      supabase
        .from("member_habits")
        .select("id, habit_id, habit_name, status, position")
        .eq("member_id", user.id)
        .eq("status", "active")
        .order("position", { ascending: true }),
      supabase
        .from("habit_checkins")
        .select("date, habit_id, member_habit_id")
        .eq("member_id", user.id)
        .eq("date", today),
    ]);

    setHabits((mh ?? []) as ActiveHabit[]);
    setCheckins((hc ?? []) as CheckinRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();

  const matches = (c: CheckinRow, h: ActiveHabit) =>
    c.date.slice(0, 10) === today &&
    ((c.member_habit_id != null && c.member_habit_id === h.id) ||
      (h.habit_id != null && c.habit_id === h.habit_id));

  const isDoneToday = (h: ActiveHabit) => checkins.some((c) => matches(c, h));

  const toggle = async (h: ActiveHabit) => {
    const doneToday = isDoneToday(h);
    if (doneToday) {
      setCheckins((prev) => prev.filter((c) => !matches(c, h)));
    } else {
      setCheckins((prev) => [
        ...prev,
        { date: today, habit_id: h.habit_id, member_habit_id: h.id },
      ]);
    }
    const payload = {
      member_habit_id: h.id,
      habit_id: h.habit_id,
      date: today,
    };
    const res = doneToday
      ? await deleteHabitCheckin(payload)
      : await saveHabitCheckin(payload);
    if (!res?.success) {
      toast.error("Couldn't update habit — try again");
      load();
    }
  };

  const keepThese = async () => {
    try {
      const { setMonthlyHabits } = await import("@/lib/memberGoals");
      await setMonthlyHabits(curHabits);
      setGoalsMonth(currentMonthStr());
      toast.success("Keeping this month's habits");
    } catch {
      toast.error("Couldn't update — try again");
    }
  };

  if (loading) return null;

  // Non-enrolled member with no habits: show the set-up CTA (don't hide).
  if (habits.length === 0 && !accEnrolled) {
    return (
      <>
        <Card className="bg-primary/5 border-primary/30 border-l-4 border-l-primary">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Today's habits
                </p>
                <h2 className="font-heading text-lg tracking-wide leading-tight mt-0.5">
                  Set your habits for {monthLabel()}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pick up to 3 habits to tick off each day.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              Choose habits <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
        <HabitsPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initial={curHabits}
          onSaved={load}
        />
      </>
    );
  }

  if (habits.length === 0) return null;

  const doneCount = habits.filter(isDoneToday).length;
  const allDone = doneCount === habits.length;
  const monthOutOfDate = !accEnrolled && goalsMonth !== currentMonthStr();

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Today's habits
            </CardTitle>
            <div className="flex items-center gap-2">
              {!accEnrolled && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setPickerOpen(true)}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {doneCount} / {habits.length} done
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2.5">
          {monthOutOfDate && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                New month — want to reassess your habits?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setPickerOpen(true)}
                >
                  Review
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={keepThese}
                >
                  Keep these
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {habits.map((h) => {
              const done = isDoneToday(h);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => toggle(h)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left active:scale-[0.99] transition"
                  title={
                    done ? "Done today — tap to un-log" : "Tap to log today"
                  }
                >
                  <span
                    className={
                      "flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 transition " +
                      (done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-transparent")
                    }
                  >
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={
                      "flex-1 min-w-0 text-sm truncate " +
                      (done
                        ? "text-muted-foreground line-through"
                        : "text-foreground font-medium")
                    }
                  >
                    {h.habit_name || h.name || "Habit"}
                  </span>
                </button>
              );
            })}
          </div>
          {allDone && (
            <p className="text-xs text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> All done for today — nice
              one!
            </p>
          )}
        </CardContent>
      </Card>
      <HabitsPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initial={curHabits}
        onSaved={load}
      />
    </>
  );
}
