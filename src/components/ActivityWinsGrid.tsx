import {
  Dumbbell,
  Calendar,
  TrendingUp,
  Flame,
  DoorOpen,
  HeartPulse,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgressSummary } from "@/lib/trialSummary";

/**
 * Shared headline-wins tile grid — used by both the trial review card and the
 * member activity modal so both show the identical tile set (Coached PT,
 * Classes, Gym Visits, Lifted, Streak).
 */
export function ActivityWinsGrid({
  s,
  onlineClient = false,
}: {
  s: ProgressSummary;
  onlineClient?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className={`bg-muted/30 ${onlineClient ? "opacity-40" : ""}`}>
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Dumbbell className="w-3 h-3 text-primary" /> Coached PT
          </p>
          <p className="font-heading text-lg">
            {onlineClient ? "N/A" : `${s.coachedUsed} / ${s.coachedTotal}`}
          </p>
          {!onlineClient && s.coachedUpcoming > 0 && (
            <p className="text-[10px] text-muted-foreground">
              +{s.coachedUpcoming} booked
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={`bg-muted/30 ${onlineClient ? "opacity-40" : ""}`}>
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" /> Classes
          </p>
          <p className="font-heading text-lg">
            {onlineClient ? "N/A" : `+${s.classesCount}`}
          </p>
          {!onlineClient && (
            <p className="text-[10px] text-muted-foreground">unlimited</p>
          )}
        </CardContent>
      </Card>

      <Card className={`bg-muted/30 ${onlineClient ? "opacity-40" : ""}`}>
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <DoorOpen className="w-3 h-3 text-primary" /> Gym Visits
          </p>
          <p className="font-heading text-lg">
            {onlineClient ? "N/A" : s.gymVisits}
          </p>
          {!onlineClient && (
            <p className="text-[10px] text-muted-foreground">
              {s.gymScansTotal} {s.gymScansTotal === 1 ? "entry" : "entries"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-primary" /> Lifted
          </p>
          <p className="font-heading text-lg">
            {s.totalVolumeKg.toLocaleString()} kg
          </p>
          <p className="text-[10px] text-muted-foreground">
            {s.loggedSessions} sessions
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <HeartPulse className="w-3 h-3 text-primary" /> Activities
          </p>
          <p className="font-heading text-lg">{s.activitiesCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">
            {s.activitiesCount === 1 ? "cardio log" : "cardio logs"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Flame className="w-3 h-3 text-primary" /> Streak
          </p>
          <p className="font-heading text-lg">{s.bestStreak} days</p>
          <p className="text-[10px] text-muted-foreground">
            {s.totalCheckins} checkins
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
