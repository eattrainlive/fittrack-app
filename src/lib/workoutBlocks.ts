/**
 * Groups a flat exercise array into "blocks" for the member workout logger.
 *
 * Rules:
 * - A section header (`isSection`) starts a new section context and flushes
 *   any in-progress group.
 * - Supersets: consecutive `linkedToNext` exercises accumulate and flush on
 *   the first non-linked row.
 * - Freestyle sections: ALL exercises in the section form ONE block, flushed
 *   at the section end (so the written workout + video refs + score is a
 *   single step, not one step per reference exercise).
 */
export interface WorkoutBlock {
  id: string;
  type: "single" | "superset" | "freestyle" | "conditioning";
  exercises: any[];
  section: any;
}

export function buildWorkoutBlocks(exercises: any[]): WorkoutBlock[] {
  const result: WorkoutBlock[] = [];
  let currentSection: any = null;
  let currentGroup: any[] = [];

  exercises.forEach((ex, index) => {
    if (ex.isSection) {
      // flush any open group before starting a new section
      if (currentGroup.length) {
        result.push({
          id: `block-${index}`,
          type: currentGroup.length > 1 ? "superset" : "single",
          exercises: currentGroup,
          section: currentSection,
        });
        currentGroup = [];
      }
      currentSection = ex;
    } else {
      currentGroup.push(ex);
      const isFreestyle = currentSection?.sectionType === "Freestyle";
      const nextEx = exercises[index + 1];
      // Freestyle flushes at section end; superset flushes on !linkedToNext.
      const sectionEnds = !nextEx || nextEx.isSection;
      if (isFreestyle ? sectionEnds : !ex.linkedToNext) {
        result.push({
          id: `block-${index}`,
          type: isFreestyle
            ? "freestyle"
            : currentGroup.length > 1
              ? "superset"
              : "single",
          exercises: currentGroup,
          section: currentSection,
        });
        currentGroup = [];
      }
    }
  });

  if (currentGroup.length > 0) {
    const isFreestyle = currentSection?.sectionType === "Freestyle";
    result.push({
      id: `block-end`,
      type: isFreestyle
        ? "freestyle"
        : currentGroup.length > 1
          ? "superset"
          : "single",
      exercises: currentGroup,
      section: currentSection,
    });
  }

  return result;
}
