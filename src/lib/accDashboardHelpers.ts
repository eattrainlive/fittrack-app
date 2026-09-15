export const fmtDate = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";

/** Compute a 7-day rolling average from bodyweight entries. */
export const rollingAverage = (
  entries: { date: string; weight: number }[],
): number | null => {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const last7 = sorted.slice(-7);
  return last7.reduce((s, e) => s + e.weight, 0) / last7.length;
};

/** Build sparkline points from bodyweight entries (last 14). */
export const sparklinePoints = (
  entries: { date: string; weight: number }[],
): number[] => {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return sorted.slice(-14).map((e) => e.weight);
};

/** Compute a habit streak (consecutive days checked in). */
export const habitStreak = (
  checkins: { date: string; habit_id: string }[],
  habitId: string,
): number => {
  const days = new Set(
    checkins
      .filter((c) => c.habit_id === habitId)
      .map((c) => c.date.slice(0, 10)),
  );
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

/** Count habit check-ins this week (Mon–Sun). */
export const habitWeekCount = (
  checkins: { date: string; habit_id: string }[],
  habitId: string,
): number => {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const startTs = monday.getTime();
  return checkins.filter(
    (c) => c.habit_id === habitId && new Date(c.date).getTime() >= startTs,
  ).length;
};

/** Build the wins/milestones strip from available data. */
export const buildWins = (params: {
  bestStreak: number;
  weightDelta: number | null;
  inchesOff: number | null;
  checkinsCompleted: number;
}): { label: string; emoji: string }[] => {
  const wins: { label: string; emoji: string }[] = [];
  if (params.bestStreak >= 3)
    wins.push({ label: `${params.bestStreak}-day streak`, emoji: "🔥" });
  if (params.weightDelta != null && params.weightDelta < 0)
    wins.push({
      label: `${Math.abs(params.weightDelta).toFixed(1)} kg down`,
      emoji: "📉",
    });
  if (params.inchesOff != null && params.inchesOff > 0)
    wins.push({ label: `${params.inchesOff}" off`, emoji: "📏" });
  if (params.checkinsCompleted >= 1)
    wins.push({
      label: `${params.checkinsCompleted} check-in${params.checkinsCompleted > 1 ? "s" : ""}`,
      emoji: "✅",
    });
  return wins;
};
