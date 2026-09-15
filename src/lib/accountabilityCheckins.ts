import { supabase } from "./supabase";

export interface AccCheckin {
  id: string;
  client_id: string;
  user_id: string;
  cohort_id: string;
  week_number: number;
  responses: Record<string, any>;
  avg_weight: number | null;
  avg_steps: number | null;
  submitted_at: string;
  created_at?: string;
  // Coach reply fields (Phase 2)
  coach_reply_format?: string | null;
  coach_reply_note?: string | null;
  coach_reply_loom_url?: string | null;
  coach_replied_at?: string | null;
  coach_user_id?: string | null;
  flagged?: boolean;
}

export interface CheckinPayload {
  clientId: string;
  userId: string;
  cohortId: string;
  weekNumber: number;
  responses: Record<string, any>;
  avgWeight?: number | null;
  avgSteps?: number | null;
}

/** Client: save (upsert) a weekly/final check-in. */
export const saveCheckin = async (
  payload: CheckinPayload,
): Promise<{ error: any }> => {
  const { error } = await supabase.from("acc_checkins").upsert(
    {
      client_id: payload.clientId,
      user_id: payload.userId,
      cohort_id: payload.cohortId,
      week_number: payload.weekNumber,
      responses: payload.responses,
      avg_weight: payload.avgWeight ?? null,
      avg_steps: payload.avgSteps ?? null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_number" },
  );
  return { error };
};

/** Client: get their own check-in for a given week (if submitted). */
export const getMyCheckin = async (
  clientId: string,
  week: number,
): Promise<AccCheckin | null> => {
  try {
    const { data } = await supabase
      .from("acc_checkins")
      .select("*")
      .eq("client_id", clientId)
      .eq("week_number", week)
      .maybeSingle();
    return (data as AccCheckin) ?? null;
  } catch {
    return null;
  }
};

/** Client: all their check-ins (for the timeline). */
export const getMyCheckins = async (
  clientId: string,
): Promise<AccCheckin[]> => {
  try {
    const { data } = await supabase
      .from("acc_checkins")
      .select("*")
      .eq("client_id", clientId)
      .order("week_number", { ascending: true });
    return (data as AccCheckin[]) ?? [];
  } catch {
    return [];
  }
};

export interface FinalOutcome {
  results?: Record<string, any>;
  maintenanceTier?: string | null;
  resignOutcome?: string | null;
}

/** Client: write Week-6 outcome fields to acc_clients. */
export const saveFinalOutcome = async (
  clientId: string,
  outcome: FinalOutcome,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({
      results: outcome.results ?? {},
      maintenance_tier: outcome.maintenanceTier ?? null,
      resign_outcome: outcome.resignOutcome ?? null,
    })
    .eq("id", clientId);
  return { error };
};

/** Staff: get all check-ins for a client. */
export const getClientCheckins = async (
  clientId: string,
): Promise<AccCheckin[]> => {
  try {
    const { data } = await supabase
      .from("acc_checkins")
      .select("*")
      .eq("client_id", clientId)
      .order("week_number", { ascending: true });
    return (data as AccCheckin[]) ?? [];
  } catch {
    return [];
  }
};

export interface ReplyPayload {
  checkinId: string;
  format: string;
  note?: string | null;
  loomUrl?: string | null;
  flagged?: boolean;
}

/** Staff: log a coach reply to a check-in. */
export const replyToCheckin = async (
  payload: ReplyPayload,
): Promise<{ error: any }> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("acc_checkins")
    .update({
      coach_reply_format: payload.format,
      coach_reply_note: payload.note ?? null,
      coach_reply_loom_url: payload.loomUrl ?? null,
      flagged: !!payload.flagged,
      coach_replied_at: new Date().toISOString(),
      coach_user_id: user?.id ?? null,
    })
    .eq("id", payload.checkinId);
  return { error };
};

export interface AccFollowup {
  id: string;
  client_id: string;
  created_by: string | null;
  note: string;
  created_at: string;
  closed_at: string | null;
}

/** Staff: add a follow-up for a client. */
export const addFollowup = async (
  clientId: string,
  note: string,
): Promise<{ error: any }> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("acc_followups").insert({
    client_id: clientId,
    note: note.trim(),
    created_by: user?.id ?? null,
  });
  return { error };
};

/** Staff: close a follow-up. */
export const closeFollowup = async (
  followupId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_followups")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", followupId);
  return { error };
};

/** Staff: open + recent follow-ups for a client. */
export const getClientFollowups = async (
  clientId: string,
): Promise<AccFollowup[]> => {
  try {
    const { data } = await supabase
      .from("acc_followups")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data as AccFollowup[]) ?? [];
  } catch {
    return [];
  }
};

/** Staff: all check-ins for a cohort (for the inbox). */
export const getCohortCheckins = async (
  cohortId: string,
): Promise<AccCheckin[]> => {
  try {
    const { data } = await supabase
      .from("acc_checkins")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("submitted_at", { ascending: false });
    return (data as AccCheckin[]) ?? [];
  } catch {
    return [];
  }
};
