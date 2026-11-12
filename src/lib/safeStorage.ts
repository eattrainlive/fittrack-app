// Resilient localStorage writes. The app caches a lot locally (exercise library,
// recipes, photos, programmes…) and on devices with a small quota (Safari/iOS)
// that can fill up and make a critical write — like starting a workout — throw
// QuotaExceededError, crashing the screen. safeLocalSet frees space by evicting
// re-downloadable caches (they reload from Supabase) and retries, so the write
// still succeeds.

// Large, re-fetchable caches we can safely drop to make room, worst-first.
const EVICTABLE = [
  "fittrack_member_photos",
  "fittrack_recipes",
  "fittrack_education_videos",
  "fittrack_education_folders",
  "fittrack_exercises",
  "fittrack_habits_library",
  "fittrack_wow_results",
  "fittrack_wows",
  "fittrack_programs",
  "fittrack_scheduled_events",
];

const isQuotaError = (e: any) =>
  e &&
  (e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014);

/** setItem that frees space and retries on a quota error. Returns true if stored. */
export function safeLocalSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (!isQuotaError(e)) {
      console.warn("localStorage write failed", key, e);
      return false;
    }
    // Evict re-downloadable caches one at a time, retrying after each.
    for (const k of EVICTABLE) {
      if (k === key) continue;
      try {
        if (localStorage.getItem(k) == null) continue;
        localStorage.removeItem(k);
        localStorage.setItem(key, value);
        return true;
      } catch {
        /* still full — keep evicting */
      }
    }
    console.warn("localStorage still full after eviction", key);
    return false;
  }
}
