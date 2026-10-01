import { supabase } from "@/lib/supabase";

/**
 * Lightweight feature-view tracking for the Staff Hub Usage dashboard.
 * Logs one `feature_view` event per feature per app session (debounced in
 * memory) so flicking back and forth doesn't inflate counts.
 *
 * Best-effort: never throws or blocks navigation if the insert fails.
 */

const FEATURE_KEYS = [
  "recipes",
  "nutrition",
  "habits",
  "leaderboard",
  "community",
  "progress",
  "workouts",
  "foundations",
  "stronger",
  "fusion",
  "performance",
  "group_pt",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

const loggedThisSession = new Set<string>();

/**
 * Map a programme stream name to its feature-view key.
 */
export const streamToFeature = (stream?: string | null): FeatureKey | null => {
  const s = String(stream || "")
    .toLowerCase()
    .trim();
  if (/found/.test(s)) return "foundations";
  if (/stronger/.test(s)) return "stronger";
  if (/fusion/.test(s)) return "fusion";
  if (/performance/.test(s)) return "performance";
  if (/group\s*pt|groupt/.test(s)) return "group_pt";
  return null;
};

/**
 * Log a feature view (once per session per feature). Safe to call on every
 * screen mount — duplicates within the same session are ignored.
 */
export const logFeatureView = async (feature: FeatureKey): Promise<void> => {
  if (loggedThisSession.has(feature)) return;
  loggedThisSession.add(feature);
  try {
    const { error } = await supabase.from("app_events").insert({
      event: "feature_view",
      feature,
    });
    if (error) {
      // Allow a retry next session by un-logging on failure.
      loggedThisSession.delete(feature);
    }
  } catch {
    loggedThisSession.delete(feature);
  }
};
