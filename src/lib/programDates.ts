// Date helpers for programme session naming.
// Each session is named from ITS OWN week's start date plus its day offset
// (Day N = start_date + (N - 1) days), so Week 2 Day 3 uses Week 2's start, not Week 1's.

export const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const addDaysISO = (iso: string, n: number): string => {
  const [y, m, d] = (iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d + n); // local constructor — no timezone shift
  if (isNaN(dt.getTime())) return iso;
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`; // format from local parts, never toISOString
};

export const sessionDateName = (
  startISO: string,
  dayOffset: number,
): string => {
  const d = new Date(startISO + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + dayOffset);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return `${weekday} ${ordinal(d.getDate())} ${month}`;
};

// Compute a session's name + scheduled_date from its own week start date + day offset.
// weekNotes defaults to {} — pass the current progWeekNotes from the caller (or an
// explicitly-updated copy when re-dating a single week after a start-date change).
export const dateSession = (
  w: any,
  weekNotes: Record<number, any> = {},
): any => {
  const wk = Number(w.week);
  const day = Number(w.day) || 1;
  const start =
    weekNotes[wk]?.start_date ||
    (weekNotes[1]?.start_date
      ? addDaysISO(weekNotes[1].start_date, (wk - 1) * 7)
      : null);
  if (!start) return w;
  const offset = day - 1; // Day 3 => +2 days
  const iso = addDaysISO(start, offset);
  return {
    ...w,
    name: sessionDateName(start, offset),
    date: iso, // canonical field used by the Scheduled Date input + all save payloads
    scheduled_date: iso, // kept for any legacy readers
  };
};

// Re-date EVERY session from its own week's start date + day offset.
// Pass the live weekNotes object. Returns a new array with name + scheduled_date set.
export const dateAllSessions = (
  workouts: any[],
  weekNotes: Record<number, any>,
): any[] => workouts.map((w) => dateSession(w, weekNotes));

// Re-date only the sessions of a single week, after its start date has changed.
// `updatedWeekNotes` MUST already contain the new start_date for that week.
export const dateWeekSessions = (
  workouts: any[],
  week: number,
  updatedWeekNotes: Record<number, any>,
): any[] =>
  workouts.map((w) =>
    Number(w.week) === Number(week)
      ? dateSession({ ...w, week }, updatedWeekNotes)
      : w,
  );
