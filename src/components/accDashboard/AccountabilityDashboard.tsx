import { useEffect, useState, useCallback } from "react";
import { Loader2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import { toast } from "@/components/ui/sonner";
import {
  getActiveCohort,
  getMyClientRecord,
  currentWeekOf,
  type AccClient,
  type AccCohort,
} from "@/lib/accountabilityProgramme";
import { getMyCheckins, type AccCheckin } from "@/lib/accountabilityCheckins";
import { getWeekContent } from "@/lib/accWeekContent";
import {
  rollingAverage,
  sparklinePoints,
  buildWins,
} from "@/lib/accDashboardHelpers";
import type { PreviewData } from "@/lib/accPreviewData";

import { HeroCard } from "@/components/accDashboard/Hero";
import { LessonCard } from "@/components/accDashboard/Lesson";
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
} from "@/components/accDashboard/Sections";

export interface DashboardProps {
  onOpenOnboarding?: () => void;
  onOpenCheckin?: () => void;
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
    { id: string; name: string }[]
  >(previewData?.memberHabits ?? []);
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
    const [cks, wc] = await Promise.all([
      getMyCheckins(me.id),
      getWeekContent(currentWeekOf(c.start_date, c.weeks)),
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

    // Habits + checkins
    const { data: mh } = await supabase
      .from("member_habits")
      .select("id, name")
      .eq("user_id", user.id);
    setMemberHabits((mh ?? []) as any);
    const { data: hc } = await supabase
      .from("habit_checkins")
      .select("date, habit_id, member_habit_id")
      .eq("user_id", user.id);
    setHabitCheckins((hc ?? []) as any);

    // Photos
    const { data: ph } = await supabase
      .from("member_photos")
      .select("id, url, created_at, is_baseline, phase")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });
    setPhotos((ph ?? []) as any);

    // Latest measurements
    const { data: meas } = await supabase
      .from("member_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
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
      const ext = file.name.split(".").pop();
      const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
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
      : currentWeekOf(cohort.start_date, cohort.weeks);
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

  const baselinePhoto =
    photos.find((p) => p.is_baseline) || photos[photos.length - 1];
  const latestPhoto = photos.find((p) => !p.is_baseline) || photos[0];

  const weeklyDone = (w: number) =>
    checkins.some((c) => c.week_number === w && c.submitted_at);
  const checkinDue = !weeklyDone(week) && week >= 1 && week <= 6;

  const latestReply = [...checkins]
    .filter((c) => c.coach_replied_at)
    .sort(
      (a, b) =>
        new Date(b.coach_replied_at!).getTime() -
        new Date(a.coach_replied_at!).getTime(),
    )[0];

  const habitRings: HabitRingData[] = memberHabits.map((h) => ({
    id: h.id,
    name: h.name,
    checkins: habitCheckins.filter(
      (c) => c.member_habit_id === h.id || c.habit_id === h.id,
    ),
  }));

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
    else onOpenCheckin?.();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {readOnly && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 py-1.5 text-xs font-medium text-primary">
          <Eye className="w-3.5 h-3.5" /> Preview — read only
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
      />

      <FormsStatusCard
        onboardingDone={client.onboarding_done}
        clientCreated={client.created_at}
        weeklyDone={weeklyDone}
        week={week}
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
        <StepsCard stepTarget={client.step_target || 8000} />
      </div>

      <NonScaleTrends checkins={checkins} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhotosCard
          baselinePhoto={baselinePhoto}
          latestPhoto={latestPhoto}
          week={week}
          onUpload={handlePhotoUpload}
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

      {client.sos_plan && <SosPlanCard sosPlan={client.sos_plan} />}

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
