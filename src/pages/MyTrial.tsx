import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Camera,
  Calendar,
  Salad,
  ChevronRight,
  ArrowRight,
  Target,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTrialSummary,
  isTrialEligible,
  REVIEW_BOOKING_URL,
  type ProgressSummary,
} from "@/lib/trialSummary";
import { getMyGymMember, deleteMemberPhoto } from "@/lib/store";
import { TrialGoalsCard } from "@/components/TrialGoalsCard";
import { uploadProgressPhoto, saveMemberPhoto } from "@/lib/trialGoals";
import { toast } from "@/components/ui/sonner";

const fmtKg = (n: number) => n.toLocaleString();

const MyTrial = () => {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const member = await getMyGymMember();
        const ok = !!member && isTrialEligible(member.product);
        setEligible(ok);
        if (!ok) {
          setLoading(false);
          return;
        }
        const s = await getTrialSummary();
        setSummary(s);
      } catch {
        setEligible(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addProgressPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadProgressPhoto(file);
      if ("error" in res) {
        toast.error("Photo upload failed: " + res.error);
        return;
      }
      await saveMemberPhoto({
        url: res.url,
        date: new Date().toISOString().split("T")[0],
        pose: "front",
        phase: "progress",
      });
      toast.success("Progress photo added");
      // Refresh summary so the new photo appears immediately.
      const s = await getTrialSummary();
      setSummary(s);
    } catch (err: any) {
      toast.error("Couldn't save photo: " + (err?.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const removeProgressPhoto = async (photo: any) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      const res = await deleteMemberPhoto(photo);
      if (res.success) {
        toast.success("Photo deleted");
        // Refresh summary so the strip re-resolves from remaining photos.
        const s = await getTrialSummary();
        setSummary(s);
      } else {
        toast.error("Couldn't delete photo. Please try again.");
      }
    } catch (err: any) {
      toast.error(
        "Couldn't delete photo: " + (err?.message || "Unknown error"),
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 pt-20 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="max-w-md mx-auto p-6 pt-24 text-center space-y-3">
        <h1 className="font-heading text-2xl tracking-wide uppercase">
          Not available
        </h1>
        <p className="text-sm text-muted-foreground">
          Your 30-day progress is part of the trial experience.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back home
        </Button>
      </div>
    );
  }

  const s = summary;
  if (!s) return null;

  const hasHero =
    s.coachedUsed > 0 || s.coachedUpcoming > 0 || s.classesCount > 0;
  const hasStrength = s.prs.length > 0;
  const hasBody =
    s.weightDelta !== undefined || (s.measurements && s.measurements.length);
  const hasHabits =
    s.bestStreak > 0 || s.habitsBuilt > 0 || s.totalCheckins > 0;
  const hasNutrition = s.daysLogged > 0;
  const hasVolume = s.totalVolumeKg > 0 || s.loggedSessions > 0;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16 md:pt-20 pb-24 space-y-5">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Eat Train Live
        </p>
        <h1 className="font-heading text-3xl md:text-4xl tracking-wide uppercase leading-none">
          {s.firstName}, your 30 days
        </h1>
        <p className="text-sm text-muted-foreground">
          Day {s.dayCount} of {s.totalDays}
        </p>
      </header>

      {/* Starting point & 30-day goals — persistent until captured */}
      <TrialGoalsCard />

      {/* Your progress photos — thumbnail strip (newest first) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Your progress photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {/* Add-photo tile */}
            <label className="shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-lg border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-muted/60 transition text-primary">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium text-center px-1 leading-tight">
                {uploading ? "Uploading" : "Add photo"}
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={addProgressPhoto}
                disabled={uploading}
              />
            </label>
            {(s.photos || []).map((p, i) => (
              <figure
                key={(p.url || "") + i}
                className="shrink-0 w-24 sm:w-28 space-y-1"
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border group">
                  <img
                    src={p.url}
                    alt={`Progress photo ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeProgressPhoto(p)}
                    title="Delete photo"
                    aria-label="Delete photo"
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:bg-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {p.is_baseline && (
                    <span className="absolute top-1 left-1 text-[8px] font-bold uppercase bg-primary text-primary-foreground rounded px-1">
                      Base
                    </span>
                  )}
                </div>
                <figcaption className="text-[10px] text-muted-foreground text-center truncate">
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hero — coached PT + total activity */}
      {hasHero && (
        <Card className="bg-primary/10 border-primary/40">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-heading text-2xl md:text-3xl tracking-wide leading-none">
                  {s.coachedUsed} of {s.coachedTotal} PT sessions
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {s.coachedUsed > 0
                    ? "Used so far"
                    : "Ready to book your first one"}
                  {s.coachedUpcoming > 0
                    ? ` · ${s.coachedUpcoming} more booked`
                    : ""}
                </p>
              </div>
            </div>
            {(s.classesCount > 0 || hasVolume) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium pt-1 border-t border-primary/20">
                {s.classesCount > 0 && (
                  <span className="text-primary">
                    + {s.classesCount} classes &amp; sessions
                  </span>
                )}
                {s.classesCount > 0 && hasVolume && (
                  <span className="text-muted-foreground">·</span>
                )}
                {hasVolume && (
                  <span className="text-primary">
                    {fmtKg(s.totalVolumeKg)} kg lifted
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consistency strip */}
      {hasVolume && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Showing up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {s.loggedSessions} session{s.loggedSessions === 1 ? "" : "s"}{" "}
              logged in the app
              {s.bestStreak > 0
                ? ` · best run of ${s.bestStreak} day${s.bestStreak === 1 ? "" : "s"} in a row`
                : ""}
              . You're becoming someone who trains.
            </p>
            <div className="flex flex-wrap gap-1.5" aria-hidden>
              {Array.from({ length: s.totalDays }).map((_, i) => {
                const active = i < s.dayCount;
                return (
                  <div
                    key={i}
                    className={
                      "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full " +
                      (active ? "bg-primary/70" : "bg-muted")
                    }
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Targets vs actual */}
      {s.goals?.sessionsPerWeek && s.goals.sessionsPerWeek > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> On target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Sessions per week
              </span>
              <span className="font-bold">
                {s.sessionsPerWeekActual} / {s.goals.sessionsPerWeek}
              </span>
            </div>
            {s.goals.stepTarget && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Daily step goal
                </span>
                <span className="font-bold">
                  {s.goals.stepTarget.toLocaleString()}
                </span>
              </div>
            )}
            {s.goals.calorieTarget && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Daily calories
                </span>
                <span className="font-bold">
                  {s.goals.calorieTarget.toLocaleString()} kcal
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strength wins */}
      {hasStrength && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Strength wins
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.prs.map((pr) => (
              <div
                key={pr.exercise}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize truncate">
                    {pr.exercise.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pr.start} kg → {pr.now} kg
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-primary font-bold text-sm bg-primary/10 rounded-full px-3 py-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +{pr.gain} kg
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Body change */}
      {hasBody && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" /> Body change
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {s.weightDelta !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Body weight
                </span>
                <span
                  className={
                    "font-bold " +
                    (s.weightDelta < 0 ? "text-primary" : "text-foreground")
                  }
                >
                  {s.weightDelta > 0 ? "+" : ""}
                  {s.weightDelta} kg
                </span>
              </div>
            )}
            {s.measurements?.map((m) => (
              <div key={m.metric} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">
                  {m.metric}
                </span>
                <span
                  className={
                    "font-bold " +
                    (m.delta < 0 ? "text-primary" : "text-foreground")
                  }
                >
                  {m.delta > 0 ? "+" : ""}
                  {m.delta} cm
                </span>
              </div>
            ))}
            {s.beforePhoto && s.afterPhoto && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <figure className="space-y-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={s.beforePhoto}
                      alt="Before"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <figcaption className="text-xs text-muted-foreground text-center">
                    Before
                  </figcaption>
                </figure>
                <figure className="space-y-1">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={s.afterPhoto}
                      alt="After"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <figcaption className="text-xs text-muted-foreground text-center">
                    Now
                  </figcaption>
                </figure>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Habits + nutrition */}
      {(hasHabits || hasNutrition) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wide flex items-center gap-2">
              <Salad className="w-5 h-5 text-primary" /> Habits &amp; nutrition
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            {hasHabits && (
              <div className="space-y-0.5">
                <p className="font-heading text-2xl text-primary">
                  {s.bestStreak}
                </p>
                <p className="text-xs text-muted-foreground">best streak</p>
              </div>
            )}
            {hasHabits && (
              <div className="space-y-0.5">
                <p className="font-heading text-2xl text-primary">
                  {s.habitsBuilt}
                </p>
                <p className="text-xs text-muted-foreground">habits built</p>
              </div>
            )}
            {hasNutrition && (
              <div className="space-y-0.5">
                <p className="font-heading text-2xl text-primary">
                  {s.daysLogged}
                </p>
                <p className="text-xs text-muted-foreground">nutrition days</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Forward + CTA */}
      <Card className="bg-card border-border border-l-4 border-l-primary">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg tracking-wide leading-tight">
              Imagine where 90 days takes you
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Book your end-of-trial review with your coach.
            </p>
          </div>
          <a
            href={REVIEW_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button size="sm" className="gap-1">
              Book my review <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => navigate("/progress")}
        >
          Full progress <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MyTrial;
