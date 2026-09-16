import { supabase } from "./supabase";
import {
  getActiveCohort,
  type AccClient,
  type AccCohort,
} from "./accountabilityProgramme";
import { getWeekContent, type AccWeekContent } from "./accWeekContent";
import { getClientCheckins, type AccCheckin } from "./accountabilityCheckins";

/** The shape of data the dashboard renders. */
export interface PreviewData {
  client: AccClient;
  cohort: AccCohort;
  weekContent: AccWeekContent | null;
  checkins: AccCheckin[];
  bwEntries: { date: string; weight: number }[];
  habitCheckins: {
    date: string;
    habit_id: string;
    member_habit_id?: string | null;
  }[];
  memberHabits: { id: string; name: string }[];
  photos: any[];
  latestMeas: any;
  coachName: string;
  coachAvatar: string | null;
}

/* ------------------------------------------------------------------ */
/* Demo data — a filled-in week-3 client so staff can see the full    */
/* experience even before anyone is enrolled. Touches no DB.          */
/* ------------------------------------------------------------------ */

const todayMinus = (days: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const demoHabitId = (n: number) => `demo-habit-${n}`;

export const DEMO_CLIENT: AccClient = {
  id: "demo-client",
  user_id: "demo-user",
  cohort_id: "demo-cohort",
  coach_user_id: "demo-coach",
  onboarding_done: true,
  nutrition_approach: "plate",
  created_at: todayMinus(21),
  onboarding: { q5: 4, q42: "Really want to feel confident on the beach." },
  why: "I want to feel confident on holiday in December and keep up with my kids without feeling wrecked.",
  derailers: "Stress eating in the evenings, and wine on weekends.",
  events: "Holiday in December",
  baseline: {
    weight: 82.4,
    height: "175cm",
    chest: 104,
    waist: 96,
    bodyFat: 31,
    thigh: 58,
    tummy: 98,
    steps: 5200,
    photos: [],
  },
  step_target: 8000,
  accountability_style: "gentle nudges",
  checkin_pref: "either",
  sos_plan:
    "When I'm stressed and reach for snacks, I'll drink a glass of water and step outside for 2 minutes first.",
};

export const DEMO_COHORT: AccCohort = {
  id: "demo-cohort",
  name: "6 Week Accountability Programme",
  start_date: todayMinus(18),
  weeks: 6,
};

export const DEMO_WEEK_CONTENT: AccWeekContent = {
  week_number: 3,
  title: "Move",
  theme: "Move",
  habit: "Steps target + Motivation SOS plan",
  teaching:
    "This week we're building your daily step target and creating your personal Motivation SOS plan — a simple, pre-decided response for when willpower dips. You don't need to be perfect; you need a plan for the moments you're not.",
  video_url: "https://www.loom.com/share/demo",
  resources: [
    { title: "Step target calculator", url: "#" },
    { title: "SOS plan template", url: "#" },
  ],
};

const demoBw = [
  { date: todayMinus(20), weight: 82.4 },
  { date: todayMinus(18), weight: 82.1 },
  { date: todayMinus(15), weight: 81.6 },
  { date: todayMinus(12), weight: 81.3 },
  { date: todayMinus(9), weight: 80.9 },
  { date: todayMinus(6), weight: 80.7 },
  { date: todayMinus(3), weight: 80.4 },
  { date: todayMinus(1), weight: 80.2 },
];

const demoHabits = [
  { id: demoHabitId(1), name: "Build your plate" },
  { id: demoHabitId(2), name: "Protein at every meal" },
  { id: demoHabitId(3), name: "Hydration 2L+" },
  { id: demoHabitId(4), name: "Steps target" },
];

const demoHabitCheckins: {
  date: string;
  habit_id: string;
  member_habit_id?: string | null;
}[] = [];
// ~6 days of check-ins per habit over the last week
for (let h = 1; h <= 4; h++) {
  for (let d = 0; d < 6; d++) {
    demoHabitCheckins.push({ date: todayMinus(d), habit_id: demoHabitId(h) });
  }
}
// Add a few older days to build a streak
for (let d = 7; d <= 12; d++) {
  demoHabitCheckins.push({ date: todayMinus(d), habit_id: demoHabitId(1) });
}

const demoCheckins: AccCheckin[] = [
  {
    id: "demo-ck1",
    client_id: "demo-client",
    user_id: "demo-user",
    cohort_id: "demo-cohort",
    week_number: 1,
    responses: {
      q1: 3,
      q3: "Hit my water target 5 days!",
      q4: 2,
      q5: 3,
      q6: 3,
    },
    avg_weight: 82.1,
    avg_steps: 5600,
    submitted_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "demo-ck2",
    client_id: "demo-client",
    user_id: "demo-user",
    cohort_id: "demo-cohort",
    week_number: 2,
    responses: {
      q1: 4,
      q3: "Protein at every meal 4 days",
      q4: 3,
      q5: 4,
      q6: 4,
    },
    avg_weight: 81.3,
    avg_steps: 6400,
    submitted_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    coach_reply_format: "loom",
    coach_reply_note:
      "Brilliant progress on the protein — you're nailing it. This week let's layer in the steps. Watch the short video on building your step target 👇",
    coach_reply_loom_url: "https://www.loom.com/share/demo",
    coach_replied_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    coach_user_id: "demo-coach",
    flagged: false,
  },
];

const demoPhotos = [
  {
    id: "demo-photo-1",
    url: "",
    created_at: todayMinus(20),
    is_baseline: true,
    phase: "before",
  },
  {
    id: "demo-photo-2",
    url: "",
    created_at: todayMinus(3),
    is_baseline: false,
    phase: "progress",
  },
];

const demoLatestMeas = {
  waist: 93,
  tummy: 94,
  chest: 102,
  thigh: 57,
};

export function getDemoData(week: number): PreviewData {
  // Pick the right week content for the selected week
  const themes: Record<number, AccWeekContent> = {
    0: {
      ...DEMO_WEEK_CONTENT,
      week_number: 0,
      title: "Onboarding",
      theme: "Onboarding",
      habit: "Set your baseline",
      teaching:
        "Welcome! Before we start, we'll capture your baseline so we can measure progress.",
    },
    1: {
      ...DEMO_WEEK_CONTENT,
      week_number: 1,
      title: "Foundations",
      theme: "Foundations",
      habit: "Build your plate + hydration",
    },
    2: {
      ...DEMO_WEEK_CONTENT,
      week_number: 2,
      title: "Fuel",
      theme: "Fuel",
      habit: "Protein at every meal + hand portions",
    },
    3: DEMO_WEEK_CONTENT,
    4: {
      ...DEMO_WEEK_CONTENT,
      week_number: 4,
      title: "Real life",
      theme: "Real life",
      habit: "Smarter snacking, cravings, alcohol",
    },
    5: {
      ...DEMO_WEEK_CONTENT,
      week_number: 5,
      title: "Refine",
      theme: "Refine",
      habit: "Labels, fats, carbs & fibre + optional tracking",
    },
    6: {
      ...DEMO_WEEK_CONTENT,
      week_number: 6,
      title: "Lock it in",
      theme: "Lock it in",
      habit: "Sliding Scale + results & photos",
    },
  };
  return {
    client: DEMO_CLIENT,
    cohort: DEMO_COHORT,
    weekContent: themes[week] ?? DEMO_WEEK_CONTENT,
    checkins: demoCheckins.filter((c) => c.week_number < week),
    bwEntries: demoBw,
    habitCheckins: demoHabitCheckins,
    memberHabits: demoHabits.slice(0, Math.min(week, 4)),
    photos: demoPhotos,
    latestMeas: demoLatestMeas,
    coachName: "Carla",
    coachAvatar: null,
  };
}

/* ------------------------------------------------------------------ */
/* Real client loader — staff read of a specific client's data.       */
/* ------------------------------------------------------------------ */

export const loadRealClientData = async (
  clientId: string,
): Promise<PreviewData | null> => {
  const cohort = await getActiveCohort();
  if (!cohort) return null;

  // acc_clients row (staff can read all)
  const { data: clientRow } = await supabase
    .from("acc_clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (!clientRow) return null;
  const client = clientRow as AccClient;

  const [checkins, weekContent] = await Promise.all([
    getClientCheckins(clientId),
    getWeekContent(currentWeekOfReal(cohort, client)),
  ]);

  const userId = client.user_id;

  const [bw, mh, hc, ph, meas] = await Promise.all([
    supabase
      .from("bodyweight_history")
      .select("date, weight")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
    supabase.from("member_habits").select("id, name").eq("user_id", userId),
    supabase
      .from("habit_checkins")
      .select("date, habit_id, member_habit_id")
      .eq("user_id", userId),
    supabase
      .from("member_photos")
      .select("id, url, created_at, is_baseline, phase")
      .eq("member_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("member_measurements")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  let coachName = "Your coach";
  let coachAvatar: string | null = null;
  if (client.coach_user_id) {
    const { data: coach } = await supabase
      .from("members")
      .select("full_name, email")
      .eq("id", client.coach_user_id)
      .maybeSingle();
    coachName =
      (coach as any)?.full_name ||
      (coach as any)?.email?.split("@")[0] ||
      "Your coach";
    const { data: coachAuth } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", client.coach_user_id)
      .eq("key", "avatar_url")
      .maybeSingle();
    coachAvatar = (coachAuth as any)?.value || null;
  }

  return {
    client,
    cohort,
    weekContent,
    checkins,
    bwEntries: (bw.data ?? []).map((b: any) => ({
      date: b.date,
      weight: Number(b.weight),
    })),
    habitCheckins: (hc.data ?? []) as any,
    memberHabits: (mh.data ?? []) as any,
    photos: (ph.data ?? []) as any,
    latestMeas: (meas.data?.[0] as any) ?? null,
    coachName,
    coachAvatar,
  };
};

/** Compute current week for a real client (same logic as the dashboard). */
const currentWeekOfReal = (cohort: AccCohort, _client: AccClient): number => {
  const start = new Date(cohort.start_date + "T00:00:00");
  if (isNaN(start.getTime())) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  if (today < start) return 0;
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week > cohort.weeks) return cohort.weeks + 1;
  return week;
};
