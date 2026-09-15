import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WEEK_THEMES } from "@/lib/accountabilityProgramme";
import type { AccWeekContent } from "@/lib/accWeekContent";

export function HeroCard({
  week,
  weekContent,
  daysLeft,
  coachName,
  coachAvatar,
  why,
}: {
  week: number;
  weekContent: AccWeekContent | null;
  daysLeft: number;
  coachName: string;
  coachAvatar: string | null;
  why: string | null;
}) {
  const theme =
    weekContent?.theme || WEEK_THEMES.find((t) => t.week === week)?.title || "";
  return (
    <Card className="bg-primary/5 border-primary/30">
      <CardContent className="py-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl tracking-wide">
              Week {week} of 6
              {theme && (
                <span className="text-muted-foreground"> — {theme}</span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {daysLeft > 0
                ? `${daysLeft} days left this week`
                : "Programme complete 🎉"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
              {coachAvatar ? (
                <img
                  src={coachAvatar}
                  alt={coachName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {coachName.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Your coach</p>
              <p className="text-xs font-medium">{coachName}</p>
            </div>
          </div>
        </div>

        {/* 6-dot progress strip */}
        <div className="flex gap-1.5">
          {WEEK_THEMES.map((t) => {
            const done = week > t.week;
            const current = week === t.week;
            return (
              <div
                key={t.week}
                className={`h-2 flex-1 rounded-full ${
                  done ? "bg-primary" : current ? "bg-primary/50" : "bg-muted"
                }`}
                title={`Week ${t.week}`}
              />
            );
          })}
        </div>

        {why && (
          <div className="rounded-lg bg-card/60 border border-primary/20 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Your why
            </p>
            <p className="text-sm italic text-foreground">"{why}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
