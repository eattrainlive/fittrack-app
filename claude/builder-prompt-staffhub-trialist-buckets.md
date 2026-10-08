# Builder brief — Staff Hub Trialists: stage buckets + auto-move + manual move

Upgrade ONLY the **Trialists** tab inside `src/components/StaffHubCallLists.tsx` (leave Reach out and
Win back exactly as they are). Turn the flat trialist list into a small pipeline with stage buckets
that mostly fill themselves, and let a coach move a card by hand when needed.

## Use the hook I've added — don't fetch or compute stages yourself
`src/lib/trialStages.ts` already does the data join and the stage logic. Import and use it:

```ts
import {
  useTrialStages,
  TRIAL_STAGE_ORDER,     // ["to_contact","booked_review","joined","not_joined"]
  TRIAL_STAGE_LABELS,    // { to_contact:"To contact", booked_review:"Booked review", joined:"Joined", not_joined:"Not joined" }
  type TrialStage,
  type EnrichedTrialist,
} from "@/lib/trialStages";
```

In `TrialistList`, call the hook with the proxy list and the signed-in coach name (reuse the
existing `staffName()` helper already in this file):

```ts
const { byStage, loading, setStage } = useTrialStages(list, staffName());
```

`byStage` is `Record<TrialStage, EnrichedTrialist[]>` — the trialists already grouped. Each
`EnrichedTrialist` has everything the current card uses (`first,last,email,trial,category,finishes`)
PLUS: `name`, `effectiveStage`, `autoStage`, `manualStage`, `converted`, `convertedProduct`,
`reviewAt`, `stageLocked`.

## How the stages work (so you render the right hints — don't re-implement)
- **Joined** = they bought a membership (`converted` true). This is automatic and **locked** —
  `stageLocked` is true, so the move control must be disabled for these. Show `convertedProduct` if
  present (e.g. "→ Premium PT"), else "Membership bought". These are the win — this is why Michelle
  Purdy moves here on her own once her membership webhook fires, even though she's still on the sheet.
- **Booked review** = they have a live review booked (automatic). Show the time from `reviewAt`
  ("Review Fri 10 Oct, 18:00") when present.
- **To contact** = still chasing (the default). Keep the existing **Finishes {date}** line and the
  **Finishing / overdue** (red) and **Soon** (amber) chips here — an overdue trial is the hottest
  call, so these stay in To contact, not Not joined.
- **Not joined** = only ever set by hand (a coach decides they're not continuing).

A card's bucket is `effectiveStage`. Don't compute it — just read it and render into `byStage`.

## Layout (phone-first)
Under the existing Trialists/Reach out/Win back tabs, when Trialists is active show a **second row of
stage pills**, each with a count, in `TRIAL_STAGE_ORDER`:

`[ To contact 24 ] [ Booked review 6 ] [ Joined 5 ] [ Not joined 2 ]`

- Default selected pill: **To contact**.
- Selecting a pill shows that stage's cards (same card design you already built — `CardShell` with
  name, trial · category, the stage-appropriate hint above, email button, and **Log outcome**).
- Each stage shows a friendly empty state when it has none ("Nobody here yet").
- Counts come from `byStage[stage].length`. The main "Trialists" tab badge stays the total (all
  stages) — leave it as `trialists?.length`.

While `loading` is true, show a small "Loading pipeline…" line (the proxy list may already be there;
this is just the Supabase enrichment settling).

## The manual move control (auto-move + override)
On every card add a small **Move** control (a dropdown / popover menu — use the existing
`DropdownMenu` from `@/components/ui/dropdown-menu`, or a compact Select):
- Lists the four stages (`TRIAL_STAGE_ORDER`, labels from `TRIAL_STAGE_LABELS`), with the card's
  current `effectiveStage` marked/checked.
- On choosing a different stage, call `await setStage(card, stage)`.
  - On success: toast "Moved to {label}". The hook updates the grouping optimistically, so the card
    will hop to the other pill's bucket on its own — you don't move it manually in React state.
  - On failure (returns false / throws): toast "Couldn't move — try again".
- If `stageLocked` is true (converted/Joined), **disable** the control and show a tiny lock hint
  ("Membership confirmed") — a real purchase can't be overridden by hand.

Moving a card also writes to the Actions log automatically (the hook does this) — so you do NOT need
to also open the Log outcome sheet on a move. "Log outcome" stays as the separate call-note action.

## Rules
- No Supabase calls, no stage maths, no date maths for stages in the component — all of that is in
  `useTrialStages`. The only client date logic stays the existing finish-date chip (overdue/soon).
- Don't touch Reach out / Win back, the proxy lib, or any backend.
- Keep names/emails on-screen only; the hook handles any logging.

## Acceptance
- Trialists tab shows four stage pills with live counts; To contact is the default view.
- Joined fills automatically from memberships (locked, shows product); Booked review fills from booked
  reviews (shows time); To contact keeps the finish-date + overdue/soon chips; Not joined is manual.
- A coach can move any non-converted card between stages; it persists, logs, and the card re-buckets.
- Converted cards can't be moved (control disabled).
- Empty stages show a friendly message; enrichment loading shows a brief line.

---

## Appendix A — create `src/lib/trialStages.ts` EXACTLY as below
This is the hook the screen imports. Create the file with this exact content (do not edit it);
it is also in the repo, so keeping it identical means the merge stays clean.

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { logStaffActions, type Trialist } from "./staffHubMetrics";

/**
 * Trialist pipeline stages for the Staff Hub "Trialists" call list.
 *
 * Cards AUTO-bucket from live data:
 *   - trial_cohort.converted = true            -> "joined"        (ground truth)
 *   - review_bookings booked/completed & live  -> "booked_review"
 *   - otherwise                                -> "to_contact"    (still chasing)
 * A coach can MOVE a card by hand (stored in staff_trial_stage); the manual
 * choice wins — EXCEPT a confirmed paid membership (converted) always shows as
 * "joined". "not_joined" is only ever set by hand (we never auto-bin a trialist
 * just because their trial end date has passed — an overdue trial is the hottest
 * call, not a lost one).
 */
export type TrialStage = "to_contact" | "booked_review" | "joined" | "not_joined";

export const TRIAL_STAGE_ORDER: TrialStage[] = [
  "to_contact",
  "booked_review",
  "joined",
  "not_joined",
];

export const TRIAL_STAGE_LABELS: Record<TrialStage, string> = {
  to_contact: "To contact",
  booked_review: "Booked review",
  joined: "Joined",
  not_joined: "Not joined",
};

export interface EnrichedTrialist extends Trialist {
  key: string; // normalised email
  name: string; // "First Last"
  autoStage: TrialStage; // computed from live data
  manualStage: TrialStage | null; // coach override, if any
  effectiveStage: TrialStage; // what to display/group by
  converted: boolean; // confirmed paid membership
  convertedProduct: string | null;
  reviewAt: string | null; // booked review time, if any
  stageLocked: boolean; // true when converted forces "joined" (can't override)
}

const emailKey = (e?: string | null) =>
  String(e || "")
    .toLowerCase()
    .trim();

interface CohortRow {
  email: string;
  converted: boolean | null;
  converted_product: string | null;
}
interface ReviewRow {
  email: string;
  status: string | null;
  appointment_at: string | null;
}
interface StageRow {
  email: string;
  stage: TrialStage;
}

function computeAutoStage(
  converted: boolean,
  liveReview: boolean,
): TrialStage {
  if (converted) return "joined";
  if (liveReview) return "booked_review";
  return "to_contact";
}

/**
 * Joins the proxy trialists to Supabase (trial_cohort / review_bookings /
 * staff_trial_stage), computes each card's stage, and groups by stage.
 * Returns a `setStage` to move a card by hand (persists + logs an action).
 */
export function useTrialStages(
  trialists: Trialist[] | undefined,
  staffName: string,
) {
  const [cohort, setCohort] = useState<Record<string, CohortRow>>({});
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [overrides, setOverrides] = useState<Record<string, TrialStage>>({});
  const [loading, setLoading] = useState(true);

  const loadSupabase = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cRows }, { data: rRows }, { data: sRows }] =
        await Promise.all([
          supabase
            .from("trial_cohort")
            .select("email,converted,converted_product"),
          supabase
            .from("review_bookings")
            .select("email,status,appointment_at"),
          supabase.from("staff_trial_stage").select("email,stage"),
        ]);
      const cmap: Record<string, CohortRow> = {};
      for (const r of (cRows || []) as CohortRow[]) {
        const k = emailKey(r.email);
        if (k) cmap[k] = r;
      }
      const rmap: Record<string, ReviewRow> = {};
      for (const r of (rRows || []) as ReviewRow[]) {
        const k = emailKey(r.email);
        if (k) rmap[k] = r;
      }
      const omap: Record<string, TrialStage> = {};
      for (const r of (sRows || []) as StageRow[]) {
        const k = emailKey(r.email);
        if (k) omap[k] = r.stage;
      }
      setCohort(cmap);
      setReviews(rmap);
      setOverrides(omap);
    } catch {
      // tables may be unreadable (non-staff / RLS) — soft-fail to auto "to_contact"
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupabase();
  }, [loadSupabase]);

  const enriched: EnrichedTrialist[] = useMemo(() => {
    const now = Date.now();
    return (trialists ?? []).map((t) => {
      const key = emailKey(t.email);
      const c = cohort[key];
      const converted = c?.converted === true;
      const r = reviews[key];
      const status = String(r?.status || "")
        .toLowerCase()
        .trim();
      const liveReview =
        !!r &&
        (status === "booked" || status === "completed") &&
        (!r.appointment_at || new Date(r.appointment_at).getTime() >= now);
      const autoStage = computeAutoStage(converted, liveReview);
      const manualStage = overrides[key] ?? null;
      // Converted is ground truth: always "joined", override ignored & locked.
      const effectiveStage: TrialStage = converted
        ? "joined"
        : (manualStage ?? autoStage);
      return {
        ...t,
        key,
        name: `${t.first ?? ""} ${t.last ?? ""}`.trim() || t.email,
        autoStage,
        manualStage,
        effectiveStage,
        converted,
        convertedProduct: c?.converted_product ?? null,
        reviewAt: r?.appointment_at ?? null,
        stageLocked: converted,
      };
    });
  }, [trialists, cohort, reviews, overrides]);

  const byStage = useMemo(() => {
    const groups: Record<TrialStage, EnrichedTrialist[]> = {
      to_contact: [],
      booked_review: [],
      joined: [],
      not_joined: [],
    };
    for (const e of enriched) groups[e.effectiveStage].push(e);
    return groups;
  }, [enriched]);

  /**
   * Move a trialist to a stage by hand. Persists the override, updates the UI
   * optimistically, and logs an action so the move shows in the history.
   * No-op for a converted (locked) card.
   */
  const setStage = useCallback(
    async (t: EnrichedTrialist, stage: TrialStage) => {
      if (t.stageLocked || stage === t.effectiveStage) return;
      setOverrides((prev) => ({ ...prev, [t.key]: stage })); // optimistic
      try {
        const { error } = await supabase.from("staff_trial_stage").upsert(
          {
            email: t.email,
            stage,
            moved_by: staffName || "Staff",
            moved_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );
        if (error) throw error;
        // Record the move in the append-only log (best-effort).
        logStaffActions([
          {
            type: "trialist",
            who: t.name,
            email: t.email,
            outcome: `Moved to ${TRIAL_STAGE_LABELS[stage]}`,
            by: staffName || "Staff",
          },
        ]).catch(() => {});
        return true;
      } catch {
        // Roll back the optimistic move on failure.
        setOverrides((prev) => {
          const next = { ...prev };
          if (t.manualStage) next[t.key] = t.manualStage;
          else delete next[t.key];
          return next;
        });
        return false;
      }
    },
    [staffName],
  );

  return { byStage, enriched, loading, setStage, reload: loadSupabase };
}
```
