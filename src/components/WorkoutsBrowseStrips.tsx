import { Trophy, ChevronRight } from "lucide-react";

export const scoreTypeLabel = (scoreType?: string) =>
  scoreType === "time"
    ? "For Time"
    : scoreType === "reps"
      ? "Total Reps"
      : scoreType === "distance"
        ? "For Distance"
        : "For Calories";

export const formatWowScore = (scoreType: string, score: number) =>
  scoreType === "time"
    ? `${Math.floor((score || 0) / 60)}:${((score || 0) % 60).toString().padStart(2, "0")}`
    : `${score}`;

/** The Workout of the Week strip shown at the top of the Workouts Browse page. */
export function WowBanner({
  wow,
  results,
  currentUid,
  onOpen,
}: {
  wow: any;
  results: any[];
  currentUid: string | null;
  onOpen: () => void;
}) {
  if (!wow) return null;
  const myScore = results.find((r) => r.member_id === currentUid);
  const sorted = [...results].sort((a, b) =>
    wow.score_type === "time" ? a.score - b.score : b.score - a.score,
  );
  const myRank = sorted.findIndex((r) => r.member_id === currentUid) + 1;
  const typeLabel = scoreTypeLabel(wow.score_type);
  const scoreText = myScore
    ? formatWowScore(wow.score_type, myScore.score)
    : null;
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 bg-[#14170f] border border-[#23291b] rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Trophy className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Workout of the Week
        </p>
        <p className="font-heading text-xl tracking-wider uppercase leading-none text-white">
          {wow.name.replace(/^workout of the week\s*/i, "").trim() || wow.name}
        </p>
        <p className="text-xs text-neutral-400 truncate">
          {typeLabel}
          {myScore
            ? ` · Rank ${myRank} · ${scoreText}`
            : ` · ${results.length} logged · tap to view`}
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 border border-primary/50 text-primary font-bold text-xs px-3 py-2 rounded-lg">
        {myScore ? "View" : "Log"} <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

/** Entry point to the consolidated /leaderboards page. */
export function LeaderboardsBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 bg-[#14170f] border border-[#23291b] rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Trophy className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Leaderboards
        </p>
        <p className="font-heading text-xl tracking-wider uppercase leading-none text-white">
          Leaderboards
        </p>
        <p className="text-xs text-neutral-400 truncate">
          See how you rank across every challenge
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 border border-primary/50 text-primary font-bold text-xs px-3 py-2 rounded-lg">
        View <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}
