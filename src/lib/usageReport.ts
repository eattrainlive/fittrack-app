// Client-side usage report fetcher + CSV export + week helpers.
import { supabase } from "@/lib/supabase";

export interface ActiveMemberDetail {
  name: string;
}
export interface WorkoutDetail {
  name: string;
  total: number;
  breakdown: string;
  byProgramme: Record<string, number>;
}
export interface HabitDetail {
  name: string;
  checkins: number;
}
export interface NutritionDetail {
  name: string;
  entries: number;
}
export interface CommunityDetail {
  name: string;
  posts: number;
  comments: number;
  reactions: number;
}
export interface LeaderboardDetail {
  name: string;
  scores: number;
}
export interface PbDetail {
  name: string;
  records: number;
}
export interface AttendanceDetail {
  name: string;
  pt: number;
  classes: number;
  gym: number;
}
export interface FeatureViewDetail {
  name: string;
  views: number;
}
export interface NotOnAppDetail {
  name: string;
  email: string;
}

export interface UsageReport {
  window: { start: string; end: string };
  activeMembers: {
    count: number;
    memberNames: string[];
    detail: ActiveMemberDetail[];
  };
  workouts: {
    totalSessions: number;
    totalMembers: number;
    byProgramme: {
      programme: string;
      sessions: number;
      members: number;
      memberNames: string[];
    }[];
    memberNames: string[];
    detail: WorkoutDetail[];
  };
  habits: {
    totalCheckins: number;
    members: number;
    memberNames: string[];
    detail: HabitDetail[];
  };
  nutrition: {
    entries: number;
    members: number;
    memberNames: string[];
    detail: NutritionDetail[];
  };
  community: {
    posts: number;
    comments: number;
    reactions: number;
    activeMembers: number;
    posterNames: string[];
    detail: CommunityDetail[];
  };
  leaderboards: {
    scores: number;
    members: number;
    memberNames: string[];
    detail: LeaderboardDetail[];
  };
  pbs: {
    records: number;
    members: number;
    memberNames: string[];
    detail: PbDetail[];
  };
  attendance: {
    ptSessions: number;
    ptMembers: number;
    ptNames: string[];
    classes: number;
    classMembers: number;
    classNames: string[];
    gymVisits: number;
    gymMembers: number;
    gymNames: string[];
    detail: AttendanceDetail[];
  };
  featureViews: {
    feature: string;
    views: number;
    members: number;
    memberNames: string[];
    detail: FeatureViewDetail[];
  }[];
  adoption: {
    rosterTotal: number;
    onApp: number;
    notOnApp: number;
    notOnAppList: NotOnAppDetail[];
  };
}

export async function fetchUsageReport(
  staffSecret: string,
  start: string,
  end: string,
): Promise<UsageReport> {
  const { data, error } = await supabase.functions.invoke("usage-report", {
    body: { staffSecret, start, end },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as UsageReport;
}

/** Mon–Sun this week, YYYY-MM-DD. */
export function thisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: ymd(mon), end: ymd(sun) };
}

export function lastWeekRange(): { start: string; end: string } {
  const t = thisWeekRange();
  const s = new Date(t.start);
  s.setDate(s.getDate() - 7);
  const e = new Date(t.end);
  e.setDate(e.getDate() - 7);
  return { start: ymd(s), end: ymd(e) };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Export a usage report to CSV (totals + name lists). */
export function exportUsageCsv(report: UsageReport) {
  const rows: (string | number)[][] = [];
  rows.push(["Section", "Metric", "Value", "Members", "Names"]);

  rows.push([
    "Active members",
    "count",
    report.activeMembers.count,
    "",
    report.activeMembers.memberNames.join("; "),
  ]);
  rows.push([
    "Workouts",
    "totalSessions",
    report.workouts.totalSessions,
    report.workouts.totalMembers,
    report.workouts.memberNames.join("; "),
  ]);
  for (const p of report.workouts.byProgramme) {
    rows.push([
      `Programme: ${p.programme}`,
      "sessions",
      p.sessions,
      p.members,
      p.memberNames.join("; "),
    ]);
  }
  rows.push([
    "Habits",
    "totalCheckins",
    report.habits.totalCheckins,
    report.habits.members,
    report.habits.memberNames.join("; "),
  ]);
  rows.push([
    "Nutrition",
    "entries",
    report.nutrition.entries,
    report.nutrition.members,
    report.nutrition.memberNames.join("; "),
  ]);
  rows.push([
    "Community",
    "posts",
    report.community.posts,
    report.community.activeMembers,
    report.community.posterNames.join("; "),
  ]);
  rows.push(["Community", "comments", report.community.comments, "", ""]);
  rows.push(["Community", "reactions", report.community.reactions, "", ""]);
  rows.push([
    "Leaderboards",
    "scores",
    report.leaderboards.scores,
    report.leaderboards.members,
    report.leaderboards.memberNames.join("; "),
  ]);
  rows.push([
    "PBs",
    "records",
    report.pbs.records,
    report.pbs.members,
    report.pbs.memberNames.join("; "),
  ]);
  rows.push([
    "Attendance",
    "ptSessions",
    report.attendance.ptSessions,
    report.attendance.ptMembers,
    report.attendance.ptNames.join("; "),
  ]);
  rows.push([
    "Attendance",
    "classes",
    report.attendance.classes,
    report.attendance.classMembers,
    report.attendance.classNames.join("; "),
  ]);
  rows.push([
    "Attendance",
    "gymVisits",
    report.attendance.gymVisits,
    report.attendance.gymMembers,
    report.attendance.gymNames.join("; "),
  ]);
  for (const f of report.featureViews) {
    rows.push([
      `Feature: ${f.feature}`,
      "views",
      f.views,
      f.members,
      f.memberNames.join("; "),
    ]);
  }
  rows.push(["Adoption", "rosterTotal", report.adoption.rosterTotal, "", ""]);
  rows.push(["Adoption", "onApp", report.adoption.onApp, "", ""]);
  rows.push(["Adoption", "notOnApp", report.adoption.notOnApp, "", ""]);

  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usage-report_${report.window.start}_${report.window.end}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
