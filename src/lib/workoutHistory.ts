/**
 * Workout history helpers — list / update / delete past sessions.
 *
 * Members edit their own rows directly via RLS (owner-scoped); coaches use
 * the `workout-admin` edge function (service role) to manage any member's
 * sessions.
 */

import { supabase } from "./supabase";
import { getWorkoutHistory } from "./store";

/** Sum of weight*reps across every set in a workout. */
export const computeVolume = (workout: any): number => {
  let vol = 0;
  for (const ex of workout?.exercises || []) {
    if (ex.isSection) continue;
    for (const s of ex.setsData || []) {
      vol += (+s.weight || 0) * (+s.reps || 0);
    }
  }
  return Math.round(vol);
};

// ── Member (self, RLS) ──────────────────────────────────────────────────────

export const updateWorkout = async (
  workout: any,
): Promise<{ success: boolean; error?: any }> => {
  const history = getWorkoutHistory().map((h: any) =>
    h.id === workout.id ? workout : h,
  );
  localStorage.setItem("fittrack_history", JSON.stringify(history));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not-authenticated" };
  const volume = computeVolume(workout);
  const { error } = await supabase
    .from("workout_history")
    .update({ data: workout, volume, date: workout.date })
    .eq("id", workout.id)
    .eq("user_id", user.id);
  if (error) console.error("updateWorkout error", error);
  return { success: !error, error };
};

export const deleteWorkout = async (
  id: string,
): Promise<{ success: boolean; error?: any }> => {
  const history = getWorkoutHistory().filter((h: any) => h.id !== id);
  localStorage.setItem("fittrack_history", JSON.stringify(history));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not-authenticated" };
  const { error } = await supabase
    .from("workout_history")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) console.error("deleteWorkout error", error);
  return { success: !error, error };
};

// ── Coach (service-role function) ───────────────────────────────────────────

export const listMemberWorkouts = async (
  staffSecret: string,
  memberUserId: string,
): Promise<any[]> => {
  const { data, error } = await supabase.functions.invoke("workout-admin", {
    body: { staffSecret, action: "list", memberUserId },
  });
  if (error) throw error;
  return (data?.workouts || []).map((w: any) => w.data ?? w);
};

export const updateMemberWorkout = async (
  staffSecret: string,
  workoutId: string,
  workout: any,
): Promise<{ success: boolean; error?: any }> => {
  const { data, error } = await supabase.functions.invoke("workout-admin", {
    body: { staffSecret, action: "update", workoutId, workout },
  });
  if (error) return { success: false, error };
  return { success: !data?.error, error: data?.error };
};

export const deleteMemberWorkout = async (
  staffSecret: string,
  workoutId: string,
): Promise<{ success: boolean; error?: any }> => {
  const { data, error } = await supabase.functions.invoke("workout-admin", {
    body: { staffSecret, action: "delete", workoutId },
  });
  if (error) return { success: false, error };
  return { success: !data?.error, error: data?.error };
};
