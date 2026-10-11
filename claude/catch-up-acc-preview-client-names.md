# Catch-up prompt — paste into the builder (preview client dropdown showed an id, not a name)

**Bug:** In the accountability Preview tab, with Data source = Real client, the client dropdown showed
the raw `user_id` (e.g. `15a570f0… · Onboarded`) instead of the member's name. `acc_clients` only stores
`user_id`, so the name has to be resolved from `members` (same as the coach console does).

**File:** `src/components/AccountabilityPreview.tsx`

**Fix (applied):**
1. `import { supabase } from "@/lib/supabase";`
2. New state: `const [names, setNames] = useState<Record<string, string>>({});`
3. In `load()`, after `setClients(cs)`, resolve names for the cohort's clients:
```ts
const uids = cs.map((x) => x.user_id).filter(Boolean);
if (uids.length) {
  const { data: mem } = await supabase
    .from("members")
    .select("id, full_name, email")
    .in("id", uids);
  const map: Record<string, string> = {};
  for (const m of (mem as any[]) ?? []) {
    map[m.id] = m.full_name || m.email?.split("@")[0] || "";
  }
  setNames(map);
}
```
4. In the client `SelectItem`, use the name with the id as fallback:
```tsx
{names[c.user_id] || `${c.user_id.slice(0, 8)}…`} ·{" "}
{c.onboarding_done ? "Onboarded" : "Pending"}
```

No schema change (`members.id` == auth uid; staff can read `members`).
