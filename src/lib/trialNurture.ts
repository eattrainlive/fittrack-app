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
  // "After their first session" — becomes due AFTER the trialist's first booked
  // session time (+ a buffer), since we can't see attendance. Falls back to the
  // `day` offset if they have no booking yet.
  afterFirstSession?: boolean;
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
    templateBefore: "Hi {name}, welcome to Eat Train Live. Firstly thank you so much for choosing us — we're really looking forward to getting you where you need to be.\n\nMake sure you check out the education area in the coaching section on the FitTrack app, as it has everything you need to know for getting started.",
    templateAfter: "Have you had chance to look over the classes yet? If I can help you choose your first class, just shout up.\n\nI'll be your point of contact over the next few weeks, so fire over any questions.\nCarla",
    defaultNote: "",
  },
  {
    key: "post_first",
    label: "After 1st session",
    day: 3,
    afterFirstSession: true,
    templateKey: "trial_post_first",
    category: "checkin",
    blurb: "Check in after their first session — how did it feel, any questions.",
    templateBefore: "Hey {name}, how did your first session go? Feeling a bit sore? It's very common to feel a few aches afterwards, so try not to be put off — it's totally normal. It can also feel a lot to take in at first and a little overwhelming. Just remember, all you need to do is rock up with your drink and leave the rest to us. You've done the hardest part by walking through those doors. Well done!\n\nCarla\nETL",
    templateAfter: "",
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
    templateBefore: "Hi {name}, loving the consistency! This is exactly how results are built.",
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
    templateAfter: "Let's get your next session booked and pick it straight back up.",
    defaultNote: "",
  },
  {
    key: "halfway",
    label: "Halfway check",
    day: 14,
    templateKey: "trial_halfway",
    category: "convert",
    blurb: "Halfway point — goal check + offer to book a progress review.",
    templateBefore: "Hi {name}, halfway through already — how are you feeling about your sessions so far?",
    templateAfter: "Fancy a trial review? I can book you in to come down for a quick chat and pop you on the Evolt body scanner again. If not, I'm free to call you if that works better?",
    defaultNote: "",
  },
  {
    key: "results_nudge",
    label: "Book results review",
    day: 21,
    templateKey: "trial_results_review",
    category: "convert",
    blurb: "The convert conversation — invite them to book their results review.",
    templateBefore: "Hi {name}, you've put the work in, and it shows.",
    templateAfter: "Let's sit down and look at your results properly. When suits you for a review this week? You can pop in or I can call you?",
    defaultNote: "",
  },
  {
    key: "ending_soon",
    label: "Trial ending soon",
    day: 25,
    templateKey: "trial_ending_soon",
    category: "convert",
    blurb: "Heads-up the trial is ending + the membership options.",
    templateBefore: "Heyyyy {name}, so your trial is up in a few days.",
    templateAfter: "We hope you've enjoyed your time with us! I can book you in for a review to go over some membership options — just open the link to book whatever day/time works for you.\n\nhttps://api.leadconnectorhq.com/widget/bookings/trial-reviews\n\nAny issues let me know.",
    defaultNote: "",
  },
  {
    key: "decision",
    label: "Decision / last chance",
    day: 28,
    templateKey: "trial_decision",
    category: "convert",
    blurb: "Final decision nudge before the trial ends.",
    templateBefore: "Hey {name}, we haven't had you in for your trial review yet.",
    templateAfter: "Shall we get you set up before it ends so you don't lose your progress? I can book you in, is there a day/time that works for you?",
    defaultNote: "",
  },
];

// ── Trial types ──────────────────────────────────────────────────────────────
// Two trials, detected from the membership plan name (trial_product):
//   coached30  → "30 Day Trial", "Forever Strong 30 Day Trial"
//   kickstart21 → "21 days for £21" (often gym-only)
export type TrialType = "coached30" | "kickstart21";

export function trialType(product: string | null | undefined): TrialType {
  return /21/.test(String(product ?? "")) ? "kickstart21" : "coached30";
}

export function trialLengthDays(type: TrialType): number {
  return type === "kickstart21" ? 21 : 30;
}

/**
 * 21-day Kickstart schedule — tighter, gym-focused. PLACEHOLDER COPY: Carla to
 * finalise the wording (same before/[note]/after layout as the 30-day set).
 * Keys are k21_* so the log + GHL branches never clash with the 30-day keys.
 */
export const KICKSTART21_STEPS: NurtureStep[] = [
  {
    key: "k21_welcome",
    label: "Welcome",
    day: 1,
    templateKey: "trial_k21_welcome",
    category: "welcome",
    auto: true,
    blurb: "Auto-sent when the 21-day trial starts — how to scan in + where to start.",
    templateBefore: "Hi {name}, welcome to your 21-day Kickstart at Eat Train Live! So glad to have you.",
    templateAfter: "Pop in whenever suits — just scan in at the door. Check the education area in the app for how to get started, and give me a shout if you want pointing in the right direction.",
    defaultNote: "",
  },
  {
    key: "k21_post_first",
    label: "After 1st visit",
    day: 3,
    afterFirstSession: true,
    templateKey: "trial_k21_post_first",
    category: "checkin",
    blurb: "Check in after their first visit/session — how did it feel.",
    templateBefore: "Hey {name}, how did your first one go?",
    templateAfter: "Any aches or questions, just shout — totally normal to feel it at first. You've made the hardest step by getting in.",
    defaultNote: "",
  },
  {
    key: "k21_week1_momentum",
    label: "Momentum (active)",
    day: 7,
    templateKey: "trial_k21_momentum",
    category: "behaviour",
    branch: "attending",
    blurb: "They're getting in — reinforce the habit.",
    templateBefore: "Week one down, {name} — loving seeing you in!",
    templateAfter: "Keep that momentum going. Want me to suggest what to hit next?",
    defaultNote: "",
  },
  {
    key: "k21_week1_reengage",
    label: "Re-engage (quiet)",
    day: 7,
    templateKey: "trial_k21_reengage",
    category: "behaviour",
    branch: "not_attending",
    blurb: "Not been in — gentle nudge to get started.",
    templateBefore: "Hey {name}, not seen you in yet — everything ok?",
    templateAfter: "Let's get you in for your first one. What day works and I'll make sure someone's there to look after you?",
    defaultNote: "",
  },
  {
    key: "k21_mid",
    label: "Mid-trial check",
    day: 11,
    templateKey: "trial_k21_mid",
    category: "convert",
    blurb: "Over halfway — progress check + review offer.",
    templateBefore: "Over halfway through your Kickstart, {name} — how's it feeling?",
    templateAfter: "Fancy a quick review? I can pop you on the Evolt scanner and map out where to take it next.",
    defaultNote: "",
  },
  {
    key: "k21_review",
    label: "Book review",
    day: 16,
    templateKey: "trial_k21_review",
    category: "convert",
    blurb: "Push the results-review booking.",
    templateBefore: "You've put the work in, {name} — let's look at it properly.",
    templateAfter: "Grab a review slot here and we'll go through your results and options:\nhttps://api.leadconnectorhq.com/widget/bookings/trial-reviews",
    defaultNote: "",
  },
  {
    key: "k21_ending",
    label: "Ending soon",
    day: 19,
    templateKey: "trial_k21_ending_soon",
    category: "convert",
    blurb: "Heads-up the Kickstart is ending + options.",
    templateBefore: "Heyyyy {name}, your 21 days are nearly up!",
    templateAfter: "We'd love to keep you going — I can talk you through the membership options whenever suits.",
    defaultNote: "",
  },
  {
    key: "k21_decision",
    label: "Decision / last chance",
    day: 21,
    templateKey: "trial_k21_decision",
    category: "convert",
    blurb: "Final nudge before the Kickstart ends.",
    templateBefore: "Last day or two of your Kickstart, {name}.",
    templateAfter: "Shall we get you set up so you don't lose the momentum? Is there a day/time that works for a quick chat?",
    defaultNote: "",
  },
];

/** The step schedule for a trialist's type. */
export function stepsForType(type: TrialType): NurtureStep[] {
  return type === "kickstart21" ? KICKSTART21_STEPS : NURTURE_STEPS;
}

/** Days a step stays "due" after its day before it's flagged OVERDUE. */
const OVERDUE_GRACE = 2;
/** Hours after a booked session before the "how did it go?" step becomes due. */
const SESSION_FOLLOWUP_HOURS = 3;
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
  trialProduct: string | null; // e.g. "30 Day Trial" — the type of trial they're on
  trialType: TrialType; // "coached30" | "kickstart21" — derived from trialProduct
  trialLength: number; // 30 | 21
  converted: boolean; // true = they've signed up to a paid membership
  convertedProduct: string | null; // the paid plan they joined on, if converted
  trialDay: number; // 1-based day of the trial today
  attended: number; // attended sessions in the trial window
  attendedWeek1: number; // attended in first 7 days
  daysSinceVisit: number | null; // null = never attended (no booking OR scan)
  lastVisit: string | null; // last gym activity (booking or scan)
  lastWorkout: string | null; // last logged workout (display signal only)
  firstSessionAt: string | null; // their first booked session time (any), or null
  // Activity breakdown for the card: class bookings + kiosk scans count as
  // attendance; logged workouts are shown as a secondary signal.
  activity: { classes: number; scans: number; workouts: number };
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
function activeBranchValue(
  attendedWeek1: number,
  daysSinceVisit: number | null,
): "attending" | "not_attending" {
  const attending =
    attendedWeek1 >= 2 || (daysSinceVisit != null && daysSinceVisit <= 3);
  return attending ? "attending" : "not_attending";
}

// ── Board assembly ───────────────────────────────────────────────────────────

interface CohortRow {
  email: string;
  full_name: string | null;
  trial_start: string | null;
  trial_end: string | null;
  trial_product: string | null;
  converted: boolean | null;
  converted_product: string | null;
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
  scanAt: string[] = [],
  workoutAt: string[] = [],
): NurtureTrialist | null {
  if (!c.trial_start) return null; // clock not started — not in the drip yet
  const name = c.full_name || c.email;
  const trialDay = trialDayFor(c.trial_start);
  const startNum = dayNum(c.trial_start);

  const nowMs = Date.now();
  const pastDates = (arr: (string | null | undefined)[]) =>
    arr
      .filter(Boolean)
      .map((s) => new Date(s as string))
      .filter((d) => !isNaN(d.getTime()) && d.getTime() <= nowMs);

  // Attendance = being in the gym: a PAST, non-cancelled class booking OR a
  // kiosk scan (gym check-in). GymOS leaves attended sessions as "booked" (it
  // doesn't mark attendance), and gym-only Kickstart members may never book a
  // class — so scans matter. Both count.
  const bookingDates = pastDates(
    bookings.filter((b) => b.status !== "cancelled").map((b) => b.session_at),
  );
  const scanDates = pastDates(scanAt);
  const activityDates = [...bookingDates, ...scanDates].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  // Logged workouts — a secondary signal we SHOW but don't count as attendance.
  const workoutDates = pastDates(workoutAt).sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  // Their FIRST booked session (any time — past OR future), used to time the
  // "how did your first session go?" step off the actual session rather than a
  // fixed trial day. null if they haven't booked anything yet.
  const bookingMs = bookings
    .filter((b) => b.status !== "cancelled" && b.session_at)
    .map((b) => new Date(b.session_at as string).getTime())
    .filter((t) => !isNaN(t));
  const firstBookingMs = bookingMs.length ? Math.min(...bookingMs) : null;
  const firstSessionAt =
    firstBookingMs != null ? new Date(firstBookingMs).toISOString() : null;

  const attended = activityDates.length;
  const attendedWeek1 = activityDates.filter(
    (d) => dateDayNum(d) - startNum < 7,
  ).length;
  const last = activityDates.length
    ? activityDates[activityDates.length - 1]
    : null;
  const daysSinceVisit = last ? todayDayNum() - dateDayNum(last) : null;
  const lastWorkout = workoutDates.length
    ? workoutDates[workoutDates.length - 1].toISOString()
    : null;

  const sentMap = new Map<string, LogRow>();
  for (const l of logs) if (!sentMap.has(l.step_key)) sentMap.set(l.step_key, l);

  // Pick the schedule for this trialist's trial type (21-day Kickstart vs 30-day
  // coached), detected from their plan name.
  const tType = trialType(c.trial_product);
  const schedule = stepsForType(tType);

  const keepBranch = activeBranchValue(attendedWeek1, daysSinceVisit);
  // The behaviour branch slot is satisfied if EITHER variant was ever sent — a
  // trialist can flip attending↔quiet after one went out, and we must never
  // re-offer the slot's other variant as if nothing was sent.
  let branchSent: LogRow | null = null;
  for (const s of schedule) {
    if (s.branch) {
      const l = sentMap.get(s.key);
      if (l) {
        branchSent = l;
        break;
      }
    }
  }

  const steps: StepStatus[] = schedule
    // drop the branch step that doesn't apply to this trialist
    .filter((s) => !s.branch || s.branch === keepBranch)
    .map((step) => {
      const sent = step.branch ? sentMap.get(step.key) ?? branchSent : sentMap.get(step.key);
      if (sent) {
        return { step, state: "sent" as StepState, sentAt: sent.sent_at, sentBy: sent.sent_by };
      }
      // "After first session": time it off their first booked session (+buffer),
      // not a fixed day — but only if they've actually booked one. No booking →
      // fall through to the day-based default below.
      if (step.afterFirstSession && firstBookingMs != null) {
        const dueAtMs = firstBookingMs + SESSION_FOLLOWUP_HOURS * 3600000;
        if (nowMs >= dueAtMs + OVERDUE_GRACE * MS_DAY)
          return { step, state: "overdue" as StepState };
        if (nowMs >= dueAtMs) return { step, state: "due" as StepState };
        return { step, state: "upcoming" as StepState };
      }
      if (trialDay >= step.day + OVERDUE_GRACE) return { step, state: "overdue" as StepState };
      if (trialDay >= step.day) return { step, state: "due" as StepState };
      return { step, state: "upcoming" as StepState };
    });

  const converted = !!c.converted;
  // The one to action now: earliest un-sent step that is overdue or due (coach
  // never sends the auto welcome). Overdue outranks due via step order (ascending
  // day). A trialist who's already SIGNED UP gets no outreach — they move to the
  // "Joined" list instead of being nurtured.
  const actionable = converted
    ? []
    : steps.filter(
        (s) => !s.step.auto && (s.state === "overdue" || s.state === "due"),
      );
  const nextStep = actionable.length ? actionable[0] : null;

  return {
    email: c.email,
    name,
    trialStart: c.trial_start,
    trialEnd: c.trial_end,
    trialProduct: c.trial_product ?? null,
    trialType: tType,
    trialLength: trialLengthDays(tType),
    converted,
    convertedProduct: c.converted_product ?? null,
    trialDay,
    attended,
    attendedWeek1,
    daysSinceVisit,
    lastVisit: last ? last.toISOString() : null,
    lastWorkout,
    firstSessionAt,
    activity: {
      classes: bookingDates.length,
      scans: scanDates.length,
      workouts: workoutDates.length,
    },
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
  joined: NurtureTrialist[]; // signed up to a paid membership — the wins
}

/**
 * Load everything the cockpit needs and assemble the board.
 * Active trialists = a cohort row, trial_start set, not converted, trial not long past.
 */
export async function getNurtureBoard(): Promise<NurtureBoard> {
  try {
    const { data: cohort } = await supabase
      .from("trial_cohort")
      .select(
        "email, full_name, trial_start, trial_end, trial_product, converted, converted_product",
      )
      .not("trial_start", "is", null);

    const rows = (cohort as CohortRow[]) ?? [];
    if (!rows.length) return { dueNow: [], upcoming: [], joined: [] };

    const emails = rows.map((r) => r.email);

    const [{ data: bookings }, { data: logs }, { data: gmRows }] =
      await Promise.all([
        supabase
          .from("member_bookings")
          .select("email, session_at, status")
          .in("email", emails),
        supabase
          .from("trial_nurture_log")
          .select("email, step_key, sent_at, sent_by")
          .in("email", emails),
        // gym_members gives us each trialist's member_ref so we can pull their
        // kiosk scans (scan_events links by member_ref, not email).
        supabase.from("gym_members").select("id, email").in("email", emails),
      ]);

    const refToEmail = new Map<string, string>();
    const refs: string[] = [];
    for (const m of (gmRows as any[]) ?? []) {
      if (m?.id && m?.email) {
        refToEmail.set(String(m.id), String(m.email).toLowerCase());
        refs.push(String(m.id));
      }
    }

    // Kiosk scans (staff-readable) + logged workouts (RLS-locked → RPC).
    const [{ data: scans }, workoutRes] = await Promise.all([
      refs.length
        ? supabase
            .from("scan_events")
            .select("member_ref, ts")
            .in("member_ref", refs)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .rpc("trial_workout_activity", { p_emails: emails })
        .then((r) => r)
        .catch(() => ({ data: [] as any[] })),
    ]);

    const scansBy = new Map<string, string[]>();
    for (const s of (scans as any[]) ?? []) {
      const em = refToEmail.get(String(s?.member_ref));
      if (!em || !s?.ts) continue;
      (scansBy.get(em) ?? scansBy.set(em, []).get(em)!).push(s.ts);
    }
    const workoutsBy = new Map<string, string[]>();
    for (const w of ((workoutRes as any)?.data as any[]) ?? []) {
      if (!w?.email || !w?.at) continue;
      const em = String(w.email).toLowerCase();
      (workoutsBy.get(em) ?? workoutsBy.set(em, []).get(em)!).push(w.at);
    }

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
      .map((c) => {
        const k = String(c.email).toLowerCase();
        return enrich(
          c,
          bookingsBy.get(k) ?? [],
          logsBy.get(k) ?? [],
          scansBy.get(k) ?? [],
          workoutsBy.get(k) ?? [],
        );
      })
      .filter((t): t is NurtureTrialist => t != null)
      // drop trialists whose window is well past (no more drip to work)
      .filter((t) => t.trialDay <= 35);

    // Signed-up trialists — the wins. Shown separately, no outreach.
    const joined = enriched
      .filter((t) => t.converted)
      .sort((a, b) => b.trialDay - a.trialDay);
    const active = enriched.filter((t) => !t.converted);

    const dueNow = active
      .filter((t) => t.nextStep != null)
      .sort((a, b) => {
        // overdue before due, then hot leads, then by trial day (older first)
        const ov = (t: NurtureTrialist) => (t.nextStep?.state === "overdue" ? 0 : 1);
        if (ov(a) !== ov(b)) return ov(a) - ov(b);
        if (a.flags.hotLead !== b.flags.hotLead) return a.flags.hotLead ? -1 : 1;
        return b.trialDay - a.trialDay;
      });
    const upcoming = active
      .filter((t) => t.nextStep == null)
      .sort((a, b) => b.trialDay - a.trialDay);

    return { dueNow, upcoming, joined };
  } catch (e) {
    console.warn("getNurtureBoard failed", e);
    return { dueNow: [], upcoming: [], joined: [] };
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
