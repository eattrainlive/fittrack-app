/**
 * pickOne block helpers for the active-session view.
 *
 * The session is a flat `exercises` array. `blocks` (built in Workouts.tsx)
 * splits it into blocks by `linkedToNext` runs. A `pickOne` section's
 * superset pairs therefore become CONSECUTIVE blocks that share the same
 * `section` object. These helpers identify those option blocks so the UI
 * can let the member choose one and only log/save the chosen option.
 */

export type PickOneOption = {
  /** Index within the full `blocks` array. */
  blockIndex: number;
  /** First exercise name (resolved against the library by the caller). */
  label: string;
  /** The block's exercises. */
  exercises: any[];
};

/**
 * If `block` belongs to a `pickOne` section, return every block that shares
 * that section (the selectable options), in order. Otherwise return null.
 */
export function pickOneOptionsForBlock(
  blocks: any[],
  blockIndex: number,
): PickOneOption[] | null {
  const block = blocks[blockIndex];
  if (!block?.section?.pickOne) return null;
  const sectionId = block.section.id;
  const options: PickOneOption[] = [];
  blocks.forEach((b, i) => {
    if (b.section?.id === sectionId && b.section?.pickOne) {
      const firstEx = b.exercises?.[0];
      options.push({
        blockIndex: i,
        label: firstEx?.name
          ? String(firstEx.name)
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())
          : `Option ${options.length + 1}`,
        exercises: b.exercises || [],
      });
    }
  });
  return options.length > 1 ? options : null;
}

/**
 * Block indices that should be SKIPPED for navigation/completion because they
 * belong to an un-chosen option of a pickOne section. Returns a Set of block
 * indices.
 */
export function skippedPickOneBlocks(
  blocks: any[],
  choices: Record<string, number | null>,
): Set<number> {
  const skipped = new Set<number>();
  // group block indices by pickOne section id
  const groups = new Map<string, number[]>();
  blocks.forEach((b, i) => {
    if (!b.section?.pickOne) return;
    const id = b.section.id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(i);
  });
  for (const [id, idxs] of groups) {
    const chosen = choices[id];
    if (chosen == null) continue; // no choice yet → don't skip (they haven't started)
    idxs.forEach((bi, oi) => {
      if (oi !== chosen) skipped.add(bi);
    });
  }
  return skipped;
}

/**
 * Next non-skipped block index after `from` (exclusive), or null if none.
 */
export function nextVisibleBlock(
  blocks: any[],
  choices: Record<string, number | null>,
  from: number,
): number | null {
  const skipped = skippedPickOneBlocks(blocks, choices);
  for (let i = from + 1; i < blocks.length; i++) {
    if (!skipped.has(i)) return i;
  }
  return null;
}

/**
 * Previous non-skipped block index before `from` (exclusive), or null.
 */
export function prevVisibleBlock(
  blocks: any[],
  choices: Record<string, number | null>,
  from: number,
): number | null {
  const skipped = skippedPickOneBlocks(blocks, choices);
  for (let i = from - 1; i >= 0; i--) {
    if (!skipped.has(i)) return i;
  }
  return null;
}

/**
 * Total number of non-skipped blocks (for the "X of Y" progress display).
 */
export function visibleBlockCount(
  blocks: any[],
  choices: Record<string, number | null>,
): number {
  const skipped = skippedPickOneBlocks(blocks, choices);
  return blocks.filter((_, i) => !skipped.has(i)).length;
}

/**
 * The 1-based position of `blockIndex` among visible (non-skipped) blocks.
 */
export function visibleBlockPosition(
  blocks: any[],
  choices: Record<string, number | null>,
  blockIndex: number,
): number {
  const skipped = skippedPickOneBlocks(blocks, choices);
  let pos = 0;
  for (let i = 0; i <= blockIndex; i++) {
    if (!skipped.has(i)) pos++;
  }
  return pos;
}
