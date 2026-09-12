import { useEffect, useState } from "react";
import {
  Dumbbell,
  Calendar,
  TrendingUp,
  Flame,
  Salad,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  Loader2,
  Share2,
  Scale,
  Footprints,
  Sparkles,
  CalendarCheck,
  CalendarX,
  DoorOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { REVIEW_BOOKING_URL, type ProgressSummary } from "@/lib/trialSummary";

const PRIMARY_GOAL_LABELS: Record<string, string> = {
  fat_loss: "Fat Loss 🔥",
  strength: "Strength 💪",
  fitness: "Fitness 🏃",
  health: "Health ❤️",
};

interface MemberProps {
  id: string;
  email?: string;
  full_name?: string;
  product?: string;
  joined_on?: string;
  created_at?: string;
}

interface CoachTrialReviewModalProps {
  member: MemberProps | null;
  staffSecret?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachTrialReviewModal({
  member,
  staffSecret,
  open,
  onOpenChange,
}: CoachTrialReviewModalProps) {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member) {
      setSummary(null);
      return;
    }

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const joinDate = member.joined_on || member.created_at;
        const joined = joinDate ? new Date(joinDate) : new Date();
        const start = joined.toISOString();
        const end30 = new Date(joined.getTime() + 30 * 24 * 60 * 60 * 1000);
        const end = new Date(
          Math.min(end30.getTime(), Date.now()),
        ).toISOString();

        // STAFF MODE ONLY — always call the edge function with the staff secret.
        // NEVER fall back to client-side compute: that reads the caller's own
        // data (the coach's), which is the bug this fixes. If the function
        // fails or returns 403, show an error instead of wrong data.
        if (!staffSecret) {
          throw new Error("Missing staff secret — cannot load member data.");
        }
        const { data, error } = await supabase.functions.invoke(
          "progress-summary",
          {
            body: {
              staffSecret,
              memberUserId: member.id || null,
              memberEmail: member.email || null,
              start,
              end,
              memberType: "trial",
            },
          },
        );
        if (error) {
          throw new Error(
            error.message ||
              "Failed to load trial summary (check staff secret).",
          );
        }
        if (!data || data.error) {
          throw new Error(
            data?.error || "No data returned from progress-summary.",
          );
        }
        if (isMounted) {
          setSummary(data as ProgressSummary);
        }
      } catch (e: any) {
        toast.error(
          "Failed to load trial summary: " + (e?.message || "Unknown error"),
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, member, staffSecret]);

  if (!member) return null;

  const joinedStr = member.joined_on || member.created_at;
  const joinedDate = joinedStr ? new Date(joinedStr) : new Date();
  const endDate = new Date(joinedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const trialEnded = Date.now() >= endDate.getTime();
  const daysDiff = Math.max(
    1,
    Math.min(
      30,
      Math.round((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) +
        1,
    ),
  );

  const copyReviewLink = () => {
    navigator.clipboard.writeText(REVIEW_BOOKING_URL);
    toast.success("Review booking link copied to clipboard");
  };

  const generateShareImage = () => {
    toast.info("Share card generator coming soon! Using review link for now.");
  };

  const s = summary;

  // Compute private engagement flags
  const flags: {
    type: "warning" | "caution" | "success" | "info";
    text: string;
  }[] = [];

  if (s) {
    if (s.coachedUsed === 0 && daysDiff >= 7) {
      flags.push({
        type: "warning",
        text: "Not started PT — lead with getting a first session in.",
      });
    }
    if (s.sessionsPerWeekActual === 0 && daysDiff > 5) {
      flags.push({
        type: "caution",
        text: "Gone quiet this week — reconnect before pitching.",
      });
    }
    if (s.coachedUsed >= 6 || s.bestStreak >= 5 || s.prs.length > 0) {
      flags.push({
        type: "success",
        text: "Strong engagement — safe to talk membership + next block.",
      });
    }
    if (s.coachedUsed === 0 && s.classesCount === 0 && s.loggedSessions === 0) {
      flags.push({
        type: "info",
        text: "Thin data — anchor on how they FELT, not numbers.",
      });
    }
  }

  // Compute talking points for Carla
  const talkingPoints: string[] = [];
  if (s) {
    if (s.goals?.sessionsPerWeek) {
      talkingPoints.push(
        `Agreed target: ${s.goals.sessionsPerWeek} sessions/week (actual: ${s.sessionsPerWeekActual} active week${
          s.sessionsPerWeekActual === 1 ? "" : "s"
        }).`,
      );
    }
    if (s.coachedUsed > 0) {
      talkingPoints.push(
        `Used ${s.coachedUsed} of 12 PT sessions (${s.coachedUpcoming} upcoming) — map how a full membership keeps this momentum going.`,
      );
    } else {
      talkingPoints.push(
        `0 of 12 PT sessions used — focus on scheduling their first Semi-Private session.`,
      );
    }
    if (s.prs.length > 0) {
      const topPr = s.prs[0];
      talkingPoints.push(
        `Strength gain: +${topPr.gain} kg on ${topPr.exercise} (${topPr.start} kg → ${topPr.now} kg).`,
      );
    }
    if (s.bestStreak >= 3) {
      talkingPoints.push(
        `Built a ${s.bestStreak}-day habit streak. Remind them they're becoming someone who trains.`,
      );
    }
    if (s.weightDelta !== undefined) {
      talkingPoints.push(
        `Weight change: ${s.weightDelta > 0 ? "+" : ""}${s.weightDelta} kg since starting.`,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="font-heading text-2xl uppercase tracking-wide flex items-center gap-2">
                {member.full_name || "Member"} ·{" "}
                {trialEnded ? "Past Trial Review" : "Trial Review"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {member.email} · {member.product || "30 Day Trial"}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-1"
            >
              {trialEnded ? (
                <>
                  Ended{" "}
                  {endDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </>
              ) : (
                <>
                  Day {daysDiff} of 30 · Ends{" "}
                  {endDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading trial summary…
            </p>
          </div>
        ) : !s ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Could not calculate trial summary for this member.
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Private Coach Cues / Engagement Flags */}
            {flags.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Coach Guidance (Private)
                </p>
                <div className="space-y-2">
                  {flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs font-medium ${
                        flag.type === "warning"
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : flag.type === "caution"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : flag.type === "success"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted/50 border-border text-foreground"
                      }`}
                    >
                      {flag.type === "warning" && (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      {flag.type === "caution" && (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      {flag.type === "success" && (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      {flag.type === "info" && (
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{flag.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review call booking status (mirrored from calendar webhook) */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20">
              {s.reviewBooked ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CalendarCheck className="w-4 h-4" />
                  Review booked
                  {s.reviewAt
                    ? ` · ${new Date(s.reviewAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <CalendarX className="w-4 h-4" />
                  No review booked yet — book a call before the trial ends.
                </div>
              )}
              <a
                href={REVIEW_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {s.reviewBooked ? "Open Booking" : "Book Review"}
                </Button>
              </a>
            </div>

            {/* Headline Wins Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-primary" /> Coached PT
                  </p>
                  <p className="font-heading text-lg">
                    {s.coachedUsed} / {s.coachedTotal}
                  </p>
                  {s.coachedUpcoming > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{s.coachedUpcoming} booked
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" /> Classes
                  </p>
                  <p className="font-heading text-lg">+{s.classesCount}</p>
                  <p className="text-[10px] text-muted-foreground">unlimited</p>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-primary" /> Lifted
                  </p>
                  <p className="font-heading text-lg">
                    {s.totalVolumeKg.toLocaleString()} kg
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.loggedSessions} sessions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Flame className="w-3 h-3 text-primary" /> Streak
                  </p>
                  <p className="font-heading text-lg">{s.bestStreak} days</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.totalCheckins} checkins
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Agreed Goals vs Actual */}
            {s.goals && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />{" "}
                    {s.memberType === "trial"
                      ? "Induction Goals vs Actual"
                      : "Their Goals vs Actual"}
                  </p>

                  {/* Primary goal + typed goal (extended) */}
                  {(s.goals.primaryGoal || s.goals.goalText) && (
                    <div className="space-y-1.5">
                      {s.goals.primaryGoal && (
                        <Badge variant="secondary" className="font-semibold">
                          {PRIMARY_GOAL_LABELS[s.goals.primaryGoal] ||
                            s.goals.primaryGoal}
                        </Badge>
                      )}
                      {s.goals.goalText && (
                        <p className="text-sm italic text-muted-foreground">
                          "{s.goals.goalText}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {s.goals.sessionsPerWeek && (
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Sessions / wk
                        </span>
                        <span className="font-bold">
                          Actual: {s.sessionsPerWeekActual} / Target:{" "}
                          {s.goals.sessionsPerWeek}
                        </span>
                      </div>
                    )}
                    {s.goals.startWeight && (
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Weight
                        </span>
                        <span className="font-bold">
                          {s.goals.startWeight} kg →{" "}
                          {s.weightNow ?? s.goals.startWeight} kg
                        </span>
                      </div>
                    )}
                    {s.goals.stepTarget && (
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Step Target
                        </span>
                        <span className="font-bold">
                          {s.goals.stepTarget.toLocaleString()}/day
                        </span>
                      </div>
                    )}
                    {s.goals.calorieTarget && (
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Calorie Target
                        </span>
                        <span className="font-bold">
                          {s.goals.calorieTarget.toLocaleString()} kcal
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Focus + 3 habits by name */}
                  {(s.goals.focus ||
                    s.goals.habit_1 ||
                    s.goals.habit_2 ||
                    s.goals.habit_3) && (
                    <div className="space-y-2 pt-1">
                      {s.goals.focus && (
                        <p className="text-sm italic text-muted-foreground">
                          Focus: "{s.goals.focus}"
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {[s.goals.habit_1, s.goals.habit_2, s.goals.habit_3]
                          .filter((h) => h != null)
                          .map((h) => (
                            <Badge
                              key={h}
                              variant="secondary"
                              className="font-normal"
                            >
                              {String(h)}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {s.goals.reviewDue && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Review due:{" "}
                      {new Date(
                        s.goals.reviewDue + "T00:00:00",
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Auto Talking Points */}
            {talkingPoints.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Conversation
                  Prompts
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
                  {talkingPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strength Wins */}
            {s.prs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Strength Wins
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {s.prs.map((pr) => (
                    <div
                      key={pr.exercise}
                      className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold capitalize truncate">
                          {pr.exercise.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {pr.start} → {pr.now} kg
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs font-bold text-primary"
                      >
                        +{pr.gain} kg
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Before / After Photos + full strip */}
            {((s.beforePhoto && s.afterPhoto) ||
              (s.photos && s.photos.length > 0)) && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Progress Photos
                </p>
                {s.beforePhoto && s.afterPhoto && (
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    <figure className="space-y-1">
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={s.beforePhoto}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <figcaption className="text-[10px] text-muted-foreground text-center">
                        Before
                      </figcaption>
                    </figure>
                    <figure className="space-y-1">
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={s.afterPhoto}
                          alt="Now"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <figcaption className="text-[10px] text-muted-foreground text-center">
                        Current
                      </figcaption>
                    </figure>
                  </div>
                )}
                {s.photos && s.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {s.photos.map((p, i) => (
                      <button
                        key={(p.url || "") + i}
                        type="button"
                        onClick={() => setZoomPhoto(p.url)}
                        className="shrink-0 w-16 group relative"
                        title="Tap to enlarge"
                      >
                        <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted border border-border">
                          <img
                            src={p.url}
                            alt={`Photo ${i + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {p.is_baseline && (
                          <span className="absolute top-0.5 left-0.5 text-[8px] font-bold uppercase bg-primary text-primary-foreground rounded px-1">
                            Base
                          </span>
                        )}
                        <span className="block text-[9px] text-muted-foreground text-center mt-0.5 truncate">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString(
                                "en-GB",
                                { day: "numeric", month: "short" },
                              )
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={copyReviewLink}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Review Link
                </Button>
                <a
                  href={REVIEW_BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Booking
                  </Button>
                </a>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={generateShareImage}
              >
                <Share2 className="w-3.5 h-3.5" /> Generate Share Card
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <img
            src={zoomPhoto}
            alt="Progress photo enlarged"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </Dialog>
  );
}
