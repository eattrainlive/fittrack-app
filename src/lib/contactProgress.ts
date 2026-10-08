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
  "todo" | "in_progress" | "done" | "joined" | "not_interested";

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
    {
      key: "not_interested",
      label: "Not interested",
      status: "not_interested",
    },
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

/**
 * Ask the Netlify proxy to fire the GHL "reach-out WhatsApp" workflow for this
 * person. The GHL webhook URL lives server-side; we only send name/email + list.
 * Returns true only if GHL accepted it (so we don't mark "WhatsApp sent" on a
 * failed fire).
 */
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
        // Fire the GHL workflow first; only record "sent" if GHL accepted it.
        const fired = await fireWhatsAppTrigger(c, listType, staffName || "Staff");
        if (!fired) return false;
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

  return {
    enriched,
    byBucket,
    buckets: BUCKETS_BY_LIST[listType],
    loading,
    logContact,
    reload: load,
  };
}
