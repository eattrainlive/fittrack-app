import { supabase } from "./supabase";

export interface AccCohort {
  id: string;
  name: string;
  start_date: string;
  weeks: number;
}

export interface AccClient {
  id: string;
  user_id: string;
  cohort_id: string;
  coach_user_id: string | null;
  onboarding_done: boolean;
  nutrition_approach: string | null;
  created_at: string;
  // Onboarding (added by accountability_onboarding_schema.sql)
  onboarding?: Record<string, any> | null;
  why?: string | null;
  derailers?: string | null;
  events?: string | null;
  baseline?: Record<string, any> | null;
  step_target?: number | null;
  accountability_style?: string | null;
  checkin_pref?: string | null;
  sos_plan?: string | null;
}

export interface OnboardingPayload {
  onboarding: Record<string, any>;
  why?: string | null;
  derailers?: string | null;
  events?: string | null;
  baseline?: Record<string, any>;
  step_target?: number | null;
  nutrition_approach?: string | null;
  accountability_style?: string | null;
  checkin_pref?: string | null;
}

/** The most recent / active cohort (members + staff can read). */
export const getActiveCohort = async (): Promise<AccCohort | null> => {
  try {
    const { data } = await supabase
      .from("acc_cohorts")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as AccCohort) ?? null;
  } catch (e) {
    console.warn("getActiveCohort failed", e);
    return null;
  }
};

/** The current user's enrolment in a given cohort (owner RLS). */
export const getMyClientRecord = async (
  cohortId: string,
): Promise<AccClient | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const { data } = await supabase
      .from("acc_clients")
      .select("*")
      .eq("cohort_id", cohortId)
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as AccClient) ?? null;
  } catch (e) {
    console.warn("getMyClientRecord failed", e);
    return null;
  }
};

/** Staff: all clients in a cohort. */
export const getCohortClients = async (
  cohortId: string,
): Promise<AccClient[]> => {
  try {
    const { data } = await supabase
      .from("acc_clients")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: true });
    return (data as AccClient[]) ?? [];
  } catch (e) {
    console.warn("getCohortClients failed", e);
    return [];
  }
};

/** Staff: enrol a member into a cohort. */
export const enrolClient = async (
  cohortId: string,
  userId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .insert({ cohort_id: cohortId, user_id: userId });
  return { error };
};

/** Staff: remove a client from a cohort. */
export const removeClient = async (
  clientId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .delete()
    .eq("id", clientId);
  return { error };
};

/** Staff: assign / reassign a coach to a client. */
export const assignCoach = async (
  clientId: string,
  coachUserId: string | null,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ coach_user_id: coachUserId })
    .eq("id", clientId);
  return { error };
};

/** Staff: set onboarding done flag. */
export const setOnboardingDone = async (
  clientId: string,
  done: boolean,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ onboarding_done: done })
    .eq("id", clientId);
  return { error };
};

/** Staff: set nutrition approach. */
export const setNutritionApproach = async (
  clientId: string,
  approach: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ nutrition_approach: approach })
    .eq("id", clientId);
  return { error };
};

/** Client: mark their own onboarding done. */
export const completeMyOnboarding = async (
  clientId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ onboarding_done: true })
    .eq("id", clientId);
  return { error };
};

/** Client: save their full onboarding form + extracted fields, mark done. */
export const saveMyOnboarding = async (
  clientId: string,
  payload: OnboardingPayload,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({
      onboarding: payload.onboarding,
      why: payload.why ?? null,
      derailers: payload.derailers ?? null,
      events: payload.events ?? null,
      baseline: payload.baseline ?? {},
      step_target: payload.step_target ?? null,
      nutrition_approach: payload.nutrition_approach ?? null,
      accountability_style: payload.accountability_style ?? null,
      checkin_pref: payload.checkin_pref ?? null,
      onboarding_done: true,
    })
    .eq("id", clientId);
  return { error };
};

export const WEEK_THEMES = [
  {
    week: 1,
    title: "Foundations",
    habit: "Build your plate + hydration",
    desc: "Start with the basics — how to build a balanced plate and drink enough water each day.",
  },
  {
    week: 2,
    title: "Fuel",
    habit: "Protein at every meal + hand portions",
    desc: "Prioritise protein and learn the hand-portion method so you can eat well without weighing everything.",
  },
  {
    week: 3,
    title: "Move",
    habit: "Steps target + Motivation SOS plan",
    desc: "Build a daily step target and create your personal Motivation SOS plan for when willpower dips.",
  },
  {
    week: 4,
    title: "Real life",
    habit: "Smarter snacking, cravings, alcohol",
    desc: "Navigate the real world — snacks, cravings and social drinks — without losing your progress.",
  },
  {
    week: 5,
    title: "Refine",
    habit: "Labels, fats, carbs & fibre + optional tracking",
    desc: "Read food labels with confidence and fine-tune fats, carbs and fibre. Tracking is optional.",
  },
  {
    week: 6,
    title: "Lock it in",
    habit: "Sliding Scale + results & photos",
    desc: "Use the Sliding Scale to make it sustainable for life and capture your results and photos.",
  },
];

/** Compute the current week number (0 = before start, 1..weeks, weeks+1 = complete). */
export const currentWeekOf = (startDate: string, weeks: number): number => {
  const start = new Date(startDate + "T00:00:00");
  if (isNaN(start.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  if (today < start) return 0;
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week > weeks) return weeks + 1;
  return week;
};
