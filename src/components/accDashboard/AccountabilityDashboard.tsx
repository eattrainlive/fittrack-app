import { useEffect, useState, useCallback } from "react";
import { Loader2, Eye, CircleAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import { toast } from "@/components/ui/sonner";
import {
  getActiveCohort,
  getMyClientRecord,
  effectiveWeekOf,
  onboardingStatus,
  ONBOARDING_ITEM_LABELS,
  ONBOARDING_ITEM_SHORT_LABELS,
  type AccClient,
  type AccCohort,
} from "@/lib/accountabilityProgramme";
import { getMyCheckins, type AccCheckin } from "@/lib/accountabilityCheckins";
import { getWeekContent } from "@/lib/accWeekContent";
import { ensureAccHabitsUnlocked, getAccWeekHabits } from "@/lib/accWeekHabits";
import {
  rollingAverage,
  sparklinePoints,
  buildWins,
} from "@/lib/accDashboardHelpers";
import type { PreviewData } from "@/lib/accPreviewData";

import { HeroCard } from "@/components/accDashboard/Hero";
import { LessonCard } from "@/components/accDashboard/Lesson";
import { LiveCallCard } from "@/components/accDashboard/LiveCallCard";
import { FormsStatusCard } from "@/components/accDashboard/FormsStatus";
import {
  HabitsCard,
  type HabitRingData,
} from "@/components/accDashboard/Habits";
import {
  WeightCard,
  StepsCard,
  NonScaleTrends,
} from "@/components/accDashboard/Metrics";
import {
  PhotosCard,
  MeasurementsCard,
  CoachReplyCard,
  SosPlanCard,
  WinsStrip,
  type PosePhotos,
} from "@/components/accDashboard/Sections";
import { toDisplayableImage } from "@/lib/imageUpload";

export interface DashboardProps {
  onOpenOnboarding?: () => void;
  onOpenCheckin?: (week?: number) => void;
  onOpenFinal?: () => void;
  /** Preview mode: inject all data instead of loading from the current user. */
  previewData?: PreviewData;
  /** Preview mode: override the computed week (0..6). */
  previewWeek?: number;
  /** Preview mode: render actions as inert (read-only). */
  readOnly?: boolean;
}

export function AccountabilityDashboard({
  onOpenOnboarding,
  onOpenCheckin,
  onOpenFinal,
  previewData,
  previewWeek,
  readOnly,
}: DashboardProps) {
  const isPreview = !!previewData;

  const [loading, setLoading] = useState(!isPreview);
  const [client, setClient] = useState<AccClient | null>(
    previewData?.client ?? null,
  );
  const [cohort, setCohort] = useState<AccCohort | null>(
    previewData?.cohort ?? null,
  );
  const [weekContent, setWeekContent] = useState<any>(
    previewData?.weekContent ?? null,
  );
  const [checkins, setCheckins] = useState<AccCheckin[]>(
    previewData?.checkins ?? [],
  );
  const [bwEntries, setBwEntries] = useState<
    { date: string; weight: number }[]
  >(previewData?.bwEntries ?? []);
  const [habitCheckins, setHabitCheckins] = useState<
    { date: string; habit_id: string | null; member_habit_id?: string | null }[]
  >(previewData?.habitCheckins ?? []);
  const [memberHabits, setMemberHabits] = useState<
    {
      id: string;
      habit_id?: number | null;
      habit_name?: string;
      name?: string;
    }[]
  >(previewData?.memberHabits ?? []);
  const [weekHabits, setWeekHabits] = useState<
    {
      habit_id: number;
      week_number: number;
      sort: number;
      name: string;
    }[]
  >(previewData?.weekHabits ?? []);
  const [photos, setPhotos] = useState<any[]>(previewData?.photos ?? []);
  const [latestMeas, setLatestMeas] = useState<any>(
    previewData?.latestMeas ?? null,
  );
  const [coachName, setCoachName] = useState(
    previewData?.coachName ?? "Your coach",
  );
  const [coachAvatar, setCoachAvatar] = useState<string | null>(
    previewData?.coachAvatar ?? null,
  );

  const load = useCallback(async () => {
    if (isPreview) return;
    setLoading(true);
    const c = await getActiveCohort();
    setCohort(c);
    if (!c) {
      setLoading(false);
      return;
    }
    const me = await getMyClientRecord(c.id);
    setClient(me);
    if (!me) {
      setLoading(false);
      return;
    }
    const week = effectiveWeekOf({ start_date: c.start_date, weeks: c.weeks }, me);
    const [cks, wc] = await Promise.all([
      getMyCheckins(me.id),
      getWeekContent(week),
    ]);
    setCheckins(cks);
    setWeekContent(wc);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Bodyweight history
    const { data: bw } = await supabase
      .from("bodyweight_history")
      .select("date, weight")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    setBwEntries(
      (bw ?? []).map((b: any) => ({ date: b.date, weight: Number(b.weight) })),
    );

    // Habits + checkins — use the real columns (member_id, habit_name).
    // Unlock the programme habit stack for the current week first, then read.
    await ensureAccHabitsUnlocked(week);
    const stack = await getAccWeekHabits(week);
    setWeekHabits(stack);
    const { data: mh } = await supabase
      .from("member_habits")
      .select("id, habit_id, habit_name, status")
      .eq("member_id", user.id);
    setMemberHabits((mh ?? []) as any);
    const { data: hc } = await supabase
      .from("habit_checkins")
      .select("date, habit_id, member_habit_id")
      .eq("member_id", user.id);
    setHabitCheckins((hc ?? []) as any);

    // Photos
    const { data: ph } = await supabase
      .from("member_photos")
      .select("id, url, created_at, is_baseline, phase")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });
    setPhotos((ph ?? []) as any);

    // Latest measurements — member_measurements uses member_id (not user_id)
    // and date (not created_at).
    const { data: meas } = await supabase
      .from("member_measurements")
      .select("*")
      .eq("member_id", user.id)
      .order("date", { ascending: false })
      .limit(1);
    setLatestMeas((meas?.[0] as any) ?? null);

    // Coach info
    if (me.coach_user_id) {
      const { data: coach } = await supabase
        .from("members")
        .select("full_name, email")
        .eq("id", me.coach_user_id)
        .maybeSingle();
      const name =
        (coach as any)?.full_name ||
        (coach as any)?.email?.split("@")[0] ||
        "Your coach";
      setCoachName(name);
      const { data: coachAuth } = await supabase
        .from("user_settings")
        .select("value")
        .eq("user_id", me.coach_user_id)
        .eq("key", "avatar_url")
        .maybeSingle();
      setCoachAvatar((coachAuth as any)?.value || null);
    }

    setLoading(false);
  }, [isPreview]);

  useEffect(() => {
    load();
  }, [load]);

  // When preview data changes (e.g. week selector), update state.
  useEffect(() => {
    if (!isPreview || !previewData) return;
    setClient(previewData.client);
    setCohort(previewData.cohort);
    setWeekContent(previewData.weekContent);
    setCheckins(previewData.checkins);
    setBwEntries(previewData.bwEntries);
    setHabitCheckins(previewData.habitCheckins);
    setMemberHabits(previewData.memberHabits);
    setWeekHabits(previewData.weekHabits ?? []);
    setPhotos(previewData.photos);
    setLatestMeas(previewData.latestMeas);
    setCoachName(previewData.coachName);
    setCoachAvatar(previewData.coachAvatar);
  }, [previewData, isPreview]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file || !client) return;
    try {
      const up = await toDisplayableImage(file);
      const ext = up.name.split(".").pop();
      const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, up);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("member_photos").insert({
        member_id: user!.id,
        url: data.publicUrl,
        phase: "progress",
        is_baseline: false,
      });
      load();
    } catch (err: any) {
      console.error("photo upload failed", err);
    } finally {
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!cohort || !client) {
    return (
      <p className="text-center text-muted-foreground py-12">
        You're not enrolled in an active programme.
      </p>
    );
  }

  const week =
    isPreview && previewWeek != null
      ? previewWeek
      : effectiveWeekOf(cohort, client);
  const today = new Date();
  const weekEnd = new Date(cohort.start_date + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + week * 7);
  const daysLeft = Math.max(
    0,
    Math.ceil((weekEnd.getTime() - today.getTime()) / 86400000),
  );

  const avgWeight = rollingAverage(bwEntries);
  const baselineWeight = client.baseline?.weight
    ? Number(client.baseline.weight)
    : bwEntries.length > 0
      ? bwEntries[0].weight
      : null;
  const weightDelta =
    avgWeight != null && baselineWeight != null
      ? Number((avgWeight - baselineWeight).toFixed(1))
      : null;
  const sparkPts = sparklinePoints(bwEntries);

  // Then = baseline poses from client.baseline.photos (PosePhotos);
  // fall back to legacy array [front, side] by index.
  const thenPhotos: PosePhotos = (() => {
    const bp: any = (client.baseline as any)?.photos;
    if (bp && typeof bp === "object" && !Array.isArray(bp)) {
      return {
        front: bp.front ?? null,
        side: bp.side ?? null,
        back: bp.back ?? null,
      };
    }
    if (Array.isArray(bp)) {
      return { front: bp[0] ?? null, side: bp[1] ?? null, back: bp[2] ?? null };
    }
    return { front: null, side: null, back: null };
  })();

  // Now = most recent submitted checkin whose responses.photos has any pose.
  const nowPhotos: PosePhotos = (() => {
    const latest = [...checkins]
      .filter((c) => c.submitted_at && (c.responses as any)?.photos)
      .sort((a, b) => b.week_number - a.week_number)[0];
    const np = (latest?.responses as any)?.photos;
    if (np && typeof np === "object" && !Array.isArray(np)) {
      return {
        front: np.front ?? null,
        side: np.side ?? null,
        back: np.back ?? null,
      };
    }
    return { front: null, side: null, back: null };
  })();

  const weeklyDone = (w: number) =>
    checkins.some((c) => c.week_number === w && c.submitted_at);
  const checkinDue = !weeklyDone(week) && week >= 1 && week <= 6;
  // Last week's check-in is still open if they moved into a new week without
  // completing it — keep it accessible so they can catch up.
  const prevWeek = week - 1;
  const prevCheckinOpen =
    prevWeek >= 1 && prevWeek <= 6 && !weeklyDone(prevWeek);

  const latestReply = [...checkins]
    .filter((c) => c.coach_replied_at)
    .sort(
      (a, b) =>
        new Date(b.coach_replied_at!).getTime() -
        new Date(a.coach_replied_at!).getTime(),
    )[0];

  const latestCheckinWithSteps = [...checkins]
    .filter((c) => c.submitted_at && c.avg_steps != null)
    .sort((a, b) => b.week_number - a.week_number)[0];
  const lastWeekAvgSteps = latestCheckinWithSteps?.avg_steps ?? null;

  const habitRings: HabitRingData[] = (() => {
    const rows = memberHabits as any[];
    // Order + "new this week" tag from the programme stack when available.
    const stack = weekHabits.length
      ? weekHabits
      : rows.map((h, i) => ({
          habit_id: Number(h.habit_id ?? i),
          week_number: 0,
          sort: i,
          name: h.habit_name || h.name || `Habit ${i + 1}`,
        }));
    const rings: HabitRingData[] = [];
    for (const s of stack) {
      const row = rows.find((h) => Number(h.habit_id) === Number(s.habit_id));
      if (!row) continue;
      rings.push({
        id: row.id,
        name: s.name || row.habit_name || row.name || "Habit",
        newThisWeek: s.week_number === week,
        checkins: habitCheckins.filter(
          (c) => c.member_habit_id === row.id || c.habit_id === row.id,
        ),
      });
    }
    // Fallback if the stack didn't match any member_habits rows.
    if (rings.length === 0) {
      for (const h of rows) {
        rings.push({
          id: h.id,
          name: h.habit_name || h.name || "Habit",
          newThisWeek: false,
          checkins: habitCheckins.filter(
            (c) => c.member_habit_id === h.id || c.habit_id === h.id,
          ),
        });
      }
    }
    return rings;
  })();

  const todayStr = new Date().toISOString().split("T")[0];

  // Toggle a single habit's check-in for today (on/off) with optimistic update.
  const handleToggleHabit = async (habitId: string) => {
    if (readOnly) return;
    const doneToday = habitCheckins.some(
      (c) =>
        c.date.slice(0, 10) === todayStr &&
        (c.member_habit_id === habitId || c.habit_id === habitId),
    );

    // Optimistic update
    if (doneToday) {
      setHabitCheckins((prev) =>
        prev.filter(
          (c) =>
            !(
              c.date.slice(0, 10) === todayStr &&
              (c.member_habit_id === habitId || c.habit_id === habitId)
            ),
        ),
      );
    } else {
      setHabitCheckins((prev) => [
        ...prev,
        { date: todayStr, habit_id: null, member_habit_id: habitId },
      ]);
    }

    const payload = { member_habit_id: habitId, date: todayStr };
    const res = doneToday
      ? await deleteHabitCheckin(payload)
      : await saveHabitCheckin(payload);

    if (!res?.success) {
      toast.error("Couldn't update habit — try again");
      load();
    }
  };

  // Inches off (sum of measurement deltas)
  const inchesOff = (() => {
    if (!client.baseline || !latestMeas) return null;
    let total = 0;
    let any = false;
    for (const key of ["waist", "tummy", "chest", "thigh"]) {
      const b = client.baseline[key] ? Number(client.baseline[key]) : null;
      const n = latestMeas[key] ? Number(latestMeas[key]) : null;
      if (b != null && n != null) {
        total += Math.max(0, b - n);
        any = true;
      }
    }
    return any ? Number(total.toFixed(1)) : null;
  })();

  const bestStreak = habitRings.reduce(
    (max, h) => Math.max(max, habitStreakSimple(habitCheckins, h.id)),
    0,
  );
  const wins = buildWins({
    bestStreak,
    weightDelta,
    inchesOff,
    checkinsCompleted: checkins.filter((c) => c.submitted_at).length,
  });

  const onStartCheckin = () => {
    if (readOnly) return;
    if (week === 6) onOpenFinal?.();
    else onOpenCheckin?.(week);
  };

  const obStatus = onboardingStatus(client);
  const showFinishSetup = week >= 1 && !obStatus.complete;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {readOnly && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 py-1.5 text-xs font-medium text-primary">
          <Eye className="w-3.5 h-3.5" /> Preview — read only
        </div>
      )}

      {showFinishSetup && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-base">
                Finish setting up — about 5 minutes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your coach needs a few things before day 1.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {obStatus.missing.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-500"
                  >
                    {ONBOARDING_ITEM_SHORT_LABELS[m] || m}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {!readOnly && (
                  <Button
                    size="sm"
                    onClick={() => onOpenOnboarding?.()}
                    className="gap-1.5"
                  >
                    Complete setup <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                <a
                  href="#week-0"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!readOnly) window.location.hash = "#week-0";
                  }}
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Start here — watch the setup videos
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <HeroCard
        week={week}
        weekContent={weekContent}
        daysLeft={daysLeft}
        coachName={coachName}
        coachAvatar={coachAvatar}
        why={client.why}
      />

      <LessonCard
        content={weekContent}
        week={week}
        checkinDue={checkinDue}
        checkinDone={weeklyDone(week)}
        onStartCheckin={onStartCheckin}
        readOnly={readOnly}
      />

      {/* Catch-up: last week's check-in is still open */}
      {!readOnly && prevCheckinOpen && (
        <button
          type="button"
          onClick={() => onOpenCheckin?.(prevWeek)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-left dark:border-amber-900/50 dark:bg-amber-950/30"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              You still have last week's check-in to do
            </p>
            <p className="text-xs text-muted-foreground">
              Week {prevWeek} check-in isn't finished — tap to complete it.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">
            Open Week {prevWeek}
          </span>
        </button>
      )}

      <LiveCallCard
        callUrl={cohort.call_url}
        callLabel={cohort.call_label}
        readOnly={readOnly}
      />

      <FormsStatusCard
        onboardingDone={client.onboarding_done}
        clientCreated={client.created_at}
        weeklyDone={weeklyDone}
        week={week}
        onOpenWeek={readOnly ? undefined : (w) => onOpenCheckin?.(w)}
      />

      <HabitsCard
        habits={habitRings}
        onToggleHabit={handleToggleHabit}
        onLogToday={() => {
          if (readOnly) return;
          window.location.hash = "#log-habits";
        }}
        today={todayStr}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <WeightCard
          avgWeight={avgWeight}
          weightDelta={weightDelta}
          points={sparkPts}
        />
        <StepsCard
          stepTarget={client.step_target ? Number(client.step_target) : null}
          lastWeekAvg={lastWeekAvgSteps}
        />
      </div>

      <NonScaleTrends checkins={checkins} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhotosCard
          thenPhotos={thenPhotos}
          nowPhotos={nowPhotos}
          week={week}
          onUpload={handlePhotoUpload}
          readOnly={readOnly}
        />
        <MeasurementsCard client={client} latestMeas={latestMeas} />
      </div>

      {latestReply && (
        <CoachReplyCard
          reply={latestReply}
          coachName={coachName}
          coachAvatar={coachAvatar}
        />
      )}

      {client.sos_plan && (
        <SosPlanCard
          sosPlan={client.sos_plan}
          clientId={client.id}
          readOnly={readOnly}
          onSaved={load}
        />
      )}

      <WinsStrip wins={wins} />
    </div>
  );
}

// Local simple streak to avoid circular import
function habitStreakSimple(
  checkins: {
    date: string;
    habit_id: string | null;
    member_habit_id?: string | null;
  }[],
  habitId: string,
): number {
  const days = new Set(
    checkins
      .filter((c) => c.member_habit_id === habitId || c.habit_id === habitId)
      .map((c) => c.date.slice(0, 10)),
  );
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default AccountabilityDashboard;
