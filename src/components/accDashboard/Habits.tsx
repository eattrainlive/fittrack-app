import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { habitWeekCount, habitStreak } from "@/lib/accDashboardHelpers";

export interface HabitRingData {
  id: string;
  name: string;
  checkins: { date: string; habit_id: string }[];
}

function Ring({ value, total }: { value: number; total: number }) {
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
  );
}

export function HabitsCard({
  habits,
  onLogToday,
}: {
  habits: HabitRingData[];
  onLogToday: () => void;
}) {
  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, habitStreak(h.checkins, h.id)),
    0,
  );
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Keystone habits</CardTitle>
          {bestStreak >= 3 && (
            <span className="text-xs font-medium text-primary flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> {bestStreak}-day streak
            </span>
          )}
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
              return (
                <div key={h.id} className="flex flex-col items-center gap-1">
                  <Ring value={weekCount} total={7} />
                  <p className="text-[10px] text-muted-foreground text-center max-w-[72px] truncate">
                    {h.name}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={onLogToday}
        >
          Log today
        </Button>
      </CardContent>
    </Card>
  );
}
