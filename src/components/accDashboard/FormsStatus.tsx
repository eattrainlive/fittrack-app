import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusRow } from "../accDashboardWidgets";
import { WEEK_THEMES } from "@/lib/accountabilityProgramme";
import { fmtDate } from "@/lib/accDashboardHelpers";

export function FormsStatusCard({
  onboardingDone,
  clientCreated,
  weeklyDone,
  week,
  onOpenWeek,
}: {
  onboardingDone: boolean;
  clientCreated?: string;
  weeklyDone: (w: number) => boolean;
  week: number;
  /** Open a given week's check-in form (current + last week only). */
  onOpenWeek?: (w: number) => void;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your forms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <FormStatusRow
          label="Onboarding & baseline"
          status={onboardingDone ? `Done ${fmtDate(clientCreated)}` : "Due"}
          done={onboardingDone}
        />
        {WEEK_THEMES.map((t) => {
          const done = weeklyDone(t.week);
          const isCurrent = week === t.week;
          const isFuture = week < t.week;
          // Openable: the current week, or last week if not yet done (catch-up).
          const openable =
            !!onOpenWeek &&
            !done &&
            (isCurrent || t.week === week - 1);
          return (
            <FormStatusRow
              key={t.week}
              label={`Week ${t.week} check-in`}
              status={
                done
                  ? "Done"
                  : isCurrent
                    ? "Due now"
                    : isFuture
                      ? "Upcoming"
                      : t.week === week - 1
                        ? "Still open"
                        : "Due"
              }
              done={done}
              locked={isFuture}
              onClick={openable ? () => onOpenWeek!(t.week) : undefined}
            />
          );
        })}
        <FormStatusRow
          label="Final results"
          status={weeklyDone(6) ? "Done" : "Unlocks Week 6"}
          done={weeklyDone(6)}
          locked={week < 6}
        />
      </CardContent>
    </Card>
  );
}
