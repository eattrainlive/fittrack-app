// Staff/coach view of a member's food diary — view-only. Shows the full day's
// log grouped by meal with daily totals, and a 7-day view with per-logged-day
// averages + adherence. Lives in the Member Activity modal.
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Utensils } from "lucide-react";
import {
  fetchMemberDiary,
  entryTotals,
  sumTotals,
  MEAL_ORDER,
  type DiaryEntry,
  type Totals,
} from "@/lib/memberNutrition";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtShort = (isoDate: string) =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const MacroLine = ({ t }: { t: Totals }) => (
  <span className="tabular-nums">
    P {t.p}g · C {t.c}g · F {t.f}g
  </span>
);

export function CoachNutritionLog({ memberUserId }: { memberUserId: string }) {
  const [view, setView] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Always fetch the 7-day window ending on the anchor date (covers both views).
  const fromISO = iso(addDays(anchor, -6));
  const toISO = iso(anchor);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMemberDiary(memberUserId, fromISO, toISO)
      .then((e) => {
        if (alive) setEntries(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [memberUserId, fromISO, toISO]);

  // Group the 7 days (oldest→newest) with per-day entries + totals.
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dISO = iso(addDays(anchor, -(6 - i)));
      const dayEntries = entries.filter((e) => e.date === dISO);
      return { dISO, entries: dayEntries, totals: sumTotals(dayEntries) };
    });
  }, [entries, anchor]);

  const weekStats = useMemo(() => {
    const logged = days.filter((d) => d.entries.length > 0);
    const n = logged.length || 1;
    const sum = logged.reduce(
      (t, d) => ({
        cal: t.cal + d.totals.cal,
        p: t.p + d.totals.p,
        c: t.c + d.totals.c,
        f: t.f + d.totals.f,
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
    return {
      daysLogged: logged.length,
      avg: {
        cal: Math.round(sum.cal / n),
        p: Math.round(sum.p / n),
        c: Math.round(sum.c / n),
        f: Math.round(sum.f / n),
      },
    };
  }, [days]);

  const today = days[6]; // the anchor day
  const step = view === "day" ? 1 : 7;
  const canGoForward = iso(anchor) < iso(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Nutrition
        </p>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 font-bold capitalize ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAnchor((a) => addDays(a, -step))}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {view === "day"
            ? fmtShort(today.dISO)
            : `${fmtShort(days[0].dISO)} – ${fmtShort(days[6].dISO)}`}
        </span>
        <button
          onClick={() => canGoForward && setAnchor((a) => addDays(a, step))}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : view === "day" ? (
        <DayView entries={today.entries} totals={today.totals} />
      ) : (
        <WeekView days={days} weekStats={weekStats} />
      )}
    </div>
  );
}

function DayView({
  entries,
  totals,
}: {
  entries: DiaryEntry[];
  totals: Totals;
}) {
  if (!entries.length) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        No food logged this day.
      </p>
    );
  }
  const byMeal: Record<string, DiaryEntry[]> = {};
  entries.forEach((e) => {
    const m = e.meal || "Other";
    (byMeal[m] ||= []).push(e);
  });
  const meals = Object.keys(byMeal).sort(
    (a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b),
  );
  return (
    <div className="space-y-2.5">
      {meals.map((m) => (
        <div key={m}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {m}
          </p>
          <div className="space-y-1">
            {byMeal[m].map((e) => {
              const t = entryTotals(e);
              const mult = e.servings || 1;
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-xs border border-border rounded-lg px-2.5 py-1.5"
                >
                  <span className="min-w-0 truncate font-medium">
                    {e.name}
                    {mult !== 1 && (
                      <span className="text-muted-foreground"> ×{mult}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {t.cal} kcal · P{t.p} C{t.c} F{t.f}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-foreground text-background px-3 py-2 text-sm">
        <strong>
          Day total:{" "}
          <span className="text-primary tabular-nums">{totals.cal} kcal</span>
        </strong>
        <span className="text-xs">
          <MacroLine t={totals} />
        </span>
      </div>
    </div>
  );
}

function WeekView({
  days,
  weekStats,
}: {
  days: { dISO: string; entries: DiaryEntry[]; totals: Totals }[];
  weekStats: { daysLogged: number; avg: Totals };
}) {
  return (
    <div className="space-y-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-muted-foreground">
            <th className="text-left font-bold py-1">Day</th>
            <th className="text-right font-bold py-1">kcal</th>
            <th className="text-right font-bold py-1">P</th>
            <th className="text-right font-bold py-1">C</th>
            <th className="text-right font-bold py-1">F</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const logged = d.entries.length > 0;
            return (
              <tr key={d.dISO} className="border-t border-border">
                <td className="py-1.5">{fmtShort(d.dISO)}</td>
                {logged ? (
                  <>
                    <td className="text-right tabular-nums font-semibold">
                      {d.totals.cal}
                    </td>
                    <td className="text-right tabular-nums">{d.totals.p}</td>
                    <td className="text-right tabular-nums">{d.totals.c}</td>
                    <td className="text-right tabular-nums">{d.totals.f}</td>
                  </>
                ) : (
                  <td
                    colSpan={4}
                    className="text-right text-muted-foreground/60 italic"
                  >
                    not logged
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="rounded-lg bg-foreground text-background px-3 py-2 space-y-0.5">
        <div className="flex items-center justify-between text-sm">
          <strong>
            Avg / logged day:{" "}
            <span className="text-primary tabular-nums">
              {weekStats.avg.cal} kcal
            </span>
          </strong>
          <span className="text-xs">
            <MacroLine t={weekStats.avg} />
          </span>
        </div>
        <p className="text-[11px] text-background/70">
          Logged {weekStats.daysLogged} of 7 days
        </p>
      </div>
    </div>
  );
}
