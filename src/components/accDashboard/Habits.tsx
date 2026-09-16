import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Check } from "lucide-react";
import { habitWeekCount, habitStreak } from "@/lib/accDashboardHelpers";

export interface HabitRingData {
  id: string;
  name: string;
  checkins: { date: string; habit_id?: string; member_habit_id?: string }[];
}

function Ring({
  value,
  total,
  doneToday,
}: {
  value: number;
  total: number;
  doneToday: boolean;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  const color =
    pct >= 0.8
      ? "hsl(var(--primary))"
      : pct >= 0.5
        ? "hsl(var(--primary))"
        : "hsl(var(--muted-foreground))";
  return (
    <div className="relative">
      <svg viewBox="0 0 64 64" className="w-16 h-16">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="36"
          textAnchor="middle"
          className="fill-foreground font-bold"
          fontSize="14"
        >
          {value}/{total}
        </text>
      </svg>
      {doneToday && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

export function HabitsCard({
  habits,
  onToggleHabit,
  onLogToday,
  editControl,
  today,
}: {
  habits: HabitRingData[];
  /** Toggle a single habit's check-in for today (on/off). */
  onToggleHabit: (habitId: string) => void;
  /** Optional "log all" affordance. */
  onLogToday?: () => void;
  editControl?: React.ReactNode;
  /** ISO date string for today (so the card knows what "today" is). */
  today: string;
}) {
  const [toggling, setToggling] = useState<string | null>(null);

  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, habitStreak(h.checkins, h.id)),
    0,
  );

  const handleToggle = (habitId: string) => {
    setToggling(habitId);
    try {
      onToggleHabit(habitId);
    } finally {
      // Clear the spinner shortly after — the optimistic update has already
      // applied in the parent.
      setTimeout(() => setToggling(null), 400);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Keystone habits</CardTitle>
          <div className="flex items-center gap-3">
            {bestStreak >= 3 && (
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {bestStreak}-day streak
              </span>
            )}
            {editControl}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Your habits will appear here as the programme builds.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-around">
            {habits.map((h) => {
              const weekCount = habitWeekCount(h.checkins, h.id);
              const doneToday = h.checkins.some(
                (c) =>
                  c.date.slice(0, 10) === today &&
                  (c.member_habit_id === h.id || c.habit_id === h.id),
              );
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleToggle(h.id)}
                  disabled={toggling === h.id}
                  className="flex flex-col items-center gap-1 group focus:outline-none"
                  title={
                    doneToday
                      ? "Done today — tap to un-log"
                      : "Tap to log today"
                  }
                >
                  <div
                    className={
                      "rounded-full transition " +
                      (doneToday
                        ? "opacity-100"
                        : "opacity-80 group-hover:opacity-100 group-active:scale-95")
                    }
                  >
                    <Ring value={weekCount} total={7} doneToday={doneToday} />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center max-w-[72px] leading-tight">
                    {h.name}
                  </p>
                  <span
                    className={
                      "text-[9px] font-medium " +
                      (doneToday ? "text-primary" : "text-muted-foreground/60")
                    }
                  >
                    {doneToday ? "✓ Today" : "Tap to log"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {onLogToday && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={onLogToday}
          >
            Log all
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
