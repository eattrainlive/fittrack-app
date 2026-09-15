import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormStatusRow } from "../accDashboardWidgets";
import { WEEK_THEMES } from "@/lib/accountabilityProgramme";
import { fmtDate } from "@/lib/accDashboardHelpers";

export function FormsStatusCard({
  onboardingDone,
  clientCreated,
  weeklyDone,
  week,
}: {
  onboardingDone: boolean;
  clientCreated?: string;
  weeklyDone: (w: number) => boolean;
  week: number;
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
                      : "Due"
              }
              done={done}
              locked={isFuture}
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
