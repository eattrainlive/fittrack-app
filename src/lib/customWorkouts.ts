import { supabase } from "./supabase";

export interface CustomWorkout {
  id: string;
  name: string;
  exercises: any[];
  created_at?: string;
}

const LS_KEY = "fittrack_custom_workouts";

const readCache = (): CustomWorkout[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeCache = (list: CustomWorkout[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

/** Strip per-session noise so a saved workout is a clean, repeatable template. */
const cleanExercises = (exercises: any[]): any[] =>
  (exercises || [])
    .filter((e) => e && e.name)
    .map((e) => ({
      name: e.name,
      blockType: e.blockType ?? "Strength",
      trackingType: e.trackingType ?? "Weight & Reps",
      rest: e.rest ?? 0,
      linkedToNext: e.linkedToNext ?? false,
      eachSide: e.eachSide ?? false,
      setsData: (e.setsData || []).map((s: any, i: number) => ({
        id: String(i + 1),
        reps: Number(s?.reps) || 0,
        weight: Number(s?.weight) || 0,
        distance: Number(s?.distance) || 0,
        timeMins: Number(s?.timeMins) || 0,
        timeSecs: Number(s?.timeSecs) || 0,
        calories: Number(s?.calories) || 0,
        completed: false,
      })),
    }));

/** Saved custom workouts, newest first (Supabase when signed in, else cache). */
export const getCustomWorkouts = async (): Promise<CustomWorkout[]> => {
  try {
    const { data, error } = await supabase
      .from("custom_workouts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const list = (data ?? []) as CustomWorkout[];
    writeCache(list);
    return list;
  } catch (e) {
    console.warn("[customWorkouts] getCustomWorkouts fell back to cache:", e);
    return readCache();
  }
};

/** Save a logged session as a reusable workout. */
export const saveCustomWorkout = async (payload: {
  name: string;
  exercises: any[];
}): Promise<{ error: any }> => {
  const row = {
    name: payload.name?.trim() || "My workout",
    exercises: cleanExercises(payload.exercises),
  };
  const { data, error } = await supabase
    .from("custom_workouts")
    .insert(row)
    .select("*")
    .single();
  // Keep the local cache in step either way.
  const cache = readCache();
  writeCache([
    (data as CustomWorkout) ?? {
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      ...row,
    },
    ...cache,
  ]);
  return { error };
};

export const deleteCustomWorkout = async (
  id: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("custom_workouts")
    .delete()
    .eq("id", id);
  writeCache(readCache().filter((w) => w.id !== id));
  return { error };
};
