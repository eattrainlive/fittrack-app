import { supabase } from "./supabase";

export interface BlockScoreRow {
  workout_id: string;
  program_id: string | null;
  section_id: string;
  section_title: string | null;
  stream: string | null;
  week: number | null;
  day: number | null;
  block_type: string;
  score_type: string;
  rounds: number | null;
  reps: number | null;
  time_secs: number | null;
  completed: boolean | null;
  is_leaderboard: boolean;
  leaderboard_title: string | null;
  sort_value: number;
}

interface ScoreContext {
  workoutId: string;
  programId?: string | null;
  stream?: string | null;
  week?: number | null;
  day?: number | null;
}

/**
 * Build a block_scores row for a saved section that carries a result/blockScore.
 * Returns null if the section has no score. sort_value is computed so that
 * DESC always = best.
 */
function rowForSection(section: any, ctx: ScoreContext): BlockScoreRow | null {
  const base = {
    workout_id: ctx.workoutId,
    program_id: ctx.programId ?? null,
    section_id: String(section.id),
    section_title: section.name ?? section.description ?? null,
    stream: ctx.stream ?? null,
    week: ctx.week ?? null,
    day: ctx.day ?? null,
    is_leaderboard: !!section.leaderboard,
    leaderboard_title: section.leaderboardTitle ?? section.name ?? null,
  };

  const r = section.result;
  const b = section.blockScore;

  if (r?.type === "AMRAP") {
    const rounds = Number(r.rounds) || 0;
    const reps = Number(r.reps) || 0;
    return {
      ...base,
      block_type: "AMRAP",
      score_type: "rounds",
      rounds,
      reps,
      time_secs: null,
      completed: null,
      sort_value: rounds * 1000 + reps,
    };
  }

  if (r?.type === "For Time") {
    const timeSecs = Number(r.timeSecs) || 0;
    return {
      ...base,
      block_type: "For Time",
      score_type: "time",
      rounds: null,
      reps: null,
      time_secs: timeSecs,
      completed: null,
      sort_value: -timeSecs,
    };
  }

  if (r?.type === "EMOM") {
    const completed = !!r.completed;
    return {
      ...base,
      block_type: "EMOM",
      score_type: "complete",
      rounds: null,
      reps: null,
      time_secs: null,
      completed,
      sort_value: completed ? 1 : 0,
    };
  }

  // Freestyle — from blockScore, or a ConditioningTimer result of type "Freestyle".
  const fs =
    b ??
    (r?.type === "Freestyle"
      ? { type: r.scoreType, value: r.value, timeSecs: r.timeSecs }
      : null);

  if (fs) {
    const value = Number(fs.value) || 0;
    if (fs.type === "time") {
      const timeSecs = Number(fs.timeSecs ?? fs.value) || 0;
      return {
        ...base,
        block_type: "Freestyle",
        score_type: "time",
        rounds: null,
        reps: null,
        time_secs: timeSecs,
        completed: null,
        sort_value: -timeSecs,
      };
    }
    return {
      ...base,
      block_type: "Freestyle",
      score_type: fs.type, // 'rounds' | 'reps'
      rounds: fs.type === "rounds" ? value : null,
      reps: fs.type === "reps" ? value : null,
      time_secs: null,
      completed: null,
      sort_value: value,
    };
  }

  return null;
}

/**
 * Best-effort: upsert block_scores rows for any scored section in the saved
 * workout. Never throws — failures are logged but don't block the save.
 */
export async function saveBlockScores(
  savedExercises: any[],
  ctx: ScoreContext,
): Promise<void> {
  try {
    const rows = savedExercises
      .filter((e: any) => e.isSection && (e.result || e.blockScore))
      .map((e: any) => rowForSection(e, ctx))
      .filter(Boolean) as BlockScoreRow[];

    if (rows.length === 0) return;

    const { error } = await supabase
      .from("block_scores")
      .upsert(rows, { onConflict: "workout_id,section_id" });

    if (error) {
      console.error("block_scores upsert failed:", error.message);
    }
  } catch (e) {
    console.error("saveBlockScores error:", e);
  }
}
