import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Flame,
  TrendingUp,
  Users,
  Scale,
  ChevronRight,
  Sparkles,
  Target,
  Video,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  getWorkoutHistory,
  getBodyweightHistory,
  getActiveProgram,
  getMyGymMember,
} from "@/lib/store";
import { format, subDays, isSameDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { MemberGoalsCard } from "@/components/MemberGoalsCard";
import { CheckInHeaderButton } from "@/components/CheckInHeaderButton";
import { AccountabilityCard } from "@/components/AccountabilityCard";
import TodayHabitsCard from "@/components/TodayHabitsCard";
import ErgChallengeCard from "@/components/ErgChallengeCard";
import {
  getActiveCohort,
  getMyClientRecord,
  effectiveWeekOf,
} from "@/lib/accountabilityProgramme";
import {
  getFocusForWeek,
  isFocusSeen,
  markFocusSeen,
  type ClientFocus,
} from "@/lib/clientFocus";
import {
  getWeekContent,
  isCallRecordingSeen,
  markCallRecordingSeen,
} from "@/lib/accWeekContent";
import {
  isTrialProduct,
  daysSince,
  getTrialBaselineCapturedAt,
} from "@/lib/trialBaseline";
import { isTrialEligible, isMemberEligible } from "@/lib/trialSummary";
import { PoweredByETL } from "@/components/PoweredByETL";
import CommunityBanner from "@/components/CommunityBanner";
import { logFeatureView } from "@/lib/featureTracking";
import { getMemberGoals } from "@/lib/memberGoals";

const Index = () => {
  useEffect(() => {
    logFeatureView("home");
  }, []);
  const [history, setHistory] = useState<any[]>([]);
  const [bodyweight, setBodyweight] = useState<any[]>([]);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [allowedAccess, setAllowedAccess] = useState<string[] | null>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showTrialProgress, setShowTrialProgress] = useState(false);
  const [showMemberGoals, setShowMemberGoals] = useState(false);
  const [accEnrolled, setAccEnrolled] = useState(false);
  const [focusFlag, setFocusFlag] = useState<ClientFocus | null>(null);
  const [callFlag, setCallFlag] = useState<{ week: number; url: string } | null>(
    null,
  );
  const [needsGoalsSetup, setNeedsGoalsSetup] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    setHistory(await getWorkoutHistory());
    setBodyweight(await getBodyweightHistory());
    setActiveProgram(await getActiveProgram());

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserName(
        user.user_metadata?.full_name || user.email?.split("@")[0] || "there",
      );
      const { data } = await supabase
        .from("members")
        .select("allowed_access")
        .eq("id", user.id)
        .maybeSingle();
      setAllowedAccess(
        data?.allowed_access ?? [
          "Foundations",
          "Stronger",
          "Fusion",
          "Performance",
        ],
      );
    } else {
      setAllowedAccess(["Foundations", "Stronger", "Fusion", "Performance"]);
    }

    // Trial Day-0 baseline card: only for early-day trialists who haven't captured it yet.
    // Trial-progress entry point: any eligible trialist (full 30-day window).
    try {
      const member = await getMyGymMember();
      const captured = await getTrialBaselineCapturedAt();
      if (
        member &&
        isTrialProduct(member.product) &&
        !captured &&
        daysSince(member.joined_on) <= 3
      ) {
        setShowBaseline(true);
      } else {
        setShowBaseline(false);
      }
      setShowTrialProgress(!!member && isTrialEligible(member.product));
      // Member goals card: non-trialists with an active membership.
      setShowMemberGoals(!!member && isMemberEligible(member.product));
      // Hide monthly-habits card for enrolled accountability members —
      // the programme manages their habits via the weekly stack.
      const accCohort = await getActiveCohort();
      if (accCohort) {
        const accClient = await getMyClientRecord(accCohort.id);
        setAccEnrolled(!!accClient);
        // One-time flag: coach left this week's focus and the member hasn't
        // seen it yet. Cleared on click or when they open the 6-week dashboard.
        if (accClient) {
          const wk = effectiveWeekOf(accCohort, accClient);
          const f = wk >= 1 ? await getFocusForWeek(accClient.id, wk) : null;
          setFocusFlag(f && !isFocusSeen(f) ? f : null);
          // One-time flag: this week's call recording was uploaded and the
          // member hasn't seen it. Cleared on tap or opening the dashboard.
          const wc = wk >= 1 ? await getWeekContent(wk) : null;
          const callUrl = wc?.call_recording_url ?? null;
          setCallFlag(
            callUrl && !isCallRecordingSeen(wk, callUrl)
              ? { week: wk, url: callUrl }
              : null,
          );
        }
      }
      // First-run goals setup: open the goals/targets editor once for
      // non-trial members with no goals row yet (unless they dismissed it).
      const dismissed =
        localStorage.getItem("etl_goals_setup_dismissed") === "1";
      if (showMemberGoals && !dismissed) {
        const g = await getMemberGoals();
        if (!g) setNeedsGoalsSetup(true);
      }
    } catch {
      setShowBaseline(false);
      setShowTrialProgress(false);
      setShowMemberGoals(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setIsLoading(false), 600);

    const handleSync = () => {
      loadData();
      setIsLoading(false);
    };

    window.addEventListener("fittrack_synced", handleSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("fittrack_synced", handleSync);
    };
  }, []);

  // Calculate metrics
  const totalWorkouts = history.length;

  // Volume
  const totalVolume = history.reduce((sum, w) => sum + (w.volume || 0), 0);

  // Calculate streak
  let currentStreak = 0;
  let currentDate = new Date();

  // Sort history by date descending
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (sortedHistory.length > 0) {
    const lastWorkoutDate = new Date(sortedHistory[0].date);
    // If the last workout was today or yesterday, we might have a streak
    const diffDays = Math.floor(
      (currentDate.getTime() - lastWorkoutDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 1) {
      currentStreak = 1;
      let checkDate = lastWorkoutDate;

      for (let i = 1; i < sortedHistory.length; i++) {
        const prevDate = new Date(sortedHistory[i].date);
        const dayDiff = Math.floor(
          (checkDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          currentStreak++;
          checkDate = prevDate;
        } else if (dayDiff === 0) {
          // Same day, ignore
          continue;
        } else {
          break; // Streak broken
        }
      }
    }
  }

  // Active minutes
  const activeMinutes = history.reduce((sum, w) => sum + (w.duration || 0), 0);

  // Weekly Activity Chart Data (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayWorkouts = history.filter((w) => isSameDay(new Date(w.date), d));
    const duration = dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return {
      name: format(d, "EEE"),
      duration,
      workouts: dayWorkouts.length,
    };
  });

  // Recent Workouts
  const recentWorkouts = sortedHistory.slice(0, 4);

  // Bodyweight chart data
  const bwData = [...bodyweight]
    .filter((b) => b.weight !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7)
    .map((b) => ({
      name: format(new Date(b.date), "MMM d"),
      weight: b.weight,
    }));

  const currentWeight =
    bwData.length > 0 ? bwData[bwData.length - 1].weight : 0;

  const bucketOf = (p: any) =>
    p.type === "GroupPT" ? "Group PT" : p.stream || "Foundations";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0 flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">
            {getGreeting()},
          </span>
          <h2 className="text-3xl font-heading tracking-wider uppercase leading-none">
            {userName || "there"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Ready to crush your goals today?
          </p>
        </div>
        <CheckInHeaderButton />
      </div>

      {focusFlag && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <button
            onClick={() => {
              markFocusSeen(focusFlag);
              setFocusFlag(null);
              navigate("/accountability");
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-sm font-semibold leading-tight">
              Your coach left you a focus for this week
            </p>
            <p className="text-xs text-primary">Tap to read it ›</p>
          </button>
          <button
            onClick={() => {
              markFocusSeen(focusFlag);
              setFocusFlag(null);
            }}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {callFlag && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <button
            onClick={() => {
              markCallRecordingSeen(callFlag.week, callFlag.url);
              setCallFlag(null);
              navigate("/accountability");
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-sm font-semibold leading-tight">
              This week's call recording is up
            </p>
            <p className="text-xs text-primary">Tap to watch ›</p>
          </button>
          <button
            onClick={() => {
              markCallRecordingSeen(callFlag.week, callFlag.url);
              setCallFlag(null);
            }}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <AccountabilityCard />

      <TodayHabitsCard />

      <ErgChallengeCard />

      {showMemberGoals && !accEnrolled && needsGoalsSetup && (
        <MemberGoalsCard
          autoOpen
          variant="editButton"
          hideHabits
          onSaved={() => {
            setNeedsGoalsSetup(false);
            localStorage.removeItem("etl_goals_setup_dismissed");
          }}
          onDismiss={() => {
            setNeedsGoalsSetup(false);
            localStorage.setItem("etl_goals_setup_dismissed", "1");
          }}
        />
      )}

      {showTrialProgress && (
        <button
          onClick={() => navigate("/my-trial")}
          className="w-full flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Your Trial
            </p>
            <p className="font-heading text-lg tracking-wide uppercase leading-none">
              {showBaseline ? "Set up your 30 days" : "Your 30-day progress"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {showBaseline
                ? "Welcome — let's get you started"
                : "Sessions, wins & how far you've come"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary shrink-0" />
        </button>
      )}

      <CommunityBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Workouts
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{totalWorkouts}</div>
            )}
            {totalWorkouts === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Log a session to start
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Lifetime sessions</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Minutes
            </CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{activeMinutes}</div>
            )}
            {activeMinutes === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No time logged yet
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Total time trained
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{currentStreak} days</div>
            )}
            {currentStreak === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Train today to start streak
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Lifted</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mb-1" />
            ) : (
              <div className="text-2xl font-bold">
                {totalVolume.toLocaleString()} kg
              </div>
            )}
            {totalVolume === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No volume logged
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Lifetime volume</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Weight
            </CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <div className="text-2xl font-bold">{currentWeight} kg</div>
            )}
            {currentWeight === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                No weight logged
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Latest log</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">
              Weekly Activity
            </CardTitle>
            <CardDescription>
              Your workout duration over the past 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full p-4">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorDuration"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}m`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="duration"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDuration)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card border-border flex flex-col">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">
              Bodyweight Trend
            </CardTitle>
            <CardDescription>Recent weight logs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[120px] w-full mb-6">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : bwData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bwData}>
                    <XAxis dataKey="name" hide />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No weight data logged
                </div>
              )}
            </div>

            <h3 className="font-heading text-xl tracking-wider mb-4">
              Recent Workouts
            </h3>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))
              ) : recentWorkouts.length > 0 ? (
                recentWorkouts.map((workout, i) => (
                  <div key={i} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {workout.name || "Workout"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(workout.date), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm flex flex-col items-end">
                      <span>{workout.duration || 0} min</span>
                      {workout.volume > 0 && (
                        <span className="text-xs text-primary">
                          {workout.volume.toLocaleString()} kg
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No workouts logged yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PoweredByETL className="pt-4" />
    </div>
  );
};

export default Index;
