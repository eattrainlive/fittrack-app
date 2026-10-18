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
  // Per-member week offset (acc_week_offset.sql). 0 = normal. Staff testers can be
  // set to +1 so they're always a week ahead of real clients to verify each stage.
  week_offset?: number | null;
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
  // Coach setup tracker — manual ticks (acc_setup_tracker.sql). Keys are the
  // manual SETUP_COLUMNS keys below, e.g. { setup_fittrack: true, paid: true }.
  setup_tracker?: Record<string, boolean> | null;
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

/**
 * Fire the "welcome to the 6-Week Accountability Programme" WhatsApp (via GHL)
 * when a client is enrolled. Best-effort: resolves the member's email/name and
 * pings a staff-only proxy; never throws and never blocks enrolment.
 */
export interface MemberContact {
  email: string; // primary match (gym-roster email where known)
  altEmail: string | null; // app-signup email, when it differs (backup match)
  fullName: string;
  first: string;
}

/**
 * Resolve a member's WhatsApp/GHL contact from their app user id. Prefers the
 * GYM-roster email (what GHL most likely holds — GymOS/Quoox is the source of
 * their GHL contact), resolved via the account link; falls back to the app
 * signup email. Returns null if nothing to match on. Used by the accountability
 * auto-WhatsApp hooks (enrol welcome, check-in ready).
 */
export async function resolveMemberContact(
  userId: string,
): Promise<MemberContact | null> {
  const { data: m } = await supabase
    .from("members")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  const appEmail = (m as any)?.email ?? null;
  const fullName = (m as any)?.full_name ?? "";

  let gymEmail: string | null = null;
  try {
    const { data: link } = await supabase
      .from("member_links")
      .select("member_id")
      .eq("user_id", userId)
      .maybeSingle();
    const memberId = (link as any)?.member_id;
    if (memberId) {
      const { data: gm } = await supabase
        .from("gym_members")
        .select("email")
        .eq("id", memberId)
        .maybeSingle();
      gymEmail = (gm as any)?.email ?? null;
    }
    if (!gymEmail) {
      const { data: gm2 } = await supabase
        .from("gym_members")
        .select("email")
        .eq("auth_uid", userId)
        .maybeSingle();
      gymEmail = (gm2 as any)?.email ?? null;
    }
  } catch {
    /* roster not readable — fall back to app email */
  }

  const email = gymEmail || appEmail;
  if (!email) return null;
  const altEmail =
    appEmail && gymEmail && appEmail !== gymEmail ? appEmail : null;
  const first = String(fullName).trim().split(/\s+/)[0] ?? "";
  return { email, altEmail, fullName, first };
}

async function fireAccWelcome(userId: string, cohortId: string): Promise<void> {
  try {
    const c = await resolveMemberContact(userId);
    if (!c) return; // no email on file — nothing to send to
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    await fetch("/.netlify/functions/acc-welcome", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: c.email,
        alt_email: c.altEmail,
        name: c.fullName,
        first: c.first,
        cohort: cohortId,
      }),
    });
  } catch (e) {
    console.warn("[accWelcome] send failed:", e);
  }
}

/** Staff: enrol a member into a cohort. */
export const enrolClient = async (
  cohortId: string,
  userId: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .insert({ cohort_id: cohortId, user_id: userId });
  // Only welcome on a clean insert (not on a duplicate/failed enrol).
  if (!error) void fireAccWelcome(userId, cohortId);
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

/**
 * A member's EFFECTIVE week — the real cohort week plus their personal week_offset
 * (staff testers run +1 so they're a week ahead to verify each stage). Clamped to
 * 1..weeks+1, but never advanced past start when the cohort hasn't begun (offset 0
 * stays 0 = "not started"). Use this everywhere a member sees their current week.
 */
export const effectiveWeekOf = (
  cohort: { start_date: string; weeks: number },
  client?: { week_offset?: number | null } | null,
): number => {
  const base = currentWeekOf(cohort.start_date, cohort.weeks);
  const off = Number(client?.week_offset ?? 0) || 0;
  if (off === 0) return base;
  const bumped = Math.max(base, 0) + off;
  if (bumped < 1) return base; // a negative offset before start can't go below 0
  if (bumped > cohort.weeks) return cohort.weeks + 1;
  return bumped;
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

  // 2. Baseline photos: front AND side (back is optional)
  const p: any = b.photos || {};
  const hasFront = !!(p.front ?? (Array.isArray(b.photos) && b.photos[0]));
  const hasSide = !!(p.side ?? (Array.isArray(b.photos) && b.photos[1]));
  if (!hasFront || !hasSide) missing.push("photos");

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

// ── Coach setup tracker (acc_setup_tracker.sql) ──────────────────────────────
// Mirrors the "6 Week Nutrition Members" sheet. AUTO columns derive from app
// data; MANUAL columns are coach ticks stored in acc_clients.setup_tracker.

export type SetupCellMode = "manual" | "auto";

export interface SetupColumn {
  key: string;
  label: string; // full header
  short: string; // compact header for the grid
  mode: SetupCellMode;
}

/** The admin/onboarding milestones, left→right (weeks handled separately). */
export const SETUP_COLUMNS: SetupColumn[] = [
  { key: "setup_fittrack", label: "Set up on FitTrack", short: "FitTrack", mode: "manual" },
  { key: "sent_onboarding", label: "Sent onboarding", short: "Sent", mode: "manual" },
  { key: "onboarding_form", label: "Onboarding form", short: "Form", mode: "auto" },
  { key: "mfp", label: "MFP diary open", short: "MFP", mode: "auto" },
  { key: "paid", label: "Paid", short: "Paid", mode: "manual" },
  { key: "initial_call", label: "Initial call done", short: "Call", mode: "manual" },
];

export const SETUP_WEEKS = [1, 2, 3, 4, 5, 6];

/** Minimal shape we need from a check-in row to derive weekly ticks. */
export interface SetupCheckinLite {
  client_id: string;
  week_number: number;
  submitted_at?: string | null;
}

/**
 * Derive the AUTO cells for a client: onboarding form complete, MFP/tracking
 * set up, and each week's check-in submitted. Returns a flat map of
 * { onboarding_form, mfp, w1..w6 } booleans.
 */
export const autoSetupState = (
  client: AccClient,
  checkins: SetupCheckinLite[],
): Record<string, boolean> => {
  const st = onboardingStatus(client);
  const onboarding_form = st.complete || !!client.onboarding_done;
  const mfp =
    (!!client.tracking_app && client.tracking_app !== "none") ||
    !!(client.mfp_username && String(client.mfp_username).trim());
  const out: Record<string, boolean> = { onboarding_form, mfp };
  for (const w of SETUP_WEEKS) {
    out["w" + w] = checkins.some(
      (c) => c.client_id === client.id && c.week_number === w && !!c.submitted_at,
    );
  }
  return out;
};

/** Persist the full manual-tick map for a client (coach action). */
export const setSetupTracker = async (
  clientId: string,
  tracker: Record<string, boolean>,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_clients")
    .update({ setup_tracker: tracker })
    .eq("id", clientId);
  return { error };
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
