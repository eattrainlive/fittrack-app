// Staff Hub — Today "pulse": who's in now, milestones to celebrate, and
// upcoming membership anniversaries. Read-only (staff-pulse edge function).
import { useEffect, useState } from "react";
import { Trophy, Users, Gift, Dumbbell, UserPlus, Flame, Loader2 } from "lucide-react";
import { getPulse, type Pulse, type Milestone } from "@/lib/staffPulse";
import { fmtDate } from "@/components/staffHubShared";

const msIcon = (t: Milestone["type"]) =>
  t === "pb" ? Dumbbell : t === "join" ? UserPlus : Flame;

export function StaffPulse({ staffSecret }: { staffSecret: string }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    getPulse(staffSecret)
      .then((p) => live && setPulse(p))
      .catch(() => live && setPulse({ whosIn: [], milestones: [], anniversaries: [] }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [staffSecret]);

  if (loading)
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading the room…
      </div>
    );
  if (!pulse) return null;

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Who's in */}
      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <Users className="h-4 w-4" /> In today
          <span className="text-xs font-normal text-muted-foreground">({pulse.whosIn.length})</span>
        </h3>
        {pulse.whosIn.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody's scanned in yet today.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {pulse.whosIn.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{time(w.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Wins to celebrate
        </h3>
        {pulse.milestones.length === 0 ? (
          <p className="text-xs text-muted-foreground">No new milestones this week.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {pulse.milestones.map((m, i) => {
              const Icon = msIcon(m.type);
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{m.name}</span>{" "}
                    <span className="text-muted-foreground">{m.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Anniversaries */}
      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <Gift className="h-4 w-4 text-pink-500" /> Anniversaries
        </h3>
        {pulse.anniversaries.length === 0 ? (
          <p className="text-xs text-muted-foreground">None coming up this week.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {pulse.anniversaries.map((a, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{a.name}</span>{" "}
                <span className="text-muted-foreground">
                  — {a.years} {a.years === 1 ? "year" : "years"}
                  {a.inDays === 0 ? " today 🎉" : ` on ${fmtDate(a.date)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffPulse;
