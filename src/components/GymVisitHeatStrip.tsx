// Gym-visit calendar heat-strip (GitHub-contribution style).
// Shows the member's attendance pattern at a glance: each column = a week
// (oldest left → newest right), each cell = a day (Sun→Sat). A filled cell =
// a day the member was at the gym (PT/class booking or open-gym visit).
// Hover/tap shows the date.

const WEEKS = 16;

export function GymVisitHeatStrip({ visitDates }: { visitDates: string[] }) {
  const visitDays = new Set(
    (visitDates || []).map((d) => String(d).slice(0, 10)),
  );

  const cols: { date: string; visited: boolean }[][] = [];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const lastSunday = new Date(todayDate);
  lastSunday.setDate(todayDate.getDate() - todayDate.getDay());
  const startSunday = new Date(lastSunday);
  startSunday.setDate(lastSunday.getDate() - (WEEKS - 1) * 7);

  for (let w = 0; w < WEEKS; w++) {
    const col: { date: string; visited: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(startSunday);
      day.setDate(startSunday.getDate() + w * 7 + d);
      const ds = day.toISOString().slice(0, 10);
      col.push({ date: ds, visited: visitDays.has(ds) });
    }
    cols.push(col);
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  cols.forEach((col, ci) => {
    const m = new Date(col[0].date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        label: new Date(col[0].date).toLocaleDateString("en-GB", {
          month: "short",
        }),
        col: ci,
      });
      lastMonth = m;
    }
  });

  const total = visitDays.size;
  const rangeStart = cols[0][0].date;
  const rangeEnd = cols[cols.length - 1][6].date;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Attendance · last {WEEKS} weeks
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {total} {total === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="min-w-max">
          <div
            className="grid gap-[3px] mb-1"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 12px)` }}
          >
            {cols.map((_, ci) => {
              const ml = monthLabels.find((m) => m.col === ci);
              return (
                <div
                  key={ci}
                  className="text-[9px] text-muted-foreground leading-none h-3"
                >
                  {ml ? ml.label : ""}
                </div>
              );
            })}
          </div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 12px)` }}
          >
            {cols.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}${cell.visited ? " · attended" : ""}`}
                    className={
                      "w-3 h-3 rounded-[3px] border " +
                      (cell.visited
                        ? "bg-primary border-primary"
                        : "bg-muted/40 border-border/60")
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {new Date(rangeStart).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Off</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/40 border border-border/60" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary border-primary" />
          <span className="text-[10px] text-muted-foreground">Attended</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {new Date(rangeEnd).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>
    </div>
  );
}

export default GymVisitHeatStrip;
