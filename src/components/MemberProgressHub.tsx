import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Dumbbell,
  Trophy,
  Calendar,
  TrendingDown,
  TrendingUp,
  Share2,
  Target,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { saveHabitCheckin, deleteHabitCheckin } from "@/lib/habitCheckins";
import { getMemberSummary, type ProgressSummary } from "@/lib/trialSummary";
import {
  getMemberProgressDetail,
  type MemberProgressDetail,
} from "@/lib/memberProgress";
import { getMemberGoals, type MemberGoals } from "@/lib/memberGoals";
import { habitWeekCount, habitStreak } from "@/lib/accDashboardHelpers";
import {
  HabitsCard,
  type HabitRingData,
} from "@/components/accDashboard/Habits";
import { MemberGoalsCard } from "@/components/MemberGoalsCard";
import { ETL_LOGO_ON_LIGHT } from "@/lib/branding";

const fmtVol = (kg: number) => `${Math.round(kg).toLocaleString("en-GB")}kg`;

const today = () => new Date().toISOString().slice(0, 10);

interface MemberHabitRow {
  id: string;
  habit_id: string | null;
  habit_name: string | null;
  habits?: { name: string } | null;
  name?: string;
}

export function MemberProgressHub() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [detail, setDetail] = useState<MemberProgressDetail | null>(null);
  const [memberHabits, setMemberHabits] = useState<MemberHabitRow[]>([]);
  const [habitCheckins, setHabitCheckins] = useState<
    { date: string; habit_id: string | null; member_habit_id: string | null }[]
  >([]);
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const recapRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, g] = await Promise.all([
        getMemberSummary(),
        getMemberProgressDetail(),
        getMemberGoals(),
      ]);
      setSummary(s);
      setDetail(d);
      setGoals(g);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: mh } = await supabase
          .from("member_habits")
          .select("id, habit_id, habit_name, habits(name)")
          .eq("member_id", user.id);
        setMemberHabits((mh ?? []) as unknown as MemberHabitRow[]);

        const { data: hc } = await supabase
          .from("habit_checkins")
          .select("date, habit_id, member_habit_id")
          .eq("member_id", user.id);
        setHabitCheckins(
          (hc ?? []) as {
            date: string;
            habit_id: string | null;
            member_habit_id: string | null;
          }[],
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGoalsSaved = useCallback(() => {
    void load();
  }, [load]);

  const handleToggleHabit = async (habitId: string) => {
    const t = today();
    const doneToday = habitCheckins.some(
      (c) =>
        c.date.slice(0, 10) === t &&
        (c.member_habit_id === habitId || c.habit_id === habitId),
    );
    // Optimistic update
    if (doneToday) {
      setHabitCheckins((prev) =>
        prev.filter(
          (c) =>
            !(
              c.date.slice(0, 10) === t &&
              (c.member_habit_id === habitId || c.habit_id === habitId)
            ),
        ),
      );
    } else {
      setHabitCheckins((prev) => [
        ...prev,
        { date: t, habit_id: null, member_habit_id: habitId },
      ]);
    }
    const payload = { member_habit_id: habitId, date: t };
    const res = doneToday
      ? await deleteHabitCheckin(payload)
      : await saveHabitCheckin(payload);
    if (!res?.success) {
      toast.error("Couldn't update habit — try again");
      load();
    }
  };

  const handleLogToday = async () => {
    for (const h of memberHabits) {
      const already = habitCheckins.some(
        (c) =>
          c.date.slice(0, 10) === today() &&
          (c.member_habit_id === h.id || c.habit_id === h.id),
      );
      if (!already) {
        await saveHabitCheckin({ member_habit_id: h.id, date: today() });
      }
    }
    toast.success("Habits logged for today — nice work!");
    load();
  };

  const handleShareRecap = async () => {
    if (!recapRef.current || !summary || !detail) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(recapRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "my-month.png", { type: "image/png" });
      const nav = navigator as any;
      const shareData: ShareData = {
        title: "My month on FitTrack",
        text: `${summary.bestStreak}-day habit streak, ${detail.sessionsMTD} sessions, ${fmtVol(
          detail.volumeMTD,
        )} lifted this month. 💪`,
      };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ ...shareData, files: [file] });
      } else if (nav.share) {
        await nav.share(shareData);
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "my-month.png";
        a.click();
        toast.success("Saved your recap image");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Couldn't build the recap image");
      }
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!summary || !detail) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Couldn't load your progress.
      </p>
    );
  }

  // Habit rings — driven by the member's CHOSEN habits for the month
  // (member_goals.habit_1/2/3), not the whole keystone library. Resolve each
  // chosen habit name to its member_habits row (so check-ins key on
  // member_habit_id); a chosen habit with no member_habits row still shows as a
  // ring (keyed on its name) so the member can see/track it.
  const chosenHabitNames = [goals?.habit_1, goals?.habit_2, goals?.habit_3]
    .filter((h): h is string => !!h && String(h).trim() !== "")
    .map((h) => String(h));

  const habitRings: HabitRingData[] = chosenHabitNames.map((name, i) => {
    const matched = memberHabits.find(
      (mh) =>
        (mh.habit_name || mh.habits?.name || mh.name || "")
          .toLowerCase()
          .trim() === name.toLowerCase().trim(),
    );
    const id = matched?.id || `chosen-${i}-${name}`;
    const checkins = habitCheckins.filter(
      (c) => c.member_habit_id === id || c.habit_id === id,
    );
    return { id, name, checkins };
  });

  const bestStreak = habitRings.reduce(
    (max, h) => Math.max(max, habitStreak(h.checkins, h.id)),
    0,
  );
  const totalWeekCheckins = habitRings.reduce(
    (sum, h) => sum + habitWeekCount(h.checkins, h.id),
    0,
  );
  const weeklyConsistency =
    habitRings.length > 0
      ? Math.round((totalWeekCheckins / (habitRings.length * 7)) * 100)
      : 0;

  const newPBs = (summary.prs || []).filter((p) => (p.gain || 0) > 0);
  const lowEngagement =
    detail.sessionsMTD === 0 && habitRings.length === 0 && bestStreak === 0;

  return (
    <div className="space-y-5">
      {/* Hidden branded recap card (rendered to image on Share) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <RecapCard
          ref={recapRef}
          summary={summary}
          detail={detail}
          bestStreak={bestStreak}
          weeklyConsistency={weeklyConsistency}
        />
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-heading tracking-tight">Your progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}{" "}
          · month-to-date
        </p>
      </div>

      {/* ── a) Habits (headline) ───────────────────────────────────────── */}
      {habitRings.length > 0 ? (
        <div className="space-y-3">
          <HabitsCard
            habits={habitRings}
            onToggleHabit={handleToggleHabit}
            onLogToday={handleLogToday}
            editControl={
              <MemberGoalsCard
                variant="editButton"
                onSaved={handleGoalsSaved}
              />
            }
            today={today()}
          />
          <div className="grid grid-cols-2 gap-3">
            <ConsistencyTile
              icon={<Flame className="w-4 h-4" />}
              value={`${bestStreak}`}
              label="best streak"
              sub="days"
            />
            <ConsistencyTile
              icon={<Target className="w-4 h-4" />}
              value={`${weeklyConsistency}%`}
              label="this week"
              sub="consistency"
            />
          </div>
        </div>
      ) : (
        <MemberGoalsCard initialGoals={goals} onSaved={handleGoalsSaved} />
      )}

      {/* ── b) Training ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Training
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <BigStat
              value={`${detail.sessionsMTD}`}
              label="sessions"
              sub={`${detail.sessions30} in last 30 days`}
            />
            <BigStat
              value={fmtVol(detail.volumeMTD)}
              label="lifted"
              sub={`${fmtVol(detail.volume30)} in last 30 days`}
              isHero
            />
          </div>
          {newPBs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {newPBs.slice(0, 4).map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary"
                >
                  <Trophy className="w-3 h-3" />
                  {p.exercise} +{p.gain}kg
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── c) Attendance ───────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <BigStat
              value={`${detail.ptMTD}`}
              label="PT"
              sub={`${detail.pt30} in last 30 days`}
            />
            <BigStat
              value={`${detail.classesMTD}`}
              label="classes"
              sub={`${detail.classes30} in last 30 days`}
            />
            <BigStat
              value={`${detail.gymVisitsMTD}`}
              label="gym visits"
              sub={`${detail.gymVisits30} in last 30 days`}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── d) Wins & milestones ───────────────────────────────────────── */}
      <WinsStrip
        bestStreak={bestStreak}
        sessions={detail.sessionsMTD}
        volume={detail.volumeMTD}
        newPBs={newPBs.length}
        weightDelta={summary.weightDelta}
      />

      {/* ── e) Body / nutrition (only if data exists) ──────────────────── */}
      {summary.weightDelta != null && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" /> Body
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-2xl font-heading font-bold tabular-nums">
                  {summary.weightNow?.toFixed(1)}
                  <span className="text-sm text-muted-foreground ml-1">kg</span>
                </span>
                {summary.weightDelta! < 0 ? (
                  <span className="text-xs text-primary">
                    <TrendingDown className="w-3 h-3 inline" />{" "}
                    {Math.abs(summary.weightDelta!).toFixed(1)} kg down
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3 inline" />{" "}
                    {summary.weightDelta!.toFixed(1)} kg
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {summary.daysLogged > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold text-lg">{summary.daysLogged}</span>{" "}
              days logged this period
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Low-engagement nudge ──────────────────────────────────────── */}
      {lowEngagement && (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center">
          <p className="font-medium text-primary">Let's get your first win</p>
          <p className="text-sm text-muted-foreground mt-1">
            Log a session or tick a habit this week to keep your streak
            building.
          </p>
        </div>
      )}

      {/* ── Share ────────────────────────────────────────────────────── */}
      <Button
        onClick={handleShareRecap}
        disabled={sharing}
        variant="outline"
        className="w-full gap-2"
      >
        <Share2 className="w-4 h-4" />
        {sharing ? "Building…" : "Share my month"}
      </Button>

      {/* ── Link to charts/detail ─────────────────────────────────────── */}
      <button
        onClick={() => navigate("/progress")}
        className="w-full text-left text-sm text-primary flex items-center gap-1 pt-1"
      >
        View charts & full history
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConsistencyTile({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <div className="flex flex-col">
        <span className="font-bold text-lg leading-none tabular-nums">
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {label} · {sub}
        </span>
      </div>
    </div>
  );
}

function BigStat({
  value,
  label,
  sub,
  isHero,
}: {
  value: string;
  label: string;
  sub: string;
  isHero?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/30 px-4 py-3">
      <span
        className={
          "font-heading font-bold tabular-nums " +
          (isHero ? "text-2xl text-primary" : "text-xl")
        }
      >
        {value}
      </span>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function WinsStrip({
  bestStreak,
  sessions,
  volume,
  newPBs,
  weightDelta,
}: {
  bestStreak: number;
  sessions: number;
  volume: number;
  newPBs: number;
  weightDelta?: number;
}) {
  const wins: { label: string; emoji: string }[] = [];
  if (bestStreak >= 3)
    wins.push({ label: `${bestStreak}-day streak`, emoji: "🔥" });
  if (sessions >= 1)
    wins.push({
      label: `${sessions} session${sessions > 1 ? "s" : ""}`,
      emoji: "🏋️",
    });
  if (volume > 0) wins.push({ label: `${fmtVol(volume)} lifted`, emoji: "💪" });
  if (newPBs >= 1)
    wins.push({
      label: `${newPBs} new PB${newPBs > 1 ? "s" : ""}`,
      emoji: "🏆",
    });
  if (weightDelta != null && weightDelta < 0)
    wins.push({
      label: `${Math.abs(weightDelta).toFixed(1)} kg down`,
      emoji: "📉",
    });

  if (wins.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {wins.map((w, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-3 py-1.5 text-sm font-medium"
        >
          <span>{w.emoji}</span>
          {w.label}
        </span>
      ))}
    </div>
  );
}

// ── Branded recap card (rendered to PNG) ────────────────────────────────
const RecapCard = forwardRef<
  HTMLDivElement,
  {
    summary: ProgressSummary;
    detail: MemberProgressDetail;
    bestStreak: number;
    weeklyConsistency: number;
  }
>(function RecapCard({ summary, detail, bestStreak, weeklyConsistency }, ref) {
  const monthName = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return (
    <div
      ref={ref}
      className="rounded-2xl bg-background border border-border p-6"
      style={{ width: 540 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            My month
          </p>
          <p className="font-heading font-bold text-xl">
            {summary.firstName}'s {monthName}
          </p>
        </div>
        <img
          src={ETL_LOGO_ON_LIGHT}
          alt="ETL"
          style={{ height: 24 }}
          className="object-contain"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <RecapStat emoji="🔥" value={`${bestStreak}`} label="day streak" />
        <RecapStat
          emoji="🎯"
          value={`${weeklyConsistency}%`}
          label="consistency"
        />
        <RecapStat
          emoji="🏋️"
          value={`${detail.sessionsMTD}`}
          label="sessions"
        />
        <RecapStat emoji="💪" value={fmtVol(detail.volumeMTD)} label="lifted" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {detail.classesMTD} classes · {detail.gymVisitsMTD} gym visits
        </span>
        <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
          Eat Train Live
        </span>
      </div>
    </div>
  );
});

function RecapStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-muted/30 px-4 py-3">
      <span className="text-lg">{emoji}</span>
      <p className="font-heading font-bold text-2xl tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
