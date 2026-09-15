import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Sparkline, EncouragingEmpty } from "../accDashboardWidgets";

export function WeightCard({
  avgWeight,
  weightDelta,
  points,
}: {
  avgWeight: number | null;
  weightDelta: number | null;
  points: number[];
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-muted-foreground">Weight</CardTitle>
      </CardHeader>
      <CardContent>
        {avgWeight != null ? (
          <>
            <p className="font-heading text-3xl tracking-tight">
              {avgWeight.toFixed(1)}
              <span className="text-base text-muted-foreground ml-1">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              7-day avg
            </p>
            {weightDelta != null && (
              <p
                className={`text-xs mt-1 flex items-center gap-1 ${
                  weightDelta < 0 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {weightDelta < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3" />
                )}
                {weightDelta > 0 ? "+" : ""}
                {weightDelta} kg since Week 1
              </p>
            )}
            <div className="mt-2">
              <Sparkline points={points} />
            </div>
          </>
        ) : (
          <EncouragingEmpty text="Log your first weight to see your trend" />
        )}
      </CardContent>
    </Card>
  );
}

export function StepsCard({ stepTarget }: { stepTarget: number }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-muted-foreground">Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl tracking-tight">
          {stepTarget.toLocaleString()}
          <span className="text-base text-muted-foreground ml-1">/ day</span>
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Your target
        </p>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: "100%" }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Log steps in your daily check-ins
        </p>
      </CardContent>
    </Card>
  );
}

export function NonScaleTrends({ checkins }: { checkins: any[] }) {
  if (checkins.length === 0) return null;
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How you're feeling</CardTitle>
        <CardDescription className="text-xs">
          The wins the scale doesn't show
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Energy", key: "q4" },
            { label: "Sleep", key: "q5" },
            { label: "Mood", key: "q6" },
          ].map((m) => {
            const vals = checkins
              .filter((c) => c.week_number <= 5 && c.responses?.[m.key] != null)
              .sort((a, b) => a.week_number - b.week_number)
              .map((c) => c.responses[m.key]);
            return (
              <div
                key={m.key}
                className="rounded-xl border border-border p-3 text-center"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {m.label}
                </p>
                {vals.length >= 2 ? (
                  <p className="font-heading text-sm mt-1">
                    {vals.join(" → ")}
                  </p>
                ) : vals.length === 1 ? (
                  <p className="font-heading text-sm mt-1">{vals[0]}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">—</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
