// Fire feature-view events (once per feature per session) to app_events.
import { supabase } from "@/lib/supabase";

const loggedThisSession = new Set<string>();

/**
 * Log a feature_view event. Debounced: at most once per feature per app session.
 * Best-effort — never throws or blocks navigation.
 */
export async function logFeatureView(feature: string): Promise<void> {
  if (loggedThisSession.has(feature)) return;
  loggedThisSession.add(feature);
  try {
    await supabase
      .from("app_events")
      .insert({ event: "feature_view", feature });
  } catch {
    // ignore — best-effort
  }
}

/** Reset the per-session debounce (mainly for tests). */
export function resetFeatureViewSession(): void {
  loggedThisSession.clear();
}
