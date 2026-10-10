import { supabase } from "./supabase";

export interface AccCohort {
  id: string;
  name: string;
  start_date: string;
  weeks: number;
  call_url?: string | null;
  call_label?: string | null;
}

export interface AccClient {
  id: string;
  user_id: string;
  cohort_id: string;
  coach_user_id: string | null;
  onboarding_done: boolean;
  nutrition_approach: string | null;
  created_at: string;
  onboarding_completed_at?: string | null;
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
  // Nutrition tracking (added by acc_tracking_fields.sql)
  tracking_app?: string | null;
  tracking_app_other?: string | null;
  mfp_username?: string | null;
  calorie_target?: number | null;
  protein_target?: number | null;
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
  tracking_app?: string | null;
  tracking_app_other?: string | null;
  mfp_username?: string | null;
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
    const { data, error } = await supabase
      .from("acc_clients")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("enrolled_at", { ascending: true });
    if (error) console.warn("getCohortClients error", error);
    return (data as AccClient[]) ?? [];
  } catch (e) {
    console.warn("getCohortClients failed", e);
    return [];
  }
};

/** Staff: set the cohort's live-call link + label (acc_cohorts.call_url / call_label). */
export const setCohortCall = async (
  cohortId: string,
  call: { call_url?: string | null; call_label?: string | null },
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_cohorts")
    .update({
      call_url: call.call_url ?? null,
      call_label: call.call_label ?? null,
    })
    .eq("id", cohortId);
  return { error };
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

/** Staff: set calorie + protein targets (tracking clients only). */
export const setTrackingTargets = async (
  clientId: string,
  targets: {
    calorie_target?: number | null;
    protein_target?: number | null;
  },
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({
      calorie_target: targets.calorie_target ?? null,
      protein_target: targets.protein_target ?? null,
    })
    .eq("id", clientId);
  return { error };
};

/** Member (Week 3 check-in) or dashboard edit: save the SOS plan, and the step target when provided. */
export const saveMySosPlan = async (
  clientId: string,
  sosPlan: string,
  stepTarget?: number | null,
): Promise<{ error: any }> => {
  const patch: Record<string, any> = { sos_plan: sosPlan };
  if (stepTarget !== undefined) patch.step_target = stepTarget;
  const { error } = await supabase
    .from("acc_clients")
    .update(patch)
    .eq("id", clientId);
  return { error };
};

/** Coach: set a client's daily step target from the console (doesn't touch sos_plan). */
export const setStepTarget = async (
  clientId: string,
  stepTarget: number | null,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ step_target: stepTarget })
    .eq("id", clientId);
  return { error };
};

/** Staff or client: set tracking app info (clients start tracking mid-programme). */
export const setTrackingApp = async (
  clientId: string,
  app: {
    tracking_app?: string | null;
    tracking_app_other?: string | null;
    mfp_username?: string | null;
  },
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({
      tracking_app: app.tracking_app ?? null,
      tracking_app_other: app.tracking_app_other ?? null,
      mfp_username: app.mfp_username ?? null,
    })
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
      nutrition_approach: payload.nutrition_approach ?? null,
      accountability_style: payload.accountability_style ?? null,
      checkin_pref: payload.checkin_pref ?? null,
      tracking_app: payload.tracking_app ?? null,
      tracking_app_other: payload.tracking_app_other ?? null,
      mfp_username: payload.mfp_username ?? null,
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

export interface OnboardingStatus {
  complete: boolean;
  done: number;
  missing: string[];
}

export const REQUIRED_ONBOARDING_ITEMS = [
  "why",
  "photos",
  "measurements",
  "steps",
  "nutrition",
] as const;

export const ONBOARDING_ITEM_LABELS: Record<string, string> = {
  why: "Your why",
  photos: "Baseline photos (front + side)",
  measurements: "Weight + 3 measurements",
  steps: "Average daily steps",
  nutrition: "Nutrition approach",
};

export const ONBOARDING_ITEM_SHORT_LABELS: Record<string, string> = {
  why: "No why",
  photos: "No photos",
  measurements: "No measurements",
  steps: "No steps",
  nutrition: "No approach",
};

/**
 * Single source of truth for the 5 required onboarding items.
 * `complete === true` when all five are present.
 */
export const onboardingStatus = (
  client: AccClient | null | undefined,
): OnboardingStatus => {
  if (!client) {
    return {
      complete: false,
      done: 0,
      missing: [...REQUIRED_ONBOARDING_ITEMS],
    };
  }
  const b = (client.baseline as Record<string, any>) || {};
  const missing: string[] = [];

  // 1. One-sentence why
  if (!client.why || !String(client.why).trim()) missing.push("why");

  // 2. Baseline photos: front AND side
  const photos: any[] = Array.isArray(b.photos) ? b.photos : [];
  if (photos.length < 2) missing.push("photos");

  // 3. Current weight + 3 measurements
  const hasWeight = b.weight != null && Number(b.weight) > 0;
  const measKeys = ["chest", "waist", "tummy", "thigh"];
  const measCount = measKeys.filter(
    (k) => b[k] != null && Number(b[k]) > 0,
  ).length;
  if (!hasWeight || measCount < 3) missing.push("measurements");

  // 4. Average daily steps baseline
  const steps = b.avg_steps_baseline ?? b.steps;
  if (steps == null || Number(steps) <= 0) missing.push("steps");

  // 5. Nutrition approach
  if (!client.nutrition_approach || !String(client.nutrition_approach).trim())
    missing.push("nutrition");

  const done = REQUIRED_ONBOARDING_ITEMS.length - missing.length;
  return { complete: missing.length === 0, done, missing };
};

/** Set onboarding_completed_at = now() only if it's currently null. */
export const markOnboardingComplete = async (
  clientId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", clientId)
    .is("onboarding_completed_at", null);
  return { error };
};

/**
 * Manual coach override: sets BOTH onboarding_done and onboarding_completed_at
 * so the manual flag and the 5-item rule stay in sync.
 */
export const setOnboardingComplete = async (
  clientId: string,
  done: boolean,
): Promise<{ error: any }> => {
  const payload = done
    ? {
        onboarding_done: true,
        onboarding_completed_at: new Date().toISOString(),
      }
    : { onboarding_done: false, onboarding_completed_at: null };
  const { error } = await supabase
    .from("acc_clients")
    .update(payload)
    .eq("id", clientId);
  return { error };
};

/** Save onboarding form progress without marking complete. */
export const saveOnboardingProgress = async (
  clientId: string,
  onboarding: Record<string, any>,
  baseline?: Record<string, any>,
): Promise<{ error: any }> => {
  const payload: Record<string, any> = { onboarding };
  if (baseline) payload.baseline = baseline;
  const { error } = await supabase
    .from("acc_clients")
    .update(payload)
    .eq("id", clientId);
  return { error };
};
