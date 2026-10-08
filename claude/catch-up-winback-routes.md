# Catch-up prompt — paste into the builder (win-back routes)

Adds win-back routing (Gym vs Coached) so the right offer fires. Two files. Apply in the builder so a
future export keeps it. (This supersedes the earlier WhatsApp catch-up — the `fireWhatsAppTrigger`
below is the full current version.)

## 1) `src/lib/contactProgress.ts`

**a. Add this block just above the `fireWhatsAppTrigger` function (after the `emailKey` const):**

```ts
/**
 * Win-back route from the old membership. "coached" = Classes / PT / Group PT;
 * "gym" = Gym / Core+ and everything else. Drives which offer GHL sends.
 */
export type WinbackRoute = "gym" | "coached";
export const WINBACK_ROUTE_LABELS: Record<WinbackRoute, string> = {
  gym: "Gym route",
  coached: "Coached route",
};
export function winbackRoute(
  membership?: string | null,
  category?: string | null,
): WinbackRoute {
  const s = `${membership ?? ""} ${category ?? ""}`.toLowerCase();
  if (/\bpt\b|personal|class|team training|group/.test(s)) return "coached";
  return "gym"; // gym, core+, anything else
}
```

**b. Make `fireWhatsAppTrigger` exactly this (replace the existing one, or add it if missing):**

```ts
async function fireWhatsAppTrigger<M extends ContactMember>(
  c: EnrichedContact<M>,
  listType: ListType,
  by: string,
): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const m = c.member as unknown as {
      membership?: string | null;
      category?: string | null;
    };
    const route =
      listType === "lapsed" ? winbackRoute(m.membership, m.category) : undefined;
    const res = await fetch("/.netlify/functions/staffhub-whatsapp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: c.member.email,
        first: c.member.first,
        last: c.member.last,
        name: c.name,
        list_type: listType,
        route,
        membership: m.membership ?? null,
        category: m.category ?? null,
        by,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.ok !== false;
  } catch {
    return false;
  }
}
```

**c. Ensure the `whatsapp` branch of `logContact` fires it (should already be there):**

```ts
      } else if (args.kind === "whatsapp") {
        const fired = await fireWhatsAppTrigger(c, listType, staffName || "Staff");
        if (!fired) return false;
        whatsappSent = true;
        if (status === "todo") status = "in_progress";
        outcomeLabel = "WhatsApp sent";
      } else {
```

## 2) `src/components/StaffHubCallLists.tsx`

**a. Add to the `@/lib/contactProgress` import:**
```ts
  winbackRoute,
  WINBACK_ROUTE_LABELS,
```

**b. In `LapsedList`'s `renderInfo`, add the route badge + offer line right after the window/£/cancelled
row (before the `{m.stage}` line):**

```tsx
          {(() => {
            const route = winbackRoute(m.membership, m.category);
            const offer =
              route === "coached"
                ? "Free goal-reset + 4-week kickstart (or ease back on gym access)"
                : "2 weeks free, then restart";
            return (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    route === "coached"
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  }`}
                >
                  {WINBACK_ROUTE_LABELS[route]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Offer: {offer}
                </span>
              </div>
            );
          })()}
```

Nothing else changes.
