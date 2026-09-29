import { useMemo } from "react";
import type { AttendanceDay } from "@/lib/memberProgress";

/**
 * A GitHub-style attendance heat strip: the last ~12 weeks of gym activity,
 * grouped into week columns (Mon→Sun). Each cell is coloured by activity
 * intensity so members can see their attendance pattern at a glance.
 *
 * Intensity levels:
 *  0 = no activity (muted)
 *  1 = one kind (gym visit OR class OR PT OR session)
 *  2 = two kinds
 *  3 = three+ kinds
 */
export function AttendanceHeatStrip({ days }: { days: AttendanceDay[] }) {
  const { weeks, monthLabels } = useMemo(() => buildGrid(days), [days]);

  if (!days.length) return null;

  const activeCount = days.filter((d) => intensity(d) > 0).length;

  return (
    <div className="w-full">
      <div className="flex items-end gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                title={
                  day ? `${formatDate(day.date)} · ${labelFor(day)}` : undefined
                }
                className={"h-[11px] w-[11px] rounded-[2px] " + cellClass(day)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">
          {activeCount} active {activeCount === 1 ? "day" : "days"} in the last
          12 weeks
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {[0, 1, 2, 3].map((lvl) => (
            <span
              key={lvl}
              className={"h-[10px] w-[10px] rounded-[2px] " + levelClass(lvl)}
            />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
      {monthLabels.length > 0 && (
        <div className="flex gap-[3px] mt-1 overflow-x-auto">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[10px] text-muted-foreground whitespace-nowrap"
              style={{ width: m.width }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

const intensity = (d: AttendanceDay | null): number => {
  if (!d) return 0;
  let n = 0;
  if (d.gymVisit) n++;
  if (d.pt) n++;
  if (d.classBooking) n++;
  if (d.session) n++;
  return n;
};

const cellClass = (d: AttendanceDay | null): string => {
  const lvl = intensity(d);
  if (lvl === 0) return "bg-muted/40";
  return levelClass(lvl);
};

const levelClass = (lvl: number): string => {
  switch (lvl) {
    case 1:
      return "bg-primary/40";
    case 2:
      return "bg-primary/65";
    case 3:
    default:
      return "bg-primary";
  }
};

const labelFor = (d: AttendanceDay): string => {
  const parts: string[] = [];
  if (d.gymVisit) parts.push("Gym visit");
  if (d.pt) parts.push("PT");
  if (d.classBooking) parts.push("Class");
  if (d.session) parts.push("Session");
  return parts.length ? parts.join(" · ") : "Rest day";
};

const formatDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

/**
 * Build a grid of weeks (columns) × 7 days (rows, Mon→Sun), plus month labels.
 * `days` is sorted ascending by date. We align to week-start = Monday.
 */
const buildGrid = (
  days: AttendanceDay[],
): {
  weeks: (AttendanceDay | null)[][];
  monthLabels: { label: string; width: string }[];
} => {
  if (!days.length) return { weeks: [], monthLabels: [] };

  const byDate = new Map<string, AttendanceDay>();
  for (const d of days) byDate.set(d.date, d);

  // Monday-based day index (0=Mon … 6=Sun).
  const dowMon = (iso: string) => {
    const js = new Date(iso + "T00:00:00").getDay(); // 0=Sun
    return js === 0 ? 6 : js - 1;
  };

  const first = days[0];
  const firstDow = dowMon(first.date);
  // Pad the first week so the grid starts on Monday.
  const weeks: (AttendanceDay | null)[][] = [];
  let currentWeek: (AttendanceDay | null)[] = new Array(firstDow).fill(null);

  for (const d of days) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Month labels: for each week, the month of its first real day.
  const monthLabels: { label: string; width: string }[] = [];
  let lastLabel = "";
  let runStart = 0;
  weeks.forEach((w, i) => {
    const firstReal = w.find((x) => x);
    if (!firstReal) return;
    const label = new Date(firstReal.date + "T00:00:00").toLocaleDateString(
      "en-GB",
      { month: "short" },
    );
    if (label !== lastLabel) {
      if (lastLabel) {
        monthLabels.push({
          label: lastLabel,
          width: `${(i - runStart) * 14}px`,
        });
      }
      lastLabel = label;
      runStart = i;
    }
  });
  if (lastLabel) {
    monthLabels.push({
      label: lastLabel,
      width: `${(weeks.length - runStart) * 14}px`,
    });
  }

  return { weeks, monthLabels };
};
