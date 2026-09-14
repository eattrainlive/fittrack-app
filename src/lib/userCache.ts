/**
 * User-scoped localStorage cache management.
 *
 * Problem: `getActiveProgram` and other `get*` helpers read only from
 * localStorage, which is per-device not per-user. On a shared device or
 * after an account switch, one user sees another's active programme /
 * habits / data. The fix is to treat localStorage as a per-user cache
 * that is refreshed from the server on login and cleared on sign-out /
 * user-switch.
 */

import { supabase } from "./supabase";

/** All localStorage keys that hold per-user data. */
export const USER_CACHE_KEYS = [
  "fittrack_active_program",
  "fittrack_active_workout",
  "fittrack_history",
  "fittrack_bodyweight",
  "fittrack_prs",
  "fittrack_wow_results",
  "fittrack_member_nutrition",
  "fittrack_member_habits",
  "fittrack_habit_checkins",
  "fittrack_member_measurements",
  "fittrack_member_photos",
  "fittrack_member_macros",
  "fittrack_macro_logs",
  "fittrack_preferred_days",
  "fittrack_profile",
  "fittrack_is_staff",
  "fittrack_programs",
  "fittrack_exercises",
  "fittrack_education_folders",
  "fittrack_education_videos",
];

/** Clear ALL user-scoped local caches. Call on sign-out / user-switch. */
export const clearUserCaches = () => {
  USER_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
};

/**
 * Load the current user's active programme from the server and overwrite
 * the local cache so `getActiveProgram()` (which reads localStorage)
 * always reflects the current user.
 */
export const refreshActiveProgramFromServer = async (userId: string) => {
  try {
    const { data } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "active_program")
      .maybeSingle();
    if (data?.value) {
      localStorage.setItem("fittrack_active_program", data.value);
    } else {
      localStorage.removeItem("fittrack_active_program");
    }
  } catch {
    // network failure — leave existing cache, don't block the app
  }
};

/**
 * On sign-in / user-switch: clear the previous user's caches, then load
 * THIS user's active programme from the server so "Resume workout"
 * shows the right programme.
 */
export const onUserSignIn = async (userId: string) => {
  clearUserCaches();
  await refreshActiveProgramFromServer(userId);
};

/** On sign-out: wipe all user data so nothing carries to the next account. */
export const onUserSignOut = () => {
  clearUserCaches();
};
