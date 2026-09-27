import { supabase } from "./supabase";

export interface BlockScoreEntry {
  user_id: string;
  rounds: number | null;
  reps: number | null;
  time_secs: number | null;
  score_type: string;
  sort_value: number;
  created_at: string;
  // joined display name (best effort)
  member_name?: string | null;
}

export interface BlockLeaderboardResult {
  title: string | null;
  block_type: string | null;
  score_type: string | null;
  entries: BlockScoreEntry[];
}

/** Format a block score for display, matching the in-app conditioning format. */
export const formatBlockScore = (e: BlockScoreEntry): string => {
  if (e.score_type === "time") {
    const secs = e.time_secs || 0;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (e.score_type === "complete") return "Completed";
  if (e.score_type === "rounds") {
    const reps = e.reps || 0;
    return reps ? `${e.rounds || 0} + ${reps} reps` : `${e.rounds || 0} rounds`;
  }
  if (e.score_type === "reps") return `${e.reps || 0} reps`;
  return `${e.rounds ?? e.reps ?? e.time_secs ?? 0}`;
};

/**
 * Fetch the ranked leaderboard for a conditioning section, best first.
 * Only rows where is_leaderboard = true are returned (RLS also enforces this
 * for non-staff). Member names are joined best-effort via gym_members.
 */
export const fetchBlockLeaderboard = async (
  sectionId: string,
): Promise<BlockLeaderboardResult> => {
  const { data, error } = await supabase
    .from("block_scores")
    .select(
      "user_id, rounds, reps, time_secs, score_type, sort_value, created_at, block_type, leaderboard_title, section_title",
    )
    .eq("section_id", sectionId)
    .eq("is_leaderboard", true)
    .order("sort_value", { ascending: false });

  if (error) {
    console.error("fetchBlockLeaderboard error:", error.message);
    return { title: null, block_type: null, score_type: null, entries: [] };
  }

  const rows = (data || []) as any[];
  if (rows.length === 0) {
    return { title: null, block_type: null, score_type: null, entries: [] };
  }

  // Best-effort member-name join.
  const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const names: Record<string, string> = {};
  if (uids.length) {
    try {
      const { data: members } = await supabase
        .from("gym_members")
        .select("user_id, first_name, last_name, name")
        .in("user_id", uids);
      (members || []).forEach((m: any) => {
        const nm =
          m.name || [m.first_name, m.last_name].filter(Boolean).join(" ");
        if (nm && m.user_id) names[m.user_id] = nm;
      });
    } catch {
      // names stay empty — fall back to "Member"
    }
  }

  const entries: BlockScoreEntry[] = rows.map((r) => ({
    user_id: r.user_id,
    rounds: r.rounds,
    reps: r.reps,
    time_secs: r.time_secs,
    score_type: r.score_type,
    sort_value: r.sort_value,
    created_at: r.created_at,
    member_name: names[r.user_id] || null,
  }));

  return {
    title: rows[0].leaderboard_title || rows[0].section_title || null,
    block_type: rows[0].block_type,
    score_type: rows[0].score_type,
    entries,
  };
};

/** The current user's own best score for a section (for "your rank" display). */
export const fetchMyBlockScore = async (
  sectionId: string,
): Promise<BlockScoreEntry | null> => {
  const { data, error } = await supabase
    .from("block_scores")
    .select(
      "user_id, rounds, reps, time_secs, score_type, sort_value, created_at",
    )
    .eq("section_id", sectionId)
    .eq("is_leaderboard", true)
    .maybeSingle();
  if (error) return null;
  return (data as any) || null;
};
