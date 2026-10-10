# Catch-up prompt — paste into the builder (accountability roster fixes)

Three fixes to the accountability coach panel / roster. Each was querying or saving against a
column/constraint that doesn't match the DB. Apply all three so a future export keeps them.

## 1. `src/lib/accountabilityProgramme.ts` — roster was empty
`acc_clients` has no `created_at` column (it has `enrolled_at`), so ordering by `created_at` errored and
returned no clients. In `getCohortClients`:
```ts
const { data, error } = await supabase
  .from("acc_clients")
  .select("*")
  .eq("cohort_id", cohortId)
  .order("enrolled_at", { ascending: true });
if (error) console.warn("getCohortClients error", error);
return (data as AccClient[]) ?? [];
```

## 2. `src/components/AccountabilityCoachPanel.tsx` — coach dropdown was empty
`staff_users` has only `user_id` + `note` (NO `email`), so `.select("user_id, email")` errored and no
coaches loaded. Change the load to select only `user_id` (names come from `members` below):
```ts
const [cs, { data: staffRows, error: staffErr }] = await Promise.all([
  getCohortClients(c.id),
  supabase.from("staff_users").select("user_id"),
]);
if (staffErr) console.warn("staff_users load error", staffErr);
setClients(cs);
const staffRows2 = (staffRows as any[]) ?? [];
const staffWithEmails = staffRows2.map((s) => ({
  user_id: s.user_id,
  email: "",
  name: "Coach",
}));
```
(Keep the existing `members` enrichment block that follows — it sets each coach's name from
`full_name`.)

## 3. `src/components/AccRosterTab.tsx` — nutrition approach wouldn't save
`acc_clients.nutrition_approach` is constrained to `'plate' | 'tracking'`, but the control was a
free-text `Input`, so any other text failed the DB check. Replace the `Input` with a Select (and
remove the now-unused `Input` import):
```tsx
<Select
  value={c.nutrition_approach || "plate"}
  onValueChange={(v) => handleApproach(c.id, v)}
>
  <SelectTrigger className="w-40 h-9">
    <SelectValue placeholder="Approach" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="plate">Plate</SelectItem>
    <SelectItem value="tracking">Tracking</SelectItem>
  </SelectContent>
</Select>
```

## 4. Dashboard measurements never loaded (`AccountabilityDashboard.tsx` + `src/lib/accPreviewData.ts`)
`member_measurements` uses `member_id` (not `user_id`) and has a `date` column (no `created_at`).
Fix the query in BOTH files:
```ts
.from("member_measurements")
.select("*")
.eq("member_id", <uid>)
.order("date", { ascending: false })
.limit(1)
```
