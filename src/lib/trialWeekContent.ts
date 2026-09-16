import { supabase } from "./supabase";

export interface TrialTask {
  id: string;
  label: string;
}

export interface TrialWeekContent {
  week_number: number;
  title: string;
  theme: string;
  teaching: string;
  video_url: string;
  tasks: TrialTask[];
  updated_at?: string;
}

/** Load all trial week-content rows (1..4). */
export const getAllTrialWeekContent = async (): Promise<TrialWeekContent[]> => {
  try {
    const { data } = await supabase
      .from("trial_week_content")
      .select("*")
      .order("week_number", { ascending: true });
    return (data as TrialWeekContent[]) ?? [];
  } catch (e) {
    console.warn("getAllTrialWeekContent failed", e);
    return [];
  }
};

/** Load a single week's content. */
export const getTrialWeekContent = async (
  weekNumber: number,
): Promise<TrialWeekContent | null> => {
  try {
    const { data } = await supabase
      .from("trial_week_content")
      .select("*")
      .eq("week_number", weekNumber)
      .maybeSingle();
    return (data as TrialWeekContent) ?? null;
  } catch (e) {
    console.warn("getTrialWeekContent failed", e);
    return null;
  }
};

/** Staff: update a week's content. */
export const updateTrialWeekContent = async (
  weekNumber: number,
  patch: Partial<TrialWeekContent>,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("trial_week_content")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("week_number", weekNumber);
  return { error };
};

// ── Task state (stored on trial_goals.task_state) ──────────────────────────

export const getTaskState = async (): Promise<Record<string, string>> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};
    const { data } = await supabase
      .from("trial_goals")
      .select("task_state")
      .eq("member_id", user.id)
      .maybeSingle();
    const raw = (data as any)?.task_state;
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
};

export const toggleTask = async (
  taskId: string,
  checked: boolean,
): Promise<Record<string, string>> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not-authenticated");

  const { data } = await supabase
    .from("trial_goals")
    .select("task_state")
    .eq("member_id", user.id)
    .maybeSingle();
  const raw = (data as any)?.task_state;
  const state: Record<string, string> = raw
    ? typeof raw === "string"
      ? JSON.parse(raw)
      : { ...raw }
    : {};

  if (checked) {
    state[taskId] = new Date().toISOString();
  } else {
    delete state[taskId];
  }

  // Ensure the column exists — if it doesn't, the update will error; the SQL adds it.
  await supabase
    .from("trial_goals")
    .update({ task_state: state })
    .eq("member_id", user.id);

  return state;
};

// Ensure task_state column exists (idempotent — safe to call).
export const ensureTaskStateColumn = async () => {
  // Best-effort: the SQL migration adds this. Nothing to do client-side.
};
