import { useEffect, useState } from "react";
import {
  Activity,
  Dumbbell,
  Flame,
  UtensilsCrossed,
  MessageSquare,
  Trophy,
  TrendingUp,
  Users,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchUsageReport,
  exportUsageCsv,
  thisWeekRange,
  lastWeekRange,
  type UsageReport,
} from "@/lib/usageReport";
import {
  UsageDetailDialog,
  type DetailColumn,
  type DetailRow,
} from "@/components/UsageDetailDialog";

const fmtPct = (n: number, d: number) =>
  d > 0 ? `${Math.round((n / d) * 100)}%` : "0%";

type DialogKind =
  | "active"
  | "workouts"
  | "habits"
  | "nutrition"
  | "community"
  | "leaderboards"
  | "pbs"
  | "attendance"
  | "notOnApp"
  | { feature: string };

/** A summary stat card — clickable to open a detail table. */
function StatCard({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <Card
      className={`bg-card border-border ${clickable ? "cursor-pointer hover:border-primary/50 transition" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

/** A section with an expandable name list. */
function NamesList({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  if (!names || names.length === 0) return null;
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-primary flex items-center gap-1 hover:underline"
      >
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        View names ({names.length})
      </button>
      {open && (
        <div className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
          {names.join(", ")}
        </div>
      )}
    </div>
  );
}

export default function UsageDashboard({
  staffSecret,
}: {
  staffSecret: string;
}) {
  const [range, setRange] = useState(thisWeekRange());
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  const load = async (r: { start: string; end: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsageReport(staffSecret, r.start, r.end);
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Failed to load usage report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const maxProgSessions = report
    ? Math.max(1, ...report.workouts.byProgramme.map((p) => p.sessions))
    : 1;

  // ---- Detail dialog config ----
  const dialogConfig: {
    title: string;
    columns: DetailColumn[];
    rows: DetailRow[];
  } | null = (() => {
    if (!report || !dialog) return null;
    if (dialog === "active")
      return {
        title: "Active members",
        columns: [{ key: "name", label: "Name" }],
        rows: report.activeMembers.detail as unknown as DetailRow[],
      };
    if (dialog === "workouts")
      return {
        title: "Workouts logged",
        columns: [
          { key: "name", label: "Name" },
          { key: "total", label: "Total sessions", numeric: true },
          { key: "breakdown", label: "By programme" },
        ],
        rows: report.workouts.detail as unknown as DetailRow[],
      };
    if (dialog === "habits")
      return {
        title: "Habit check-ins",
        columns: [
          { key: "name", label: "Name" },
          { key: "checkins", label: "Check-ins", numeric: true },
        ],
        rows: report.habits.detail as unknown as DetailRow[],
      };
    if (dialog === "nutrition")
      return {
        title: "Nutrition entries",
        columns: [
          { key: "name", label: "Name" },
          { key: "entries", label: "Entries", numeric: true },
        ],
        rows: report.nutrition.detail as unknown as DetailRow[],
      };
    if (dialog === "community")
      return {
        title: "Community activity",
        columns: [
          { key: "name", label: "Name" },
          { key: "posts", label: "Posts", numeric: true },
          { key: "comments", label: "Comments", numeric: true },
          { key: "reactions", label: "Reactions", numeric: true },
        ],
        rows: report.community.detail as unknown as DetailRow[],
      };
    if (dialog === "leaderboards")
      return {
        title: "Leaderboard scores",
        columns: [
          { key: "name", label: "Name" },
          { key: "scores", label: "Scores logged", numeric: true },
        ],
        rows: report.leaderboards.detail as unknown as DetailRow[],
      };
    if (dialog === "pbs")
      return {
        title: "Personal records",
        columns: [
          { key: "name", label: "Name" },
          { key: "records", label: "PBs", numeric: true },
        ],
        rows: report.pbs.detail as unknown as DetailRow[],
      };
    if (dialog === "attendance")
      return {
        title: "Attendance",
        columns: [
          { key: "name", label: "Name" },
          { key: "pt", label: "PT", numeric: true },
          { key: "classes", label: "Classes", numeric: true },
          { key: "gym", label: "Gym visits", numeric: true },
        ],
        rows: report.attendance.detail as unknown as DetailRow[],
      };
    if (dialog === "notOnApp")
      return {
        title: "Not on app — chase list",
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        rows: report.adoption.notOnAppList as unknown as DetailRow[],
      };
    if (typeof dialog === "object" && dialog.feature) {
      const f = report.featureViews.find((x) => x.feature === dialog.feature);
      if (f)
        return {
          title: `Feature views — ${dialog.feature.replace(/_/g, " ")}`,
          columns: [
            { key: "name", label: "Name" },
            { key: "views", label: "Views", numeric: true },
          ],
          rows: f.detail as unknown as DetailRow[],
        };
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {/* Week picker + actions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            App Usage Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={
                range.start === thisWeekRange().start ? "default" : "outline"
              }
              onClick={() => setRange(thisWeekRange())}
            >
              This week
            </Button>
            <Button
              size="sm"
              variant={
                range.start === lastWeekRange().start ? "default" : "outline"
              }
              onClick={() => setRange(lastWeekRange())}
            >
              Last week
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {report ? `${report.window.start} → ${report.window.end}` : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                From
              </label>
              <Input
                type="date"
                value={range.start}
                onChange={(e) =>
                  setRange((r) => ({ ...r, start: e.target.value }))
                }
                className="w-auto"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                To
              </label>
              <Input
                type="date"
                value={range.end}
                onChange={(e) =>
                  setRange((r) => ({ ...r, end: e.target.value }))
                }
                className="w-auto"
              />
            </div>
            <Button size="sm" onClick={() => load(range)} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => report && exportUsageCsv(report)}
              disabled={!report || loading}
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {loading && !report ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Active members"
              value={report.activeMembers.count}
              onClick={() => setDialog("active")}
            />
            <StatCard
              icon={<Dumbbell className="h-4 w-4" />}
              label="Workouts logged"
              value={report.workouts.totalSessions}
              sub={`${report.workouts.totalMembers} members`}
              onClick={() => setDialog("workouts")}
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              label="Habit check-ins"
              value={report.habits.totalCheckins}
              sub={`${report.habits.members} members`}
              onClick={() => setDialog("habits")}
            />
            <StatCard
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="Nutrition entries"
              value={report.nutrition.entries}
              sub={`${report.nutrition.members} members`}
              onClick={() => setDialog("nutrition")}
            />
            <StatCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="Community posts"
              value={report.community.posts}
              sub={`${report.community.comments} comments · ${report.community.reactions} reactions`}
              onClick={() => setDialog("community")}
            />
            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="Leaderboard scores"
              value={report.leaderboards.scores}
              sub={`${report.leaderboards.members} members`}
              onClick={() => setDialog("leaderboards")}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="PBs"
              value={report.pbs.records}
              sub={`${report.pbs.members} members`}
              onClick={() => setDialog("pbs")}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="On app"
              value={report.adoption.onApp}
              sub={`${fmtPct(report.adoption.onApp, report.adoption.rosterTotal)} of ${report.adoption.rosterTotal}`}
              onClick={() => setDialog("notOnApp")}
            />
          </div>

          {/* Attendance */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    PT sessions
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {report.attendance.ptSessions}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {report.attendance.ptMembers} members
                  </div>
                  <NamesList names={report.attendance.ptNames} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Classes
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {report.attendance.classes}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {report.attendance.classMembers} members
                  </div>
                  <NamesList names={report.attendance.classNames} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Gym visits
                  </div>
                  <div className="text-xl font-bold tabular-nums">
                    {report.attendance.gymVisits}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {report.attendance.gymMembers} members
                  </div>
                  <NamesList names={report.attendance.gymNames} />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setDialog("attendance")}
              >
                View attendance detail
              </Button>
            </CardContent>
          </Card>

          {/* Programme breakdown */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Workouts by programme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.workouts.byProgramme.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No workouts logged this week.
                </p>
              )}
              {report.workouts.byProgramme.map((p) => (
                <div key={p.programme} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.programme}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {p.sessions} sessions · {p.members} members
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${(p.sessions / maxProgSessions) * 100}%`,
                      }}
                    />
                  </div>
                  <NamesList names={p.memberNames} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feature views */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Feature views</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.featureViews.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No feature views logged this week.
                </p>
              )}
              {report.featureViews.map((f) => (
                <div key={f.feature} className="space-y-1">
                  <button
                    onClick={() => setDialog({ feature: f.feature })}
                    className="w-full flex items-center justify-between text-sm hover:text-primary"
                  >
                    <span className="font-medium capitalize">
                      {f.feature.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {f.views} views · {f.members} members
                    </span>
                  </button>
                  <NamesList names={f.memberNames} />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {dialogConfig && (
        <UsageDetailDialog
          open={!!dialog}
          onOpenChange={(v) => !v && setDialog(null)}
          title={dialogConfig.title}
          columns={dialogConfig.columns}
          rows={dialogConfig.rows}
        />
      )}
    </div>
  );
}
