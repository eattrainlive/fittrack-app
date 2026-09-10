import { supabase } from "./supabase";
import {
  getHabits,
  saveBodyweight,
  saveMemberHabits,
  saveMemberMacros,
} from "./store";
import { setTrialBaselineCapturedAt } from "./trialBaseline";

export const saveMemberPhoto = async (photo: {
  url: string;
  date?: string;
  pose?: string;
  phase?: string;
  is_baseline?: boolean;
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const row = {
    member_id: user.id,
    url: photo.url,
    date: photo.date || new Date().toISOString().split("T")[0],
    pose: photo.pose || "front",
    phase: photo.phase || "progress",
    is_baseline: photo.is_baseline || false,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("member_photos")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Trial goals ("Set your 30-day starting point") ─────────────────────────
// One row per member in `trial_goals` (keyed on auth uid). The progress pack
// reads this so the end-of-trial review can show progress-vs-targets.

export interface TrialGoals {
  start_weight?: number | null;
  step_target?: number | null;
  sessions_per_week?: number | null;
  calorie_target?: number | null;
  habit_1?: string | null;
  habit_2?: string | null;
  habit_3?: string | null;
  captured_at?: string | null;
}

const asInt = (v: any) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export const getTrialGoals = async (): Promise<TrialGoals | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("trial_goals")
    .select(
      "start_weight,step_target,sessions_per_week,calorie_target,habit_1,habit_2,habit_3,captured_at",
    )
    .eq("member_id", user.id)
    .maybeSingle();
  return data as TrialGoals | null;
};

// Save the goals row + side-effects: weight -> bodyweight_history, before photo
// -> member_photos (tagged baseline), 3 habits -> member_habits, calorie target
// -> member_macros so the nutrition tracker matches.
export const saveTrialGoals = async (input: {
  startWeight?: number | null;
  photoUrl?: string | null;
  stepTarget?: number | null;
  sessionsPerWeek?: number | null;
  calorieTarget?: number | null;
  habitTexts?: (string | null)[];
}): Promise<TrialGoals | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Each habit slot stores the readable NAME (library habit) or a custom string.
  const habitTexts = (input.habitTexts || [])
    .slice(0, 3)
    .map((h) => (h ?? "").trim() || null);
  while (habitTexts.length < 3) habitTexts.push(null);

  const row: TrialGoals & { member_id: string } = {
    member_id: user.id,
    start_weight: input.startWeight ?? null,
    step_target: input.stepTarget ?? null,
    sessions_per_week: input.sessionsPerWeek ?? null,
    calorie_target: input.calorieTarget ?? null,
    habit_1: habitTexts[0] ?? null,
    habit_2: habitTexts[1] ?? null,
    habit_3: habitTexts[2] ?? null,
    captured_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trial_goals")
    .upsert(row, { onConflict: "member_id" })
    .select(
      "start_weight,step_target,sessions_per_week,calorie_target,habit_1,habit_2,habit_3,captured_at",
    )
    .maybeSingle();

  if (error) throw error;

  // Side-effects (best-effort; never block the goals save on these).
  try {
    if (input.startWeight && input.startWeight > 0) {
      await saveBodyweight({ weight: input.startWeight });
    }
  } catch {
    /* ignore */
  }
  try {
    if (input.photoUrl) {
      await saveMemberPhoto({
        url: input.photoUrl,
        date: new Date().toISOString().split("T")[0],
        pose: "front",
        phase: "before",
        is_baseline: true,
      });
    }
  } catch {
    /* ignore */
  }
  try {
    if (input.calorieTarget && input.calorieTarget > 0) {
      await saveMemberMacros({ calorie_target: input.calorieTarget });
    }
  } catch {
    /* ignore */
  }

  // Seed the chosen habits into member_habits so the habit tracker/streaks
  // work against them. Resolve each habit text back to a library id where
  // possible (custom-typed habits have no library id, so skip seeding those).
  try {
    const lib = await getHabits();
    const nameToId = new Map<string, number>();
    for (const h of lib || []) {
      if (h?.id != null)
        nameToId.set(
          String(h.name || "")
            .toLowerCase()
            .trim(),
          Number(h.id),
        );
    }
    const validIds: number[] = [];
    for (const t of habitTexts) {
      if (!t) continue;
      const id = nameToId.get(t.toLowerCase().trim());
      if (id != null) validIds.push(id);
    }
    if (validIds.length) {
      await saveMemberHabits(
        validIds.map((habitId, i) => ({
          habit_id: habitId,
          status: i === 0 ? "active" : "queued",
          position: i,
          started_at: i === 0 ? new Date().toISOString() : null,
        })),
      );
    }
  } catch {
    /* ignore */
  }

  // Mark the baseline capture complete so the day-0 home card stops showing.
  try {
    await setTrialBaselineCapturedAt();
  } catch {
    /* ignore */
  }

  return data as TrialGoals | null;
};

// ── Media bucket upload for the before/progress photo ──────────────────────
export const uploadProgressPhoto = async (
  file: File,
): Promise<{ url: string } | { error: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not signed in" };
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/progress-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e: any) {
    return { error: e?.message || "Upload failed" };
  }
};

// Distinct habit library rows for the picker (id + name).
export const getHabitLibrary = async () => {
  try {
    return await getHabits();
  } catch {
    return [];
  }
};
export { saveMemberMacros };
