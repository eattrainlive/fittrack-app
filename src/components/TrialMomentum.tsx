import { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  TrendingUp,
  Calendar,
  Flame,
  ArrowRight,
  CheckCircle2,
  Circle,
  Flag,
  Lock,
  Camera,
} from "lucide-react";
import { TrialWeekContent } from "@/components/TrialWeekContent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import {
  getTrialMomentum,
  getTrialHubContent,
  type TrialMomentumData,
  type TrialHubContent,
} from "@/lib/trialHub";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import {
  HabitsCard,
  type HabitRingData,
} from "@/components/accDashboard/Habits";
import { EditHabitsDialog } from "@/components/EditHabitsDialog";

export const TrialMomentum = () => {
  const [data, setData] = useState<TrialMomentumData | null>(null);
  const [content, setContent] = useState<TrialHubContent | null>(null);
  const [loading, setLoading] = useState(true);

  // Habits + checkins (reused from the accountability dashboard)
  const [memberHabits, setMemberHabits] = useState<
    {
      id: string;
      habit_id: string | null;
      habit_name: string | null;
      habits?: { name: string } | null;
      name?: string;
    }[]
  >([]);
  const [habitCheckins, setHabitCheckins] = useState<
    { date: string; habit_id: string | null; member_habit_id: string | null }[]
  >([]);

  // Photos (reused)
  const [photos, setPhotos] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, c] = await Promise.all([
      getTrialMomentum(),
      getTrialHubContent(),
    ]);
    setData(d);
    setContent(c);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Member habits — read the same table the setup step writes to.
      // Join the habits library to resolve the display name for preset habits;
      // custom habits use habit_name directly.
      const { data: mh } = await supabase
        .from("member_habits")
        .select("id, habit_id, habit_name, habits(name)")
        .eq("member_id", user.id);
      setMemberHabits((mh ?? []) as any);

      const { data: hc } = await supabase
        .from("habit_checkins")
        .select("date, habit_id, member_habit_id")
        .eq("member_id", user.id);
      setHabitCheckins((hc ?? []) as any);

      const { data: ph } = await supabase
        .from("member_photos")
        .select("id, url, created_at, is_baseline, phase")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });
      setPhotos((ph ?? []) as any);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Couldn't load your trial data.
      </p>
    );
  }

  const {
    day,
    daysLeft,
    sessionsAttended,
    totalVolume,
    bestStreak,
    attendedDays,
    prs,
    weightDelta,
    beforePhoto,
    afterPhoto,
    goalText,
  } = data;

  // Roadmap milestones
  const milestones = [
    { label: "Set your starting point", done: true },
    { label: "First session done", done: sessionsAttended >= 1 },
    { label: "First PB", done: prs.length > 0 },
    { label: "Hit a habit streak", done: bestStreak >= 3 },
    {
      label: "Book your 30-day review",
      done: false,
      isFlag: true,
      locked: day < 18,
    },
  ];

  const nextMilestone = milestones.find((m) => !m.done);

  const reviewUrl = content?.review_booking_url;

  // Compute trial week (1..4) from the day number.
  const trialWeek = Math.min(4, Math.floor((day - 1) / 7) + 1);

  // Build habit ring data. Rings key on the member_habits row id (h.id) so
  // check-ins match by member_habit_id — works for library AND custom habits.
  const habitRings: HabitRingData[] = memberHabits
    .map((h) => {
      const name = h.habit_name || h.habits?.name || h.name;
      const checkins = habitCheckins.filter(
        (c) => c.member_habit_id === h.id || c.habit_id === h.id,
      );
      return { id: h.id, name: name || "Habit", checkins };
    })
    .filter((h) => h.name && h.name !== "Habit");

  // Photos for the PhotosCard
  const baselinePhoto =
    photos.find((p) => p.is_baseline) || photos[photos.length - 1];
  const latestPhoto = photos.find((p) => !p.is_baseline) || photos[0];

  const uploadPhoto = async (
    file: File,
    isBaseline: boolean,
  ): Promise<boolean> => {
    try {
      const ext = file.name.split(".").pop();
      const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("member_photos").insert({
        member_id: user!.id,
        url: pub.publicUrl,
        phase: isBaseline ? "before" : "progress",
        is_baseline: isBaseline,
      });
      return true;
    } catch (err: any) {
      toast.error("Photo upload failed: " + (err?.message || ""));
      return false;
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await uploadPhoto(file, false);
    if (ok) {
      toast.success("Photo added");
      load();
    }
    e.target.value = "";
  };

  const handleBaselineUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await uploadPhoto(file, true);
    if (ok) {
      toast.success("Baseline photo added");
      load();
    }
    e.target.value = "";
  };

  const today = new Date().toISOString().split("T")[0];

  // Toggle a single habit's check-in for today (on/off) with optimistic update.
  const handleToggleHabit = async (habitId: string) => {
    const doneToday = habitCheckins.some(
      (c) =>
        c.date.slice(0, 10) === today &&
        (c.member_habit_id === habitId || c.habit_id === habitId),
    );

    // Optimistic update
    if (doneToday) {
      setHabitCheckins((prev) =>
        prev.filter(
          (c) =>
            !(
              c.date.slice(0, 10) === today &&
              (c.member_habit_id === habitId || c.habit_id === habitId)
            ),
        ),
      );
    } else {
      setHabitCheckins((prev) => [
        ...prev,
        { date: today, habit_id: null, member_habit_id: habitId },
      ]);
    }

    const payload = { member_habit_id: habitId, date: today };
    const res = doneToday
      ? await deleteHabitCheckin(payload)
      : await saveHabitCheckin(payload);

    if (!res?.success) {
      // Revert on failure
      toast.error("Couldn't update habit — try again");
      load();
    }
  };

  // Optional "log all" affordance.
  const handleLogToday = async () => {
    for (const h of memberHabits) {
      const already = habitCheckins.some(
        (c) =>
          c.date.slice(0, 10) === today &&
          (c.member_habit_id === h.id || c.habit_id === h.id),
      );
      if (!already) {
        await saveHabitCheckin({ member_habit_id: h.id, date: today });
      }
    }
    toast.success("Habits logged for today — nice work!");
    load();
  };

  return (
    <div className="space-y-5">
      {/* Weekly education + tasks */}
      <TrialWeekContent currentWeek={trialWeek} />

      {/* Keystone habits — reused ring UI */}
      {habitRings.length > 0 && (
        <HabitsCard
          habits={habitRings}
          onToggleHabit={handleToggleHabit}
          onLogToday={handleLogToday}
          editControl={
            <EditHabitsDialog
              currentHabits={memberHabits as any}
              onSaved={load}
            />
          }
          today={today}
        />
      )}

      {/* Countdown hero */}
      <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5 text-center">
        <div className="relative inline-flex items-center justify-center mb-2">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-primary"
              strokeLinecap="round"
              strokeDasharray={`${(day / 30) * 276} 276`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-3xl font-bold leading-none">
              {day}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              of 30
            </span>
          </div>
        </div>
        <p className="font-heading text-lg tracking-wide uppercase">
          {sessionsAttended} sessions · {totalVolume.toLocaleString()} kg lifted
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          You're becoming someone who trains.
        </p>
      </div>

      {/* Journey roadmap */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-heading text-lg tracking-wide uppercase mb-4">
            Your journey
          </h2>
          <div className="space-y-3">
            {milestones.map((m, i) => {
              const isNext = m === nextMilestone;
              return (
                <div
                  key={i}
                  className={
                    "flex items-center gap-3 " + (m.locked ? "opacity-40" : "")
                  }
                >
                  {m.done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : m.isFlag ? (
                    m.locked ? (
                      <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <Flag className="w-5 h-5 text-primary shrink-0" />
                    )
                  ) : isNext ? (
                    <Circle className="w-5 h-5 text-primary shrink-0 fill-primary/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={
                      "text-sm " +
                      (isNext
                        ? "font-bold text-primary"
                        : m.done
                          ? "text-muted-foreground line-through"
                          : "")
                    }
                  >
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{sessionsAttended}</p>
            <p className="text-xs text-muted-foreground">Sessions attended</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalVolume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">kg lifted</p>
          </CardContent>
        </Card>
      </div>

      {/* 30-day streak calendar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg tracking-wide uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 30-day calendar
            </h2>
            {bestStreak > 0 && (
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> {bestStreak}-day streak
              </span>
            )}
          </div>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const attended = attendedDays.includes(i);
              const isToday = i === day - 1;
              return (
                <div
                  key={i}
                  className={
                    "aspect-square rounded text-[10px] flex items-center justify-center font-bold " +
                    (attended
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/20 border border-primary text-primary"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Progress photos — reused card with tappable baseline */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-heading text-base mb-2">Photos</h2>
          <div className="grid grid-cols-2 gap-2">
            {/* Before tile — tappable to add baseline if missing */}
            {baselinePhoto?.url ? (
              <div className="rounded-lg overflow-hidden border border-border aspect-[3/4] bg-muted/30">
                <img
                  src={baselinePhoto.url}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
                <span className="block text-[10px] text-center py-0.5 bg-card/80 border-t border-border">
                  Before
                </span>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="rounded-lg overflow-hidden border border-dashed border-primary/40 aspect-[3/4] bg-primary/5 flex flex-col items-center justify-center text-center p-2 hover:bg-primary/10 transition">
                  <Camera className="w-5 h-5 text-primary mb-1" />
                  <span className="text-[10px] text-primary font-medium">
                    Add baseline photo
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBaselineUpload}
                />
              </label>
            )}
            {/* Now tile */}
            {latestPhoto?.url ? (
              <div className="rounded-lg overflow-hidden border border-border aspect-[3/4] bg-muted/30">
                <img
                  src={latestPhoto.url}
                  alt="Now"
                  className="w-full h-full object-cover"
                />
                <span className="block text-[10px] text-center py-0.5 bg-card/80 border-t border-border">
                  Now
                </span>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="rounded-lg overflow-hidden border border-dashed border-border aspect-[3/4] bg-muted/30 flex flex-col items-center justify-center text-center p-2 hover:bg-muted/50 transition">
                  <Camera className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">
                    Add a photo
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            )}
          </div>
          <label className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 cursor-pointer transition">
            <Camera className="w-3.5 h-3.5" /> Add now
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
          {(trialWeek === 3 || trialWeek === 4) && !latestPhoto?.url && (
            <p className="text-[11px] text-amber-600 mt-1.5 text-center">
              📸 {trialWeek === 3 ? "Mid-point" : "Final"} photo due this week
            </p>
          )}
        </CardContent>
      </Card>

      {/* Wins — PBs */}
      {prs.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-heading text-lg tracking-wide uppercase mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Your wins
            </h2>
            <div className="space-y-2">
              {prs.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{p.exercise}</span>
                  <span className="text-primary font-bold">
                    {p.start}kg → {p.now}kg
                    <span className="text-xs ml-1">(+{p.gain}kg)</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wins — Body change */}
      {(weightDelta != null || (beforePhoto && afterPhoto)) && (
        <Card>
          <CardContent className="p-5">
            <h2 className="font-heading text-lg tracking-wide uppercase mb-3">
              Body change
            </h2>
            {weightDelta != null && (
              <p className="text-sm mb-3">
                <span className="font-bold text-primary">
                  {weightDelta > 0 ? "+" : ""}
                  {weightDelta} kg
                </span>{" "}
                since you started
              </p>
            )}
            {beforePhoto && afterPhoto && beforePhoto !== afterPhoto && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <img
                    src={beforePhoto}
                    alt="Before"
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Before
                  </p>
                </div>
                <div>
                  <img
                    src={afterPhoto}
                    alt="Now"
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Now
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goal reminder */}
      {goalText && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-primary font-bold mb-1">
              Your goal
            </p>
            <p className="text-sm italic">"{goalText}"</p>
          </CardContent>
        </Card>
      )}

      {/* The close — review CTA */}
      {day >= 18 && (
        <div
          className={
            "rounded-2xl p-5 text-center transition " +
            (daysLeft <= 7
              ? "bg-primary text-primary-foreground"
              : "bg-primary/15 border border-primary/30")
          }
        >
          <p
            className={
              "font-heading text-3xl font-bold tracking-wide " +
              (daysLeft <= 7 ? "" : "text-primary")
            }
          >
            {daysLeft} days left
          </p>
          <p
            className={
              "text-sm mt-1 mb-4 " +
              (daysLeft <= 7
                ? "text-primary-foreground/80"
                : "text-muted-foreground")
            }
          >
            Book your 30-day review — let's see how far you've come.
          </p>
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer">
              <Button
                className={
                  "gap-2 font-bold " +
                  (daysLeft <= 7
                    ? "bg-background text-primary hover:bg-background/90"
                    : "")
                }
              >
                Book my review <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default TrialMomentum;
