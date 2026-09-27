import { getWorkoutHistory } from "@/lib/store";

/**
 * Per-exercise workout history for the in-workout "Past Lifts" popup.
 *
 * Lives in its own module (rather than store.ts) so it can be edited without
 * touching the very large store file. Re-exported from store.ts for backwards
 * compatibility.
 */
export const getExerciseHistory = (exerciseName: string, limit = 3) => {
  const norm = (s: any) =>
    String(s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const target = norm(exerciseName);

  // Sort by date descending so "most recent" is genuinely most recent.
  const history = getWorkoutHistory()
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const out: {
    date: string;
    trackingType: any;
    sets: {
      weight: number;
      reps: number;
      distance: number;
      calories: number;
      timeMins: number;
      timeSecs: number;
    }[];
    top: { weight: number; reps: number };
  }[] = [];

  for (const workout of history) {
    // Match robustly on a normalised key — try the exercise id, name and label
    // so the current exercise reliably matches its own logged history (handles
    // id vs display-name and regenerated-id mismatches).
    const ex = workout.exercises?.find(
      (e: any) =>
        norm(e.name) === target ||
        norm(e.exerciseId) === target ||
        norm(e.label) === target,
    );
    if (!ex) continue;

    const raw = Array.isArray(ex.setsData) ? ex.setsData : [];
    let sets = raw
      .filter(
        (s: any) =>
          (s.weight || 0) > 0 ||
          (s.reps || 0) > 0 ||
          (s.distance || 0) > 0 ||
          (s.calories || 0) > 0 ||
          (s.timeMins || 0) > 0 ||
          (s.timeSecs || 0) > 0,
      )
      .map((s: any) => ({
        weight: s.weight || 0,
        reps: s.reps || 0,
        distance: s.distance || 0,
        calories: s.calories || 0,
        timeMins: s.timeMins || 0,
        timeSecs: s.timeSecs || 0,
      }));

    if (!sets.length && (ex.weight || 0) > 0)
      sets = [
        {
          weight: ex.weight,
          reps: ex.reps || 0,
          distance: 0,
          calories: 0,
          timeMins: 0,
          timeSecs: 0,
        },
      ];

    if (!sets.length) continue;

    const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    out.push({
      date: workout.date,
      trackingType: ex.trackingType || null,
      sets,
      top,
    });
    if (out.length >= limit) break;
  }

  // Drop sessions where no weight was actually logged (junk 0kg entries),
  // but keep bodyweight exercises that have never had a weighted session.
  const hasAnyWeighted = out.some((h) => h.top.weight > 0);
  return hasAnyWeighted ? out.filter((h) => h.top.weight > 0) : out;
};
