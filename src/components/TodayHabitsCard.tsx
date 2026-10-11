import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Flame, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import {
  getActiveCohort,
  getMyClientRecord,
  currentWeekOf,
} from "@/lib/accountabilityProgramme";
import { ensureAccHabitsUnlocked } from "@/lib/accWeekHabits";
import { toast } from "sonner";

interface ActiveHabit {
  id: string;
  habit_id: number | null;
  habit_name?: string;
  name?: string;
}

interface CheckinRow {
  date: string;
  habit_id?: string | null;
  member_habit_id?: string | null;
}

const todayStr = () => new Date().toISOString().split("T")[0];

export default function TodayHabitsCard() {
  const [habits, setHabits] = useState<ActiveHabit[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const today = todayStr();

    // If this member is on the accountability programme, make sure the current
    // week's habit stack is unlocked into member_habits first — so the home card
    // never lags the programme (the dashboard does the same unlock on its load).
    // Idempotent + best-effort; personal habits are untouched and still shown.
    try {
      const cohort = await getActiveCohort();
      if (cohort) {
        const client = await getMyClientRecord(cohort.id);
        if (client) {
          const week = currentWeekOf(cohort.start_date, cohort.weeks);
          if (week >= 1 && week <= cohort.weeks) {
            await ensureAccHabitsUnlocked(week);
          }
        }
      }
    } catch {
      /* best-effort — never block the habit list on this */
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

    // Optimistic update — flip the UI first, roll back on error.
    if (doneToday) {
      setCheckins((prev) => prev.filter((c) => !matches(c, h)));
    } else {
      setCheckins((prev) => [
        ...prev,
        { date: today, habit_id: h.habit_id as any, member_habit_id: h.id },
      ]);
    }

    const payload = { member_habit_id: h.id, habit_id: h.habit_id, date: today };
    const res = doneToday
      ? await deleteHabitCheckin(payload)
      : await saveHabitCheckin(payload);

    if (!res?.success) {
      // Roll back the optimistic change.
      toast.error("Couldn't update habit — try again");
      load();
    }
  };

  if (loading) return null;
  if (habits.length === 0) return null;

  const doneCount = habits.filter(isDoneToday).length;
  const allDone = doneCount === habits.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> Today's habits
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {doneCount} / {habits.length} done
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {habits.map((h) => {
            const done = isDoneToday(h);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => toggle(h)}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left active:scale-[0.99] transition"
                title={done ? "Done today — tap to un-log" : "Tap to log today"}
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
          <p className="mt-2.5 text-xs text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> All done for today — nice one!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
