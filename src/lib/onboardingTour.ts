import { supabase } from "./supabase";

const LOCAL_KEY = "fittrack_onboarding_tour_done";

export type TourStep = {
  target: string; // data-tour attribute value
  title: string;
  body: string;
  navigateTo?: string; // route to push before highlighting
};

export const TOUR_STEPS: TourStep[] = [
  {
    target: "log-workout",
    title: "Log a workout",
    body: "Start here — follow a programme or log your own session.",
  },
  {
    target: "habits",
    title: "Set your habits",
    body: "Pick a few daily habits to build — small wins add up.",
    navigateTo: "/nutrition",
  },
  {
    target: "education",
    title: "Education library",
    body: "Guides, videos and how-tos live here whenever you need them.",
    navigateTo: "/nutrition",
  },
];

/** Read the server flag (source of truth), with a localStorage mirror. */
export const isTourDone = async (): Promise<boolean> => {
  if (localStorage.getItem(LOCAL_KEY) === "true") return true;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("user_settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "onboarding_tour_done")
      .maybeSingle();
    const done = data?.value === "true";
    if (done) localStorage.setItem(LOCAL_KEY, "true");
    return done;
  } catch {
    return false;
  }
};

/** Persist the done flag to the server + localStorage. */
export const markTourDone = async () => {
  localStorage.setItem(LOCAL_KEY, "true");
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: "onboarding_tour_done",
        value: "true",
      },
      { onConflict: "user_id, key" },
    );
  } catch {
    // best-effort
  }
};

/** Clear the flag so the tour can be replayed. */
export const resetTour = async () => {
  localStorage.removeItem(LOCAL_KEY);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        key: "onboarding_tour_done",
        value: "false",
      },
      { onConflict: "user_id, key" },
    );
  } catch {
    // best-effort
  }
};
