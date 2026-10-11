/**
 * Erg-challenge workout sync — Phase 2.
 *
 * Auto-counts erg metres from saved workouts so members don't have to
 * double-log. Listens for sync-status "saved" events and diffs the local
 * workout history for new entries — when a new workout appears, mirrors
 * its erg distance into the Million Metre challenge (best-effort, no
 * double count: upserts on source_ref).
 *
 * Extracted here (not in store.ts) to keep the save path focused.
 */
import { subscribeSyncStatus } from "./store";
import { syncWorkoutErgMetres } from "./ergChallenge";

let lastSeenIds: Set<string> = new Set();
let initialised = false;

function snapshotHistory(): any[] {
  try {
    return JSON.parse(localStorage.getItem("fittrack_history") || "[]");
  } catch {
    return [];
  }
}

/** Seed the "already seen" set so existing workouts aren't re-synced on load. */
function seed() {
  if (initialised) return;
  lastSeenIds = new Set(snapshotHistory().map((h: any) => String(h.id)));
  initialised = true;
}

/** Subscribe to sync events and sync erg metres for any newly-saved workout. */
export function initErgSync() {
  seed();
  subscribeSyncStatus((status) => {
    if (status !== "saved") return;
    const hist = snapshotHistory();
    for (const w of hist) {
      const id = String(w.id);
      if (lastSeenIds.has(id)) continue;
      lastSeenIds.add(id);
      syncWorkoutErgMetres(w).catch(() => {});
    }
  });
}
