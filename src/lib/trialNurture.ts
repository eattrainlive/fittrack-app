import { supabase } from "./supabase";

/**
 * Trial nurture sequence — the engine behind Carla's "Trial Nurture" cockpit.
 *
 * A 30-day trialist drip worked from FitTrack. The WELCOME step auto-sends
 * server-side when the trial clock starts (gymos-webhook → maybeStartTrial fires
 * the GHL "trial started" workflow and logs step_key='welcome'). EVERY OTHER step
 * is reviewed and sent by a coach from the cockpit: she sees who's due a touch
 * today, tweaks the personal note, and hits send → our Netlify proxy fires the
 * GHL workflow (sends that step's approved WhatsApp template + writes the note to
 * the contact) and we log the send so it never fires twice.
 *
 * Timing is keyed off trial_cohort.trial_start (which GymOS sets from the FIRST
 * booked session, so the drip lines up with the member's own app day-count).
 * Day 10 branches on attendance; the cockpit also surfaces no-show and hot-lead
 * flags from member_bookings so the coach can prioritise the right calls.
 *
 * Nothing here throws — a data blip must never break the cockpit.
 */

// ── Step catalogue ──────────────────────────────────────────────────────────

export type NurtureCategory = "welcome" | "checkin" | "behaviour" | "convert";

export interface NurtureStep {
  key: string; // stable log key — NEVER rename (matches trial_nurture_log.step_key)
  label: string; // short cockpit label
  day: number; // trial day it becomes due (trial_start = day 1)
  templateKey: string; // GHL approved WhatsApp template to send
  category: NurtureCategory;
  auto?: boolean; // welcome only — fired server-side, shown as sent
  branch?: "attending" | "not_attending"; // Day-10 behaviour branch selector
  blurb: string; // what this touch is for (coach-facing)
  // The FIXED (Meta-approved) template copy, shown in the cockpit so the coach
  // sees exactly what will send. The optional coach note slots BETWEEN before and
  // after (GHL merges it via {{coach_note}}). ⚠ DISPLAY MIRROR of the GHL template
  // — if you edit the wording here, update the matching GHL template too, and vice
  // versa. {name} is filled with the trialist's first name at render.
  templateBefore: string;
  templateAfter: string;
  defaultNote: string; // optional suggested coach note ({name} ok), editable/clearable
}

/** The full sequence. `day` drives "due"; order here is the natural order. */
export const NURTURE_STEPS: NurtureStep[] = [
  {
    key: "welcome",
    label: "Welcome",
    day: 1,
    templateKey: "trial_welcome",
    category: "welcome",
    auto: true,
    blurb: "Auto-sent when their trial starts — warm welcome + nudge to book session 1.",
    templateBefore: "Hi {name}, welcome to Eat Train Live Smart — we're buzzing to have you.",
    templateAfter: "Your first session is where it all clicks. Reply here and we'll get you booked in.",
    defaultNote: "",
  },
  {
    key: "post_first",
    label: "After 1st session",
    day: 3,
    templateKey: "trial_post_first",
    category: "checkin",
    blurb: "Check in after their first session — how did it feel, any questions.",
    templateBefore: "Hey {name}, how did your first session feel?",
    templateAfter: "Any aches, questions or wins — just reply, I'm right here to help you settle in.",
    defaultNote: "",
  },
  {
    key: "week1_win",
    label: "Week 1 win",
    day: 7,
    templateKey: "trial_week1",
    category: "checkin",
    blurb: "Celebrate week 1 + point them at what's next.",
    templateBefore: "One week in, {name} — brilliant work getting started.",
    templateAfter: "This week we build on it. Keep the sessions coming and you'll really start to feel it.",
    defaultNote: "",
  },
  {
    key: "day10_momentum",
    label: "Momentum (attending)",
    day: 10,
    templateKey: "trial_momentum",
    category: "behaviour",
    branch: "attending",
    blurb: "They're turning up — reinforce the habit, keep the streak going.",
    templateBefore: "Loving the consistency, {name} — this is exactly how results are built.",
    templateAfter: "Keep that streak rolling. What session are you in for next?",
    defaultNote: "",
  },
  {
    key: "day10_reengage",
    label: "Re-engage (quiet)",
    day: 10,
    templateKey: "trial_reengage",
    category: "behaviour",
    branch: "not_attending",
    blurb: "They've gone quiet — gentle re-engage + offer to book them back in.",
    templateBefore: "Hey {name}, not seen you in a few days — everything ok?",
    templateAfter: "Life gets busy, no stress. Let's get your next session booked and pick it straight back up.",
    defaultNote: "",
  },
  {
    key: "halfway",
    label: "Halfway check",
    day: 14,
    templateKey: "trial_halfway",
    category: "convert",
    blurb: "Halfway point — goal check + offer to book a progress review.",
    templateBefore: "Halfway through already, {name} — how are you feeling about your goal?",
    templateAfter: "Fancy a quick progress review? Ten minutes to look at where you're at and map the rest out.",
    defaultNote: "",
  },
  {
    key: "results_nudge",
    label: "Book results review",
    day: 21,
    templateKey: "trial_results_review",
    category: "convert",
    blurb: "The convert conversation — invite them to book their results review.",
    templateBefore: "You've put the work in, {name}, and it shows.",
    templateAfter: "Let's sit down and look at your results properly. When suits you for a review this week?",
    defaultNote: "",
  },
  {
    key: "ending_soon",
    label: "Trial ending soon",
    day: 25,
    templateKey: "trial_ending_soon",
    category: "convert",
    blurb: "Heads-up the trial is ending + the membership options.",
    templateBefore: "Hard to believe, {name} — your trial wraps up in a few days.",
    templateAfter: "Here are the options to keep your momentum going. Want me to run through which fits you best?",
    defaultNote: "",
  },
  {
    key: "decision",
    label: "Decision / last chance",
    day: 28,
    templateKey: "trial_decision",
    category: "convert",
    blurb: "Final decision nudge before the trial ends.",
    templateBefore: "Last few days of your trial, {name} — and I'd genuinely love to keep you with us.",
    templateAfter: "Shall we get you set up before it ends so you don't lose your progress? Just say the word.",
    defaultNote: "",
  },
];

/** Days a step stays "due" after its day before it's flagged OVERDUE. */
const OVERDUE_GRACE = 2;
/** No attended session in this many days (and ≥ day 3) → no-show flag. */
const NO_SHOW_DAYS = 5;
/** Attended sessions in the first week ≥ this → hot-lead flag. */
const HOT_LEAD_FIRST_WEEK = 3;

// ── Types ─────────────────────────────────────────────────────────────────

export type StepState = "sent" | "due" | "overdue" | "upcoming";

export interface StepStatus {
  step: NurtureStep;
  state: StepState;
  sentAt?: string | null;
  sentBy?: string | null;
}

export interface NurtureTrialist {
  email: string;
  name: string;
  trialStart: string; // yyyy-mm-dd
  trialEnd: string | null;
  trialDay: number; // 1-based day of the trial today
  attended: number; // attended sessions in the trial window
  attendedWeek1: number; // attended in first 7 days
  daysSinceVisit: number | null; // null = never attended
  lastVisit: string | null;
  flags: {
    noShow: boolean;
    hotLead: boolean;
    neverAttended: boolean;
  };
  steps: StepStatus[]; // every step with its state
  nextStep: StepStatus | null; // the single step the coach should action now
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MS_DAY = 86400000;
// Calendar-day numbers, computed in UTC on both sides so the trial-day count is
// stable regardless of time of day (never mix a local-parsed date with a UTC
// epoch — that drifts by a day near midnight).
const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / MS_DAY);
const dateDayNum = (d: Date) => Math.floor(d.getTime() / MS_DAY);
const todayDayNum = () => {
  const n = new Date();
  return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / MS_DAY);
};

/** 1-based trial day for a given start date (trial_start itself = day 1). */
export function trialDayFor(trialStart: string): number {
  return todayDayNum() - dayNum(trialStart) + 1;
}

export function firstName(name: string): string {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

export function renderNote(tpl: string, name: string): string {
  return tpl.replace(/\{name\}/g, firstName(name));
}

/** Fill {name} in a template's before/after copy for display. */
export function renderTemplate(step: NurtureStep, name: string): { before: string; after: string } {
  return {
    before: step.templateBefore.replace(/\{name\}/g, firstName(name)),
    after: step.templateAfter.replace(/\{name\}/g, firstName(name)),
  };
}

/** The full message as it will send: template copy with the coach note slotted in. */
export function renderFullMessage(step: NurtureStep, name: string, note: string): string {
  const { before, after } = renderTemplate(step, name);
  const n = (note || "").trim();
  return [before, n, after].filter(Boolean).join("\n");
}

/**
 * Which concrete step applies on the Day-10 behaviour branch for this trialist.
 * Returns the step key to KEEP; the other branch step is dropped from their list.
 */
function activeBranchKey(attendedWeek1: number, daysSinceVisit: number | null): string {
  const attending =
    attendedWeek1 >= 2 || (daysSinceVisit != null && daysSinceVisit <= 3);
  return attending ? "day10_momentum" : "day10_reengage";
}

// ── Board assembly ───────────────────────────────────────────────────────────

interface CohortRow {
  email: string;
  full_name: string | null;
  trial_start: string | null;
  trial_end: string | null;
  converted: boolean | null;
}
interface BookingRow {
  email: string;
  session_at: string | null;
  status: string | null;
}
interface LogRow {
  email: string;
  step_key: string;
  sent_at: string;
  sent_by: string | null;
}

/** Build one trialist's enriched nurture state. */
function enrich(
  c: CohortRow,
  bookings: BookingRow[],
  logs: LogRow[],
): NurtureTrialist | null {
  if (!c.trial_start) return null; // clock not started — not in the drip yet
  const name = c.full_name || c.email;
  const trialDay = trialDayFor(c.trial_start);
  const startNum = dayNum(c.trial_start);

  const attendedDates = bookings
    .filter((b) => b.status === "attended" && b.session_at)
    .map((b) => new Date(b.session_at as string))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const attended = attendedDates.length;
  const attendedWeek1 = attendedDates.filter(
    (d) => dateDayNum(d) - startNum < 7,
  ).length;
  const last = attendedDates.length ? attendedDates[attendedDates.length - 1] : null;
  const daysSinceVisit = last ? todayDayNum() - dateDayNum(last) : null;

  const sentMap = new Map<string, LogRow>();
  for (const l of logs) if (!sentMap.has(l.step_key)) sentMap.set(l.step_key, l);

  const keepBranch = activeBranchKey(attendedWeek1, daysSinceVisit);
  // The day-10 behaviour slot is satisfied if EITHER branch variant was ever
  // sent — a trialist can flip attending↔quiet after one went out, and we must
  // never re-offer the slot's other variant as if nothing was sent.
  const branchSent =
    sentMap.get("day10_momentum") ?? sentMap.get("day10_reengage") ?? null;

  const steps: StepStatus[] = NURTURE_STEPS
    // drop the branch step that doesn't apply to this trialist
    .filter((s) => !s.branch || s.key === keepBranch)
    .map((step) => {
      const sent = step.branch ? sentMap.get(step.key) ?? branchSent : sentMap.get(step.key);
      if (sent) {
        return { step, state: "sent" as StepState, sentAt: sent.sent_at, sentBy: sent.sent_by };
      }
      if (trialDay >= step.day + OVERDUE_GRACE) return { step, state: "overdue" as StepState };
      if (trialDay >= step.day) return { step, state: "due" as StepState };
      return { step, state: "upcoming" as StepState };
    });

  // The one to action now: earliest un-sent step that is overdue or due (coach
  // never sends the auto welcome). Overdue outranks due via step order (ascending day).
  const actionable = steps.filter(
    (s) => !s.step.auto && (s.state === "overdue" || s.state === "due"),
  );
  const nextStep = actionable.length ? actionable[0] : null;

  return {
    email: c.email,
    name,
    trialStart: c.trial_start,
    trialEnd: c.trial_end,
    trialDay,
    attended,
    attendedWeek1,
    daysSinceVisit,
    lastVisit: last ? last.toISOString() : null,
    flags: {
      neverAttended: attended === 0 && trialDay >= 3,
      noShow:
        attended > 0 &&
        daysSinceVisit != null &&
        daysSinceVisit >= NO_SHOW_DAYS &&
        trialDay <= 32,
      hotLead: attendedWeek1 >= HOT_LEAD_FIRST_WEEK,
    },
    steps,
    nextStep,
  };
}

export interface NurtureBoard {
  dueNow: NurtureTrialist[]; // has an overdue/due step to send today
  upcoming: NurtureTrialist[]; // in the drip, nothing to send yet
}

/**
 * Load everything the cockpit needs and assemble the board.
 * Active trialists = a cohort row, trial_start set, not converted, trial not long past.
 */
export async function getNurtureBoard(): Promise<NurtureBoard> {
  try {
    const { data: cohort } = await supabase
      .from("trial_cohort")
      .select("email, full_name, trial_start, trial_end, converted")
      .eq("converted", false)
      .not("trial_start", "is", null);

    const rows = (cohort as CohortRow[]) ?? [];
    if (!rows.length) return { dueNow: [], upcoming: [] };

    const emails = rows.map((r) => r.email);

    const [{ data: bookings }, { data: logs }] = await Promise.all([
      supabase
        .from("member_bookings")
        .select("email, session_at, status")
        .in("email", emails),
      supabase
        .from("trial_nurture_log")
        .select("email, step_key, sent_at, sent_by")
        .in("email", emails),
    ]);

    const bookingsBy = new Map<string, BookingRow[]>();
    for (const b of (bookings as BookingRow[]) ?? []) {
      const k = String(b.email).toLowerCase();
      (bookingsBy.get(k) ?? bookingsBy.set(k, []).get(k)!).push(b);
    }
    const logsBy = new Map<string, LogRow[]>();
    for (const l of (logs as LogRow[]) ?? []) {
      const k = String(l.email).toLowerCase();
      (logsBy.get(k) ?? logsBy.set(k, []).get(k)!).push(l);
    }

    const enriched = rows
      .map((c) =>
        enrich(
          c,
          bookingsBy.get(String(c.email).toLowerCase()) ?? [],
          logsBy.get(String(c.email).toLowerCase()) ?? [],
        ),
      )
      .filter((t): t is NurtureTrialist => t != null)
      // drop trialists whose window is well past (no more drip to work)
      .filter((t) => t.trialDay <= 35);

    const dueNow = enriched
      .filter((t) => t.nextStep != null)
      .sort((a, b) => {
        // overdue before due, then hot leads, then by trial day (older first)
        const ov = (t: NurtureTrialist) => (t.nextStep?.state === "overdue" ? 0 : 1);
        if (ov(a) !== ov(b)) return ov(a) - ov(b);
        if (a.flags.hotLead !== b.flags.hotLead) return a.flags.hotLead ? -1 : 1;
        return b.trialDay - a.trialDay;
      });
    const upcoming = enriched
      .filter((t) => t.nextStep == null)
      .sort((a, b) => b.trialDay - a.trialDay);

    return { dueNow, upcoming };
  } catch (e) {
    console.warn("getNurtureBoard failed", e);
    return { dueNow: [], upcoming: [] };
  }
}

// ── Sending ──────────────────────────────────────────────────────────────────

export interface SendStepArgs {
  // email + name are required; the trial_* fields are optional context passed to
  // GHL when available (the cockpit may pass just {email,name}). Keep them optional
  // so the call site can hand over either a full trialist or the minimal pair.
  trialist: Pick<NurtureTrialist, "email" | "name"> &
    Partial<Pick<NurtureTrialist, "trialStart" | "trialEnd" | "trialDay">>;
  step: NurtureStep;
  note: string; // the (possibly edited) personal note
  by: string; // coach name
}

/**
 * Fire the step's GHL workflow (approved WhatsApp template + write the coach note
 * to the contact) via our staff-only proxy, then log the send so it can't repeat.
 * Returns { ok } — the UI should only mark it sent + refresh when ok is true.
 */
export async function sendStep(args: SendStepArgs): Promise<{ ok: boolean; error?: string }> {
  const { trialist, step, note, by } = args;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";

    const res = await fetch("/.netlify/functions/trial-nurture", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: trialist.email,
        name: trialist.name,
        step_key: step.key,
        template_key: step.templateKey,
        coach_note: note,
        trial_start: trialist.trialStart ?? null,
        trial_end: trialist.trialEnd ?? null,
        trial_day: trialist.trialDay ?? null,
        by,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return { ok: false, error: data?.error || `send failed (${res.status})` };
    }

    // Log the send (so the step won't re-offer). Best-effort — staff RLS on the table.
    const { error: logErr } = await supabase.from("trial_nurture_log").insert({
      email: trialist.email,
      step_key: step.key,
      template_key: step.templateKey,
      coach_note: note,
      sent_by: by,
    });
    if (logErr) console.warn("[trialNurture] log insert failed:", logErr.message);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Full send history for one trialist (newest first) — for the cockpit detail view. */
export async function getNurtureHistory(email: string): Promise<LogRow[]> {
  try {
    const { data } = await supabase
      .from("trial_nurture_log")
      .select("email, step_key, sent_at, sent_by")
      .eq("email", email)
      .order("sent_at", { ascending: false });
    return (data as LogRow[]) ?? [];
  } catch {
    return [];
  }
}
