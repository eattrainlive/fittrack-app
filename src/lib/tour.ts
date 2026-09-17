/**
 * Onboarding tour persistence.
 *
 * Source of truth is `user_settings.onboarding_tour_done` (per user), mirrored
 * to localStorage for instant checks. localStorage alone isn't reliable
 * (in-app browsers / iOS eviction) so the server flag prevents the tour
 * re-appearing after a cache wipe.
 */

import { supabase } from "./supabase";

const LS_KEY = "fittrack_tour_done";

/** Instant local check (may be stale). */
export const isTourDoneLocal = () => localStorage.getItem(LS_KEY) === "true";

/** Mark the tour done locally + server-side. */
export const markTourDone = async () => {
  localStorage.setItem(LS_KEY, "true");
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          key: "onboarding_tour_done",
          value: "true",
        },
        { onConflict: "user_id, key" },
      );
    }
  } catch {
    /* network failure — local flag still set */
  }
};

/** Clear the flag (local + server) so the tour can replay. */
export const resetTourDone = async () => {
  localStorage.removeItem(LS_KEY);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_settings")
        .delete()
        .eq("user_id", user.id)
        .eq("key", "onboarding_tour_done");
    }
  } catch {
    /* ignore */
  }
};

/**
 * Resolve the authoritative server flag on login. Returns true if the tour
 * has been completed/skipped. Falls back to the local flag on error.
 */
export const fetchTourDone = async (): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return isTourDoneLocal();
    const { data } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "onboarding_tour_done")
      .maybeSingle();
    if (data?.value === "true") {
      localStorage.setItem(LS_KEY, "true");
      return true;
    }
    // Server says not done — keep local in sync so a stale "true" can't hide it
    localStorage.removeItem(LS_KEY);
    return false;
  } catch {
    return isTourDoneLocal();
  }
};
