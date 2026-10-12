import { supabase } from "./supabase";

export const PARQ_VALIDITY_MONTHS = 12;

export const PARQ_QUESTIONS: { key: string; text: string }[] = [
  {
    key: "q1",
    text: "Has your doctor ever said that you have a heart condition AND that you should only do physical activity recommended by a doctor?",
  },
  {
    key: "q2",
    text: "Do you feel pain in your chest when you do physical activity?",
  },
  {
    key: "q3",
    text: "In the past month, have you had chest pain when you were not doing physical activity?",
  },
  {
    key: "q4",
    text: "Do you lose your balance because of dizziness, or do you ever lose consciousness?",
  },
  {
    key: "q5",
    text: "Do you have a bone or joint problem that could be made worse by a change in your physical activity?",
  },
  {
    key: "q6",
    text: "Is your doctor currently prescribing drugs (for example, water pills) for a blood pressure or heart condition?",
  },
  {
    key: "q7",
    text: "Do you know of any other reason why you should not do physical activity?",
  },
];

export interface ParqStatus {
  valid: boolean;
  completedAt: string | null;
  expiresAt: string | null;
  anyYes: boolean | null;
}

/** The current member's PAR-Q status (latest completion + expiry). */
export const getMyParqStatus = async (): Promise<ParqStatus> => {
  const { data } = await supabase
    .from("par_q")
    .select("completed_at, any_yes")
    .order("completed_at", { ascending: false })
    .limit(1);
  const latest = (data?.[0] as any) ?? null;
  const completedAt: string | null = latest?.completed_at ?? null;
  const anyYes: boolean | null = latest?.any_yes ?? null;
  if (!completedAt)
    return { valid: false, completedAt: null, expiresAt: null, anyYes: null };
  const exp = new Date(completedAt);
  exp.setMonth(exp.getMonth() + PARQ_VALIDITY_MONTHS);
  return {
    valid: exp.getTime() > Date.now(),
    completedAt,
    expiresAt: exp.toISOString(),
    anyYes,
  };
};

export const saveParq = async (args: {
  answers: Record<string, boolean>;
  details?: string;
  declarationName: string;
}) => {
  const anyYes = PARQ_QUESTIONS.some((q) => args.answers[q.key] === true);
  return await supabase.from("par_q").insert({
    answers: { ...args.answers, details: args.details ?? null },
    any_yes: anyYes,
    declaration_name: args.declarationName,
    agreed: true,
  });
};

/** Staff: a member's PAR-Q status (by their user id). */
export const getMemberParqStatus = async (
  memberId: string,
): Promise<ParqStatus> => {
  const { data } = await supabase
    .from("par_q")
    .select("completed_at, any_yes")
    .eq("member_id", memberId)
    .order("completed_at", { ascending: false })
    .limit(1);
  const latest = (data?.[0] as any) ?? null;
  const completedAt: string | null = latest?.completed_at ?? null;
  const anyYes: boolean | null = latest?.any_yes ?? null;
  if (!completedAt)
    return { valid: false, completedAt: null, expiresAt: null, anyYes: null };
  const exp = new Date(completedAt);
  exp.setMonth(exp.getMonth() + PARQ_VALIDITY_MONTHS);
  return {
    valid: exp.getTime() > Date.now(),
    completedAt,
    expiresAt: exp.toISOString(),
    anyYes,
  };
};

export interface ParqAllRow {
  member_id: string;
  name: string;
  email: string;
  completed_at: string | null;
  expires_at: string | null;
  any_yes: boolean | null;
  valid: boolean;
}

/** Staff-only: every member's latest PAR-Q status (RPC raises for non-staff). */
export const getParqStatusAll = async (): Promise<ParqAllRow[]> => {
  const { data, error } = await supabase.rpc("par_q_status_all");
  if (error) {
    console.error("par_q_status_all", error);
    return [];
  }
  return (data ?? []) as ParqAllRow[];
};
