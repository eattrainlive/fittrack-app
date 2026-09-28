import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Dumbbell, Trophy, ChevronRight } from "lucide-react";
import { getMemberSummary, type ProgressSummary } from "@/lib/trialSummary";

const fmtVol = (kg: number) => `${Math.round(kg).toLocaleString("en-GB")}kg`;

export default function MemberProgressCard() {
  const navigate = useNavigate();
  const [s, setS] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMemberSummary()
      .then((res) => alive && setS(res))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !s) return null;

  const streak = s.bestStreak || 0;
  const habits = s.habitsBuilt || 0;
  const sessions = s.loggedSessions || 0;
  const volume = s.totalVolumeKg || 0;
  const newPBs = (s.prs || []).filter((p) => (p.gain || 0) > 0).length;

  const headline =
    streak > 0
      ? `${streak}-day habit streak 🔥`
      : sessions > 0
        ? "You're moving — keep it rolling"
        : "Let's get your first win this week";

  return (
    <button
      onClick={() => navigate("/progress")}
      className="w-full text-left bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3 active:scale-[.995] transition"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Your progress
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-primary shrink-0" />
        <span className="font-heading font-bold text-lg leading-tight">
          {headline}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={<Flame className="h-4 w-4" />}
          value={habits}
          label={habits === 1 ? "habit" : "habits"}
        />
        <Stat
          icon={<Dumbbell className="h-4 w-4" />}
          value={sessions}
          label={sessions === 1 ? "session" : "sessions"}
        />
        <Stat
          icon={<Trophy className="h-4 w-4" />}
          value={newPBs}
          label={newPBs === 1 ? "new PB" : "new PBs"}
        />
      </div>
      {volume > 0 && (
        <p className="text-xs text-muted-foreground">
          {fmtVol(volume)} lifted this month · tap to see your full progress
        </p>
      )}
    </button>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex flex-col items-center gap-1">
      <span className="text-primary">{icon}</span>
      <span className="font-bold text-lg leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
