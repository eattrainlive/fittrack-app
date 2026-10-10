# Catch-up prompt — paste into the builder

Small change so programme-only habits (marked `active = false` in the `habits` library, e.g. the
accountability habits) don't appear in the member habit pickers. They still resolve by id everywhere
(getHabits is unchanged) — only the self-select pickers filter them out.

Make `getHabitLibrary` in BOTH `src/lib/trialGoals.ts` and `src/lib/memberGoals.ts` filter to active
habits. Replace each existing `getHabitLibrary` with:

```ts
export const getHabitLibrary = async () => {
  try {
    const all = await getHabits();
    // Only habits members can self-select. Inactive habits (e.g. programme-only
    // accountability habits, active=false) are hidden from pickers but still
    // resolve by id elsewhere via getHabits().
    return (all || []).filter((h: any) => h?.active !== false);
  } catch {
    return [];
  }
};
```

(Keep the rest of each file as-is — `trialGoals.ts` ends with `export { saveMemberMacros };`,
`memberGoals.ts` with `export { saveMemberMacros, asInt };`.)

Nothing else changes. Do not touch `getHabits` itself or `getHabitLibraryRows` in `trialHub.ts` —
those must keep returning all habits for name resolution.
