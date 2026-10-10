# Catch-up prompt — paste into the builder (roster: approach change needs refresh)

**Bug:** In the accountability roster, changing a client's nutrition approach (Plate ⇄ Tracking) saves to
the DB but the dropdown doesn't update until you manually refresh the page. Assigning a coach updates
instantly — the difference is that `handleAssign` calls `reload()` on success and `handleApproach` does
not.

**File:** `src/components/AccRosterTab.tsx`

**Fix:** In `handleApproach`, reload on success (and show a confirmation toast) so it behaves like the
other handlers:

```ts
const handleApproach = async (clientId: string, approach: string) => {
  const { error } = await setNutritionApproach(clientId, approach);
  if (error) toast.error("Couldn't save approach");
  else {
    toast.success("Approach updated");
    reload();
  }
};
```

That's the whole change — no schema, no other files.
