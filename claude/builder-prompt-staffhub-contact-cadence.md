# Builder brief — Staff Hub Reach out & Win back: contact cadence + notes

Upgrade the **Reach out** and **Win back** tabs in `src/components/StaffHubCallLists.tsx` into a call
cadence you work through per person: up to 3 calls, then a WhatsApp if still no answer, a note each
time, and status buckets. Leave the **Trialists** tab (TrialistPipeline) and the proxy lib alone.

## Use the hook I've added — don't fetch, count attempts, or compute status yourself
`src/lib/contactProgress.ts` holds all the logic. Import and use it:

```ts
import {
  useContactProgress,
  STATUS_LABELS,          // { todo:"To do", in_progress:"In progress", done:"Done", joined:"Joined", not_interested:"Not interested" }
  ANSWER_OUTCOMES,        // per-list outcome chips for an answered call
  cadenceHint,            // (attempts, whatsappSent) -> "call" | "whatsapp" | "waiting"
  MAX_CALLS,              // 3
  type ListType,
  type ContactStatus,
  type EnrichedContact,
} from "@/lib/contactProgress";
import { staffName } from "@/components/staffHubShared";
```

In `ReachoutList` call `useContactProgress(list, "reachout", staffName())`; in `LapsedList` call it
with `"lapsed"`. Both return:
`{ enriched, byBucket, buckets, loading, logContact, reload }`.

- `buckets` is the ordered status list for that tab: reachout = `["todo","in_progress","done"]`,
  lapsed = `["todo","in_progress","joined","not_interested"]`.
- `byBucket[status]` is the `EnrichedContact[]` in that bucket. Each has: `member` (the original
  Reachout/Lapsed row — keep showing its existing fields), `name`, `attempts` (0–3), `whatsappSent`,
  `status`, `lastNote`, `lastOutcome`, `updatedAt`, and `next` ("call" | "whatsapp" | "waiting").

## Layout (phone-first) — same pattern as Trialists
Under the main tabs, when Reach out / Win back is active, show a **row of status pills** from
`buckets`, each with a count (`byBucket[s].length`) and `STATUS_LABELS[s]`. Default to the first
bucket (**To do**). Selecting a pill shows that bucket's cards. Empty bucket → friendly empty state.
Show a small "Loading…" line while `loading`.

## The card
Keep the existing member info you already render per list:
- Reach out: membership · category, the "{milestone}-month check-in" chip, "Joined {month year}".
- Win back: membership · category, the window chip, "£{value}/mo", "Cancelled {month year}", owner.

Then ADD, below that:

**1. Cadence tracker** — four dots/segments in a row: `Call 1 · Call 2 · Call 3 · WhatsApp`.
   - Fill the first `attempts` call dots (green/filled); fill the WhatsApp dot if `whatsappSent`.
   - Subtly highlight the next step from `next`: "call" → the next empty call dot; "whatsapp" → the
     WhatsApp dot; "waiting" → none (all done, awaiting reply).

**2. Last activity** (if `lastOutcome`): a muted line — `{lastOutcome} · {lastNote or "—"} · {updatedAt localised}`.
   e.g. "No answer (call 2) · left voicemail · Tue 14:03".

**3. Action buttons** (open the Log-contact sheet below, pre-set to the tapped action):
   - When `next === "call"`: **No answer** and **Answered**.
   - When `next === "whatsapp"` (3 calls, no reply): **Send WhatsApp** (primary) and **Answered**.
   - When `next === "waiting"` (WhatsApp already sent): **Answered** (to close them out).
   - Terminal cards (`status` is done / joined / not_interested): no action buttons — show a status
     badge instead (muted card, `opacity-70`). (Optional: a small "Reopen" that logs nothing is not
     needed — leave them closed.)

Note: there is **no phone number in this data**, so "Send WhatsApp" does NOT open wa.me — it records
that you've sent the WhatsApp (you send it from your phone / GHL as usual). Keep an email button
(`EmailButton` from staffHubShared) on the card as now.

## Log-contact sheet (notes for every touch)
Reuse the `Sheet` component. Open it from any action button, pre-set to that `kind`
(`"no_answer" | "whatsapp" | "answered"`). Contents:
- Title: the person's name + what you're logging ("No answer", "WhatsApp", "Answered").
- If `kind === "answered"`: show the outcome chips from `ANSWER_OUTCOMES[listType]` (label per chip);
  one must be picked. (reachout: Spoke – all good / Needs attention / Call back later. lapsed:
  Joined / Not interested / Call back later.)
- A **Note (optional)** textarea for all three kinds.
- Save button → `await logContact(card, { kind, outcome: pickedChip?.key, note })`.
  - Success → toast "Saved ✓", close. The hook updates optimistically, so the card re-buckets /
    advances its cadence on its own (e.g. a win-back "Joined" hops to the Joined pill).
  - Failure (returns false) → toast "Couldn't save — try again", keep the sheet open, keep the note.

## Rules
- No Supabase calls, no attempt counting, no status logic in the component — all in the hook.
- Don't touch Trialists, the proxy lib, or any backend.
- Notes/names stay on screen + go through `logContact` (which logs to the Actions tab) — nothing to
  localStorage.

## Acceptance
- Reach out shows To do / In progress / Done pills with counts; Win back shows To do / In progress /
  Joined / Not interested. Default view is To do.
- Each card shows the Call 1·2·3·WhatsApp tracker and the last activity line.
- "No answer" advances the cadence; after 3 it switches the prompt to "Send WhatsApp"; "Answered"
  opens outcome chips + note and moves the card to the right bucket.
- Every touch saves a note (optional) and a row in the Actions tab.
- Terminal cards are muted with a status badge and no action buttons.

---

## Appendix A — create `src/lib/contactProgress.ts` EXACTLY as below
This is the hook the screens import. Create the file with this exact content (do not edit it);
it is also in the repo, so keeping it identical means the merge stays clean.

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { logStaffActions } from "./staffHubMetrics";

/**
 * Contact cadence for the Staff Hub "Reach out" and "Win back" lists.
 *
 * Each person has a call cadence worked by hand: up to 3 calls, then a WhatsApp
 * if there's still no answer, with a note each time. Where they are is stored in
 * staff_contact_progress (one row per email+list); every touch is also written
 * to the append-only Actions tab (full history) via logStaffActions.
 *
 * Buckets (by status):
 *   reachout : To do -> In progress -> Done
 *   lapsed   : To do -> In progress -> Joined / Not interested
 */
export type ListType = "reachout" | "lapsed";
export type ContactStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "joined"
  | "not_interested";

export const STATUS_LABELS: Record<ContactStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  joined: "Joined",
  not_interested: "Not interested",
};

export const BUCKETS_BY_LIST: Record<ListType, ContactStatus[]> = {
  reachout: ["todo", "in_progress", "done"],
  lapsed: ["todo", "in_progress", "joined", "not_interested"],
};

/** The outcome chips shown when a call is answered (differ by list). */
export interface AnswerOutcome {
  key: string;
  label: string;
  status: ContactStatus;
}
export const ANSWER_OUTCOMES: Record<ListType, AnswerOutcome[]> = {
  reachout: [
    { key: "spoke_ok", label: "Spoke – all good", status: "done" },
    { key: "needs_attention", label: "Needs attention", status: "done" },
    { key: "call_back", label: "Call back later", status: "in_progress" },
  ],
  lapsed: [
    { key: "joined", label: "Joined", status: "joined" },
    { key: "not_interested", label: "Not interested", status: "not_interested" },
    { key: "call_back", label: "Call back later", status: "in_progress" },
  ],
};

export const MAX_CALLS = 3;

/** What the coach should do next, from the cadence state. */
export type NextStep = "call" | "whatsapp" | "waiting";
export function cadenceHint(attempts: number, whatsappSent: boolean): NextStep {
  if (attempts < MAX_CALLS) return "call";
  if (!whatsappSent) return "whatsapp";
  return "waiting";
}

export interface ContactMember {
  email: string;
  first: string;
  last: string;
}

export interface EnrichedContact<M extends ContactMember> {
  member: M;
  key: string; // normalised email
  name: string;
  attempts: number;
  whatsappSent: boolean;
  status: ContactStatus;
  lastNote: string | null;
  lastOutcome: string | null;
  updatedAt: string | null;
  next: NextStep;
}

interface ProgressRow {
  email: string;
  list_type: ListType;
  attempts: number;
  whatsapp_sent: boolean;
  status: ContactStatus;
  last_note: string | null;
  last_outcome: string | null;
  updated_at: string | null;
}

const emailKey = (e?: string | null) =>
  String(e || "")
    .toLowerCase()
    .trim();

export interface LogContactArgs {
  kind: "no_answer" | "whatsapp" | "answered";
  outcome?: string; // required for "answered": an AnswerOutcome.key
  note?: string;
}

export function useContactProgress<M extends ContactMember>(
  members: M[] | undefined,
  listType: ListType,
  staffName: string,
) {
  const [rows, setRows] = useState<Record<string, ProgressRow>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("staff_contact_progress")
        .select(
          "email,list_type,attempts,whatsapp_sent,status,last_note,last_outcome,updated_at",
        )
        .eq("list_type", listType);
      const map: Record<string, ProgressRow> = {};
      for (const r of (data || []) as ProgressRow[]) {
        const k = emailKey(r.email);
        if (k) map[k] = r;
      }
      setRows(map);
    } catch {
      // table unreadable (non-staff / RLS) — soft-fail to all "todo"
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useEffect(() => {
    load();
  }, [load]);

  const enriched: EnrichedContact<M>[] = useMemo(() => {
    return (members ?? []).map((m) => {
      const key = emailKey(m.email);
      const r = rows[key];
      const attempts = r?.attempts ?? 0;
      const whatsappSent = r?.whatsapp_sent ?? false;
      const status: ContactStatus = r?.status ?? "todo";
      return {
        member: m,
        key,
        name: `${m.first ?? ""} ${m.last ?? ""}`.trim() || m.email,
        attempts,
        whatsappSent,
        status,
        lastNote: r?.last_note ?? null,
        lastOutcome: r?.last_outcome ?? null,
        updatedAt: r?.updated_at ?? null,
        next: cadenceHint(attempts, whatsappSent),
      };
    });
  }, [members, rows]);

  const byBucket = useMemo(() => {
    const groups = {} as Record<ContactStatus, EnrichedContact<M>[]>;
    for (const s of BUCKETS_BY_LIST[listType]) groups[s] = [];
    for (const e of enriched) {
      if (!groups[e.status]) groups[e.status] = [];
      groups[e.status].push(e);
    }
    return groups;
  }, [enriched, listType]);

  /**
   * Record a contact touch: advances the cadence, upserts the row, and logs an
   * Action (history). Returns true on success, false on failure.
   */
  const logContact = useCallback(
    async (c: EnrichedContact<M>, args: LogContactArgs): Promise<boolean> => {
      const cur = rows[c.key];
      let attempts = cur?.attempts ?? 0;
      let whatsappSent = cur?.whatsapp_sent ?? false;
      let status: ContactStatus = cur?.status ?? "todo";
      let outcomeLabel = "";

      if (args.kind === "no_answer") {
        attempts = Math.min(attempts + 1, MAX_CALLS);
        if (status === "todo") status = "in_progress";
        outcomeLabel = `No answer (call ${attempts})`;
      } else if (args.kind === "whatsapp") {
        whatsappSent = true;
        if (status === "todo") status = "in_progress";
        outcomeLabel = "WhatsApp sent";
      } else {
        const ao = ANSWER_OUTCOMES[listType].find(
          (o) => o.key === args.outcome,
        );
        if (!ao) return false;
        status = ao.status;
        outcomeLabel = ao.label;
      }

      const note = args.note?.trim() || null;
      const newRow: ProgressRow = {
        email: c.member.email,
        list_type: listType,
        attempts,
        whatsapp_sent: whatsappSent,
        status,
        last_note: note ?? cur?.last_note ?? null,
        last_outcome: outcomeLabel,
        updated_at: new Date().toISOString(),
      };
      setRows((prev) => ({ ...prev, [c.key]: newRow })); // optimistic

      try {
        const { error } = await supabase.from("staff_contact_progress").upsert(
          {
            email: c.member.email,
            list_type: listType,
            attempts,
            whatsapp_sent: whatsappSent,
            status,
            last_note: newRow.last_note,
            last_outcome: outcomeLabel,
            owner: staffName || "Staff",
            updated_at: newRow.updated_at,
          },
          { onConflict: "email,list_type" },
        );
        if (error) throw error;
        logStaffActions([
          {
            type: listType,
            who: c.name,
            email: c.member.email,
            outcome: outcomeLabel,
            note: note ?? undefined,
            by: staffName || "Staff",
          },
        ]).catch(() => {});
        return true;
      } catch {
        // roll back the optimistic change
        setRows((prev) => {
          const next = { ...prev };
          if (cur) next[c.key] = cur;
          else delete next[c.key];
          return next;
        });
        return false;
      }
    },
    [rows, listType, staffName],
  );

  return { enriched, byBucket, buckets: BUCKETS_BY_LIST[listType], loading, logContact, reload: load };
}
```
