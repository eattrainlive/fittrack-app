/**
 * Skip-section logic for the active workout view.
 *
 * A "skipped section" is one the member chose not to log (e.g. a conditioning
 * finisher they're not doing today). Skipped sections are:
 *  - excluded from the saved workout / volume totals / PB detection
 *  - passed over during live-logger navigation (next/prev)
 *
 * Sections are identified by their section-header exercise `id` (the same id
 * `blocks[i].section.id` exposes).
 */

/**
 * Build the set of block indices that should be skipped during navigation,
 * combining pickOne un-chosen options AND explicitly skipped sections.
 */
export function skippedBlockIndices(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
): Set<number> {
  const skipped = new Set<number>();
  blocks.forEach((b, i) => {
    const sectionId = b.section?.id;
    if (sectionId != null && skippedSectionIds.has(sectionId)) {
      skipped.add(i);
    }
  });
  return skipped;
}

/**
 * Next non-skipped block index after `from` (exclusive), or null if none.
 * Respects both pickOne choices and explicit section skips.
 */
export function nextVisibleBlockEx(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  from: number,
): number | null {
  const skipped = skippedBlockIndices(
    blocks,
    pickOneChoices,
    skippedSectionIds,
  );
  for (let i = from + 1; i < blocks.length; i++) {
    if (!skipped.has(i)) return i;
  }
  return null;
}

/**
 * Previous non-skipped block index before `from` (exclusive), or null.
 */
export function prevVisibleBlockEx(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  from: number,
): number | null {
  const skipped = skippedBlockIndices(
    blocks,
    pickOneChoices,
    skippedSectionIds,
  );
  for (let i = from - 1; i >= 0; i--) {
    if (!skipped.has(i)) return i;
  }
  return null;
}

/**
 * Total number of non-skipped blocks.
 */
export function visibleBlockCountEx(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
): number {
  const skipped = skippedBlockIndices(
    blocks,
    pickOneChoices,
    skippedSectionIds,
  );
  return blocks.filter((_, i) => !skipped.has(i)).length;
}

/**
 * The 1-based position of `blockIndex` among visible (non-skipped) blocks.
 */
export function visibleBlockPositionEx(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  blockIndex: number,
): number {
  const skipped = skippedBlockIndices(
    blocks,
    pickOneChoices,
    skippedSectionIds,
  );
  let pos = 0;
  for (let i = 0; i <= blockIndex; i++) {
    if (!skipped.has(i)) pos++;
  }
  return pos;
}

/**
 * Given the flat exercises array and the set of skipped section ids, return a
 * Set of exercise ids that belong to skipped sections (so they can be dropped
 * at save time). Section headers themselves are also included.
 */
export function skippedExerciseIds(
  exercises: any[],
  skippedSectionIds: Set<string | number>,
): Set<string | number> {
  const result = new Set<string | number>();
  let skipping = false;
  for (const ex of exercises) {
    if (ex.isSection) {
      skipping = ex.id != null && skippedSectionIds.has(ex.id);
      if (skipping) result.add(ex.id);
    } else if (skipping) {
      result.add(ex.id);
    }
  }
  return result;
}
