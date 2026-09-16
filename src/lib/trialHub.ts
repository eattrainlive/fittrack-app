import { supabase } from "./supabase";
import { getMyGymMember } from "./store";
import { saveBodyweight } from "./store";
import { saveMemberPhoto, uploadProgressPhoto } from "./trialGoals";
import { setTrialBaselineCapturedAt } from "./trialBaseline";

export interface TrialHubContent {
  welcome_video_url: string;
  habits_video_url: string;
  review_booking_url: string;
}

const DEFAULT_CONTENT: TrialHubContent = {
  welcome_video_url: "",
  habits_video_url: "",
  review_booking_url:
    "https://api.leadconnectorhq.com/widget/bookings/trial-reviews",
};

export const getTrialHubContent = async (): Promise<TrialHubContent> => {
  try {
    const { data } = await supabase
      .from("feature_settings")
      .select("value")
      .eq("key", "trial_hub")
      .maybeSingle();
    if (data?.value) {
      const parsed =
        typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      return { ...DEFAULT_CONTENT, ...parsed };
    }
  } catch {}
  return DEFAULT_CONTENT;
};

export const saveTrialHubContent = async (c: TrialHubContent) => {
  const { error } = await supabase
    .from("feature_settings")
    .upsert(
      { key: "trial_hub", value: JSON.stringify(c) },
      { onConflict: "key" },
    );
  return { error };
};

// Convert any Loom/YouTube URL to an embeddable iframe URL.
export const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    // YouTube
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/"))
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    }
    // Loom
    if (host === "loom.com" || host === "www.loom.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      // /share/<id> or /embed/<id>
      const id = parts[parts.length - 1];
      return `https://www.loom.com/embed/${id}`;
    }
    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      return `https://player.vimeo.com/video/${id}`;
    }
    // Fallback: return as-is (might already be an embed URL)
    return url;
  } catch {
    return null;
  }
};

// ── Setup helpers ───────────────────────────────────────────────────────────

export const saveBaseline = async ({
  weight,
  photoFile,
}: {
  weight: number | null;
  photoFile: File | null;
}): Promise<{ error?: string }> => {
  try {
    const member = await getMyGymMember();
    if (!member) return { error: "No trial membership found" };

    if (weight && weight > 0) {
      const res = await saveBodyweight({ weight });
      if (!res.success) return { error: "Couldn't save weight" };
      await setTrialBaselineCapturedAt();
    }

    if (photoFile) {
      const uploaded = await uploadProgressPhoto(photoFile);
      if (uploaded && "url" in uploaded) {
        await saveMemberPhoto({
          url: uploaded.url,
          phase: "before",
          is_baseline: true,
        });
      }
    }

    return {};
  } catch (e: any) {
    return { error: e?.message || "Save failed" };
  }
};

export const finishTrialSetup = async ({
  goalText,
  sessionsPerWeek,
  habitNames,
}: {
  goalText: string;
  sessionsPerWeek: number;
  habitNames: string[];
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not-authenticated");

  // Save goals row with setup_done flag
  const { error: goalsErr } = await supabase.from("trial_goals").upsert(
    {
      member_id: user.id,
      goal_text: goalText.trim(),
      sessions_per_week: sessionsPerWeek,
      habit_1: habitNames[0] || null,
      habit_2: habitNames[1] || null,
      habit_3: habitNames[2] || null,
      setup_done: true,
    },
    { onConflict: "member_id" },
  );
  if (goalsErr) throw goalsErr;

  // Seed selected habits into member_habits.
  // Library habits resolve to a habit_id; custom ("create your own") habits
  // have habit_id = null but a readable habit_name. Upsert each separately
  // so the right conflict target is used (member_id+habit_id vs member_id+habit_name).
  const habitLib = await getHabitLibraryRows();
  const payload = habitNames.map((name, i) => {
    const match = habitLib.find((h: any) => h.name === name);
    return {
      member_id: user.id,
      habit_id: match?.id || null,
      habit_name: name,
      status: i === 0 ? "active" : "queued",
      position: i,
      started_at: i === 0 ? new Date().toISOString() : null,
    };
  });

  for (const p of payload) {
    const { error: habitErr } = await supabase.from("member_habits").upsert(p, {
      onConflict:
        p.habit_id != null ? "member_id, habit_id" : "member_id, habit_name",
    });
    if (habitErr) {
      // Don't throw — a single habit failing shouldn't block setup completion.
      console.warn("member_habits upsert failed for", p.habit_name, habitErr);
    }
  }
};

// Update the member's chosen habits from the hub's "Edit habits" picker.
// Preserves check-in history for kept habits; removes dropped ones.
// Each habit resolves to a library habit_id where possible (custom habits
// keep habit_id = null + a readable habit_name). Upserts each separately
// so the right conflict target is used, then deletes habits no longer selected.
export const saveTrialHabits = async (
  habitNames: string[],
  currentHabits: {
    id: string;
    habit_id: string | number | null;
    habit_name: string | null;
    habits?: { name: string } | null;
  }[],
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not-authenticated");

  const habitLib = await getHabitLibraryRows();

  // Build a name → current-row map so we preserve the existing member_habits
  // row id (and thus its check-in history) for habits that stay.
  const currentByName = new Map<string, any>();
  for (const h of currentHabits) {
    const name = (h.habit_name || h.habits?.name || "").toLowerCase().trim();
    if (name) currentByName.set(name, h);
  }

  const payload = habitNames.map((name, i) => {
    const match = habitLib.find((h: any) => h.name === name);
    const existing = currentByName.get(name.toLowerCase().trim());
    return {
      // Preserve the existing row id so check-ins aren't orphaned.
      ...(existing?.id ? { id: existing.id } : {}),
      member_id: user.id,
      habit_id: match?.id ?? null,
      habit_name: name,
      status: i === 0 ? "active" : "queued",
      position: i,
      started_at:
        i === 0
          ? existing?.started_at || new Date().toISOString()
          : existing?.started_at || null,
    };
  });

  // Upsert each habit (separate calls so the conflict target matches the
  // presence/absence of habit_id).
  for (const p of payload) {
    const { error } = await supabase.from("member_habits").upsert(p, {
      onConflict:
        p.habit_id != null ? "member_id, habit_id" : "member_id, habit_name",
    });
    if (error)
      console.warn("member_habits upsert failed for", p.habit_name, error);
  }

  // Delete habits that are no longer selected (by row id).
  const keepIds = new Set(payload.map((p) => p.id).filter(Boolean));
  const toDelete = currentHabits
    .map((h) => h.id)
    .filter((id) => id && !keepIds.has(id));
  if (toDelete.length) {
    await supabase
      .from("member_habits")
      .delete()
      .eq("member_id", user.id)
      .in("id", toDelete);
  }
};

const getHabitLibraryRows = async () => {
  const { data } = await supabase
    .from("habits")
    .select("*")
    .order("sort_order", { ascending: true });
  return data || [];
};

// ── Momentum hub data ───────────────────────────────────────────────────────

export interface TrialMomentumData {
  day: number;
  daysLeft: number;
  sessionsAttended: number;
  totalVolume: number;
  bestStreak: number;
  attendedDays: number[];
  prs: { exercise: string; start: number; now: number; gain: number }[];
  weightStart: number | null;
  weightNow: number | null;
  weightDelta: number | null;
  beforePhoto: string | null;
  afterPhoto: string | null;
  goalText: string;
  sessionsPerWeek: number;
  setupDone: boolean;
  coachMessage: string | null;
}

export const getTrialMomentum = async (): Promise<TrialMomentumData | null> => {
  const member = await getMyGymMember();
  if (!member) return null;

  const start = new Date(member.joined_on);
  const today = new Date();
  const daysSince = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const day = Math.min(30, Math.max(1, daysSince + 1));
  const daysLeft = Math.max(0, 30 - day);

  // Goals
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let goalText = "";
  let sessionsPerWeek = 3;
  let setupDone = false;
  if (user) {
    const { data: goals } = await supabase
      .from("trial_goals")
      .select("*")
      .eq("member_id", user.id)
      .maybeSingle();
    if (goals) {
      goalText = goals.goal_text || "";
      sessionsPerWeek = goals.sessions_per_week || 3;
      setupDone = !!goals.setup_done;
    }
  }

  // Bookings (attendance)
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: bookings } = await supabase
    .from("member_bookings")
    .select("session_at, status")
    .ilike("email", (member.email || "").toLowerCase())
    .gte("session_at", start.toISOString())
    .lte("session_at", end.toISOString());

  const attended = (bookings || []).filter(
    (b: any) => b.status !== "cancelled",
  );
  const sessionsAttended = attended.length;
  const attendedDays = attended.map((b: any) => {
    const d = new Date(b.session_at);
    return Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  });

  // Volume + PBs from workout_history
  let totalVolume = 0;
  let prs: any[] = [];
  if (user) {
    const { data: hist } = await supabase
      .from("workout_history")
      .select("volume, date, data")
      .eq("user_id", user.id)
      .gte("date", start.toISOString().split("T")[0]);
    totalVolume = (hist || []).reduce(
      (s: number, w: any) => s + (w.volume || 0),
      0,
    );

    const { data: prRows } = await supabase
      .from("personal_records")
      .select("exercise, weight, date")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (prRows && prRows.length) {
      const byEx: Record<string, any[]> = {};
      prRows.forEach((p: any) => {
        if (!byEx[p.exercise]) byEx[p.exercise] = [];
        byEx[p.exercise].push(p);
      });
      prs = Object.entries(byEx)
        .map(([exercise, rows]) => {
          const startW = rows[0]?.weight || 0;
          const nowW = rows[rows.length - 1]?.weight || 0;
          return {
            exercise,
            start: startW,
            now: nowW,
            gain: nowW - startW,
          };
        })
        .filter((p) => p.gain > 0)
        .sort((a, b) => b.gain - a.gain)
        .slice(0, 3);
    }
  }

  // Bodyweight
  let weightStart: number | null = null;
  let weightNow: number | null = null;
  if (user) {
    const { data: bw } = await supabase
      .from("bodyweight_history")
      .select("weight, date")
      .eq("user_id", user.id)
      .gte("date", start.toISOString().split("T")[0])
      .order("date", { ascending: true });
    if (bw && bw.length) {
      weightStart = bw[0].weight;
      weightNow = bw[bw.length - 1].weight;
    }
  }
  const weightDelta =
    weightStart != null && weightNow != null
      ? Number((weightNow - weightStart).toFixed(1))
      : null;

  // Photos
  let beforePhoto: string | null = null;
  let afterPhoto: string | null = null;
  if (user) {
    const { data: photos } = await supabase
      .from("member_photos")
      .select("url, is_baseline, created_at")
      .eq("member_id", user.id)
      .order("created_at", { ascending: true });
    if (photos && photos.length) {
      const before = photos.find((p: any) => p.is_baseline) || photos[0];
      beforePhoto = before?.url || null;
      afterPhoto = photos[photos.length - 1]?.url || null;
    }
  }

  // Streak (longest consecutive attended day)
  const sortedDays = [...new Set(attendedDays)].sort((a, b) => a - b);
  let bestStreak = 0;
  let cur = 0;
  let prev = -999;
  for (const d of sortedDays) {
    if (d === prev + 1) cur++;
    else cur = 1;
    bestStreak = Math.max(bestStreak, cur);
    prev = d;
  }

  return {
    day,
    daysLeft,
    sessionsAttended,
    totalVolume,
    bestStreak,
    attendedDays: sortedDays,
    prs,
    weightStart,
    weightNow,
    weightDelta,
    beforePhoto,
    afterPhoto,
    goalText,
    sessionsPerWeek,
    setupDone,
    coachMessage: null,
  };
};
