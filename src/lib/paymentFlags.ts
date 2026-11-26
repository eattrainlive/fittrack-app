// Payment issues — the Staff Hub panel that surfaces failed payments and
// cancelled Direct Debit mandates so Carla can follow each one up and none slip
// through. Flags are raised by the GymOS webhook (gymos-webhook) and can also be
// added manually. The one-tap follow-up fires the same GHL WhatsApp pipe the call
// lists use (staffhub-whatsapp proxy), with list_type = the issue type.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type IssueType = "payment_failed" | "mandate_cancelled";
export type FlagStatus = "open" | "resolved";

export interface PaymentFlag {
  id: number;
  member_ref: string | null;
  email: string | null;
  full_name: string | null;
  issue_type: IssueType;
  amount: number | null;
  source: "gymos" | "manual";
  status: FlagStatus;
  whatsapp_sent: boolean;
  last_outcome: string | null;
  note: string | null;
  owner: string | null;
  last_event_ts: string;
  first_seen: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface IssueTemplate {
  key: IssueType;
  label: string;        // short badge label
  tone: "red" | "amber";
  templateKey: string;  // the approved GHL WhatsApp template this maps to
  // Message copy Carla sees as a preview (and can copy as a fallback).
  message: (name: string) => string;
  blurb: string;        // one-line description of the situation
}

const firstName = (full?: string | null) =>
  (full || "").trim().split(/\s+/)[0] || "there";

export const ISSUE_TEMPLATES: Record<IssueType, IssueTemplate> = {
  payment_failed: {
    key: "payment_failed",
    label: "Payment failed",
    tone: "red",
    templateKey: "payment_failed_followup",
    blurb: "An automated membership payment didn't go through.",
    message: (name) =>
      `Hi ${firstName(name)}, it's the team at ETL 👋 We noticed your latest membership ` +
      `payment didn't go through — these things usually just bounce (an expired card or a ` +
      `one-off bank hiccup). No stress at all. Could you reply here and we'll get it sorted ` +
      `in a couple of minutes so there's no break in your membership? 💪`,
  },
  mandate_cancelled: {
    key: "mandate_cancelled",
    label: "Mandate cancelled",
    tone: "amber",
    templateKey: "mandate_cancelled_followup",
    blurb: "The member's Direct Debit mandate has been cancelled.",
    message: (name) =>
      `Hi ${firstName(name)}, it's the team at ETL 👋 It looks like your Direct Debit for ` +
      `your membership has been cancelled. If that wasn't on purpose, no worries — we can set ` +
      `a new one up in two minutes so nothing's interrupted. If you did mean to, could you give ` +
      `me a quick reply so we can chat it through? We'd love to keep you with us. 🙌`,
  },
};

const nameParts = (full?: string | null) => {
  const p = (full || "").trim().split(/\s+/);
  return { first: p[0] || "", last: p.slice(1).join(" ") || "" };
};

export function usePaymentFlags() {
  const [open, setOpen] = useState<PaymentFlag[]>([]);
  const [resolved, setResolved] = useState<PaymentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("payment_flags")
        .select("*")
        .order("last_event_ts", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as PaymentFlag[];
      setOpen(rows.filter((r) => r.status === "open"));
      setResolved(rows.filter((r) => r.status === "resolved").slice(0, 50));
    } catch (e: any) {
      setError(e.message || "Couldn't load payment flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const staffName = () =>
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("fittrack_staff_name")) ||
    "Staff";

  /** Fire the follow-up WhatsApp via the existing GHL pipe, then mark sent. */
  const sendWhatsApp = useCallback(
    async (f: PaymentFlag): Promise<boolean> => {
      if (!f.email) return false;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token ?? "";
        const { first, last } = nameParts(f.full_name);
        const res = await fetch("/.netlify/functions/staffhub-whatsapp", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: f.email,
            first,
            last,
            name: f.full_name ?? `${first} ${last}`.trim(),
            list_type: f.issue_type, // payment_failed | mandate_cancelled
            by: staffName(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) return false;
      } catch {
        return false;
      }
      // Record that we've reached out.
      const outcome = "WhatsApp sent";
      setOpen((prev) =>
        prev.map((r) =>
          r.id === f.id
            ? { ...r, whatsapp_sent: true, last_outcome: outcome }
            : r,
        ),
      );
      await supabase
        .from("payment_flags")
        .update({
          whatsapp_sent: true,
          last_outcome: outcome,
          owner: staffName(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", f.id);
      return true;
    },
    [],
  );

  /** Clear a flag once the member's sorted it. */
  const markResolved = useCallback(
    async (f: PaymentFlag, note?: string): Promise<boolean> => {
      const now = new Date().toISOString();
      setOpen((prev) => prev.filter((r) => r.id !== f.id));
      setResolved((prev) => [
        { ...f, status: "resolved", resolved_at: now, resolved_by: staffName() },
        ...prev,
      ]);
      const { error } = await supabase
        .from("payment_flags")
        .update({
          status: "resolved",
          resolved_by: staffName(),
          resolved_at: now,
          note: note?.trim() || f.note || null,
          updated_at: now,
        })
        .eq("id", f.id);
      if (error) {
        reload();
        return false;
      }
      return true;
    },
    [reload],
  );

  /** Put a resolved flag back on the open list. */
  const reopen = useCallback(
    async (f: PaymentFlag): Promise<boolean> => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("payment_flags")
        .update({ status: "open", resolved_by: null, resolved_at: null, updated_at: now })
        .eq("id", f.id);
      reload();
      return !error;
    },
    [reload],
  );

  /** Manual safety-net add: staff flags a member themselves. */
  const addManualFlag = useCallback(
    async (args: {
      member_ref: string;
      email: string | null;
      full_name: string | null;
      issue_type: IssueType;
      note?: string;
    }): Promise<boolean> => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("payment_flags").upsert(
        {
          member_ref: args.member_ref,
          email: args.email,
          full_name: args.full_name,
          issue_type: args.issue_type,
          source: "manual",
          status: "open",
          whatsapp_sent: false,
          note: args.note?.trim() || null,
          owner: staffName(),
          last_event_ts: now,
          updated_at: now,
        },
        { onConflict: "member_ref,issue_type" },
      );
      if (error) return false;
      reload();
      return true;
    },
    [reload],
  );

  return {
    open,
    resolved,
    loading,
    error,
    reload,
    sendWhatsApp,
    markResolved,
    reopen,
    addManualFlag,
  };
}

/** Typeahead over the roster for the manual-add picker. */
export async function searchRosterMembers(
  q: string,
): Promise<{ id: string; email: string | null; full_name: string | null }[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from("gym_members")
    .select("id, email, full_name")
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    .limit(15);
  if (error) return [];
  return (data || []) as { id: string; email: string | null; full_name: string | null }[];
}
