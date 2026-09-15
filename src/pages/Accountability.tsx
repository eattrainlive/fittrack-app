import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Check, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getActiveCohort,
  getMyClientRecord,
  currentWeekOf,
  WEEK_THEMES,
  type AccCohort,
  type AccClient,
} from "@/lib/accountabilityProgramme";
import { AccountabilityOnboarding } from "@/components/AccountabilityOnboarding";
import { WeeklyCheckin } from "@/components/WeeklyCheckin";
import { FinalCheckin } from "@/components/FinalCheckin";
import { WeekContentView } from "@/components/WeekContentView";
import { getEmbedUrl } from "@/lib/accWeekContent";
import {
  getMemberHabits,
  saveHabitCheckin,
  getHabitCheckins,
} from "@/lib/store";
import { getMyCheckins, type AccCheckin } from "@/lib/accountabilityCheckins";
import { AccountabilityDashboard } from "@/components/accDashboard/AccountabilityDashboard";

const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const Accountability = () => {
  const navigate = useNavigate();
  const [cohort, setCohort] = useState<AccCohort | null>(null);
  const [client, setClient] = useState<AccClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachName, setCoachName] = useState<string>("");
  const [habits, setHabits] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [weight, setWeight] = useState("");
  const [weekCheckins, setWeekCheckins] = useState<AccCheckin[]>([]);
  const [view, setView] = useState<
    "dashboard" | "onboarding" | "checkin" | "final"
  >("dashboard");

  const load = async () => {
    setLoading(true);
    const c = await getActiveCohort();
    setCohort(c);
    if (c) {
      const cl = await getMyClientRecord(c.id);
      setClient(cl);
      if (cl?.coach_user_id) {
        const { data: coachRow } = await supabase
          .from("members")
          .select("full_name, email")
          .eq("id", cl.coach_user_id)
          .maybeSingle();
        setCoachName(
          (coachRow as any)?.full_name ||
            (coachRow as any)?.email?.split("@")[0] ||
            "Your coach",
        );
      }
      setHabits(await getMemberHabits());
      setCheckins(await getHabitCheckins());
      if (cl) setWeekCheckins(await getMyCheckins(cl.id));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Not enrolled → back to coaching
  if (!cohort || !client) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => navigate("/nutrition")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            You're not enrolled in the accountability programme yet. Speak to
            your coach to join the next cohort.
          </CardContent>
        </Card>
      </div>
    );
  }

  const week = currentWeekOf(cohort.start_date, cohort.weeks);
  const isPreStart = week === 0;
  const isComplete = week > cohort.weeks;

  const reload = () => {
    load();
  };

  // Dashboard sub-views
  if (view === "onboarding" && client) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <AccountabilityOnboarding
          client={client}
          onDone={() => {
            reload();
            setView("dashboard");
          }}
        />
      </div>
    );
  }
  if (view === "checkin" && client && cohort) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <WeeklyCheckin
          client={client}
          cohort={cohort}
          week={week}
          onDone={() => {
            reload();
            setView("dashboard");
          }}
        />
      </div>
    );
  }
  if (view === "final" && client && cohort) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <FinalCheckin
          client={client}
          cohort={cohort}
          onDone={() => {
            reload();
            setView("dashboard");
          }}
        />
      </div>
    );
  }

  const toggleHabit = async (habitId: string) => {
    const today = todayISO();
    const exists = checkins.find(
      (c: any) => c.habit_id === habitId && c.date === today,
    );
    if (exists) {
      toast.info("Already checked in today");
      return;
    }
    await saveHabitCheckin({ habit_id: habitId, date: today });
    setCheckins(await getHabitCheckins());
    toast.success("Habit checked off");
  };

  const isCheckedToday = (habitId: string) =>
    checkins.some((c: any) => c.habit_id === habitId && c.date === todayISO());

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto w-full">
      <Button
        variant="ghost"
        onClick={() => navigate("/nutrition")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Coaching
      </Button>

      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Accountability Programme
        </p>
        <h1 className="text-3xl font-heading tracking-wider uppercase leading-none">
          {cohort.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" /> Started{" "}
          {formatDate(cohort.start_date)}
        </p>
      </div>

      {/* Coach + approach */}
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Your coach</p>
            <p className="font-medium truncate">{coachName}</p>
            {client.nutrition_approach && (
              <p className="text-xs text-muted-foreground">
                Approach: {client.nutrition_approach}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isPreStart && (
        <Card className="bg-card border-primary/30 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-lg">
              Your programme starts {formatDate(cohort.start_date)}
            </CardTitle>
            <CardDescription>
              We'll get going on day one. In the meantime, complete your
              onboarding so your coach has everything they need.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.onboarding_done ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Badge className="bg-primary/15 text-primary border-0">
                  <Check className="w-3 h-3 mr-1" /> Onboarding complete
                </Badge>
                <AccountabilityOnboarding client={client} onDone={reload} />
              </div>
            ) : (
              <AccountabilityOnboarding client={client} onDone={reload} />
            )}
            <WeekContentView weekNumber={0} />
          </CardContent>
        </Card>
      )}

      {isComplete && (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <p className="font-heading text-xl tracking-wide">
              Programme complete 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              You've finished all 6 weeks. Your coach will be in touch about
              your results and next steps.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Onboarding prompt during the programme if still pending */}
      {!isPreStart && !isComplete && !client.onboarding_done && (
        <Card className="bg-card border-primary/30 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-lg">Finish your onboarding</CardTitle>
            <CardDescription>
              You skipped a few questions at the start — your coach would love
              the full picture. Takes two minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountabilityOnboarding client={client} onDone={reload} />
          </CardContent>
        </Card>
      )}

      {/* Onboarding summary (when done) */}
      {!isPreStart && client.onboarding_done && client.why && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Your why</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm italic text-muted-foreground">
              "{client.why}"
            </p>
            {client.events && (
              <p className="text-xs text-muted-foreground">
                Working towards: {client.events}
              </p>
            )}
            {client.derailers && (
              <p className="text-xs text-muted-foreground">
                Watch out for: {client.derailers}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard view during active programme */}
      {!isPreStart && !isComplete && view === "dashboard" && (
        <AccountabilityDashboard
          onOpenOnboarding={() => setView("onboarding")}
          onOpenCheckin={() => setView("checkin")}
          onOpenFinal={() => setView("final")}
        />
      )}

      {/* 6-week timeline */}
      {!isPreStart && view !== "dashboard" && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl tracking-wider">Your 6 weeks</h2>
          {WEEK_THEMES.map((t) => {
            const isCurrent = week === t.week;
            const isPast = week > t.week;
            const isFuture = week < t.week;
            const wc = weekCheckins.find((c) => c.week_number === t.week);
            return (
              <Card
                key={t.week}
                className={
                  isCurrent
                    ? "bg-card border-primary/40 border-l-4 border-l-primary"
                    : "bg-card border-border"
                }
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isCurrent ? "default" : "outline"}
                          className="text-xs"
                        >
                          Week {t.week}
                        </Badge>
                        {isPast && <Check className="w-4 h-4 text-primary" />}
                        {isCurrent && (
                          <span className="text-xs font-bold text-primary">
                            This week
                          </span>
                        )}
                        {wc && (
                          <span className="text-xs text-primary font-medium">
                            · Check-in done
                          </span>
                        )}
                      </div>
                      <p className="font-heading text-lg tracking-wide mt-1">
                        {t.title}
                      </p>
                      <p className="text-sm font-medium text-primary mt-0.5">
                        {t.habit}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                  {(isCurrent || isPast) && (
                    <WeekContentView weekNumber={t.week} />
                  )}
                  {/* Coach reply tie-in */}
                  {wc && wc.coach_replied_at && (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-primary">
                        Your coach's reply
                      </p>
                      {wc.coach_reply_note && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {wc.coach_reply_note}
                        </p>
                      )}
                      {wc.coach_reply_loom_url &&
                        (() => {
                          const embed = getEmbedUrl(wc.coach_reply_loom_url!);
                          return embed ? (
                            <div className="aspect-video rounded-lg overflow-hidden border border-border">
                              <iframe
                                src={embed}
                                className="w-full h-full"
                                allowFullScreen
                                title={`Coach reply week ${t.week}`}
                              />
                            </div>
                          ) : (
                            <a
                              href={wc.coach_reply_loom_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary underline"
                            >
                              Watch your coach's video
                            </a>
                          );
                        })()}
                    </div>
                  )}
                  {isCurrent && !isComplete && (
                    <div className="mt-3">
                      {t.week < 6 ? (
                        <WeeklyCheckin
                          client={client}
                          cohort={cohort}
                          week={t.week}
                          onDone={load}
                        />
                      ) : (
                        <FinalCheckin
                          client={client}
                          cohort={cohort}
                          onDone={load}
                        />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Daily keystone habits */}
      {!isPreStart && habits.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Today's habits</CardTitle>
            <CardDescription>
              Check off your keystone habits each day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {habits.map((h: any) => (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left active:scale-[0.99] transition"
              >
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                    isCheckedToday(h.id)
                      ? "bg-primary border-primary"
                      : "border-border"
                  }`}
                >
                  {isCheckedToday(h.id) && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{h.name}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weight log */}
      {!isPreStart && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Log your weight</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Today's weight (kg)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 78"
              />
            </div>
            <Button
              onClick={async () => {
                const w = Number(weight);
                if (!w || w <= 0) {
                  toast.error("Enter a valid weight");
                  return;
                }
                const { saveBodyweight } = await import("@/lib/store");
                const { success } = await saveBodyweight(w);
                if (success) {
                  toast.success("Weight logged");
                  setWeight("");
                } else toast.error("Couldn't save weight");
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Accountability;
