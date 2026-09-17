import { useEffect } from "react";

/**
 * Belt-and-braces guard: if the current viewMode requires a transient object
 * that isn't present, reset to the browse list so the page never renders blank.
 *
 * viewMode values `detail`, `session-overview`, and `wow-detail` each depend on
 * a transient object (selectedTemplate / quickOverviewWorkout / currentWow)
 * that is NOT persisted across reloads. If the persisted viewMode is one of
 * those but the object is null, this effect resets to `browse`.
 */
export function useViewModeGuard(
  viewMode: string,
  setViewMode: (v: "browse") => void,
  selectedTemplate: any,
  quickOverviewWorkout: any,
  currentWow: any,
) {
  useEffect(() => {
    if (
      (viewMode === "detail" && !selectedTemplate) ||
      (viewMode === "session-overview" && !quickOverviewWorkout) ||
      (viewMode === "wow-detail" && !currentWow)
    ) {
      setViewMode("browse");
    }
  }, [
    viewMode,
    selectedTemplate,
    quickOverviewWorkout,
    currentWow,
    setViewMode,
  ]);
}
