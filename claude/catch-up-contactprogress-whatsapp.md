# Catch-up prompt — paste into the builder

Small change to `src/lib/contactProgress.ts` so the "Send WhatsApp" step fires our GHL workflow.
Apply it in the builder so a future export keeps it (no screen changes needed).

**1) Add this helper near the top of the file (just after the `emailKey` const):**

```ts
/** Fire the GHL reach-out WhatsApp workflow via our Netlify proxy (URL stays server-side). */
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

**2) In `logContact`, change the `whatsapp` branch so it fires GHL first and only marks sent if GHL
accepted it.** Replace:

```ts
      } else if (args.kind === "whatsapp") {
        whatsappSent = true;
        if (status === "todo") status = "in_progress";
        outcomeLabel = "WhatsApp sent";
      } else {
```

with:

```ts
      } else if (args.kind === "whatsapp") {
        // Fire the GHL workflow first; only record "sent" if GHL accepted it.
        const fired = await fireWhatsAppTrigger(c, listType, staffName || "Staff");
        if (!fired) return false;
        whatsappSent = true;
        if (status === "todo") status = "in_progress";
        outcomeLabel = "WhatsApp sent";
      } else {
```

Nothing else changes — the "Send WhatsApp" button already calls `logContact({ kind: "whatsapp" })`.
