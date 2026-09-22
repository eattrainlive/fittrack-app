/**
 * Cleans the shared exercise library before writing it to the local cache.
 *
 * The library is read-by-all (RLS allows any authenticated user to read every
 * row), so multiple accounts may hold copies of the same exercise. We de-dupe
 * by id (keeping the first per id) and drop soft-deleted rows so members always
 * get a clean, current library — including tracking/tag corrections.
 */
export const cleanExercises = (rows: any[] | null): any[] => {
  const active = (rows || []).filter((e: any) => e.is_deleted !== true);
  const byId = new Map<string, any>();
  for (const e of active)
    if (!byId.has(String(e.id))) byId.set(String(e.id), e);
  return [...byId.values()];
};
