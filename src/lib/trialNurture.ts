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
  // Only surfaces for a trialist who has logged ZERO app workouts (dropped from
  // their step list once they've logged one). Used by the "try a workout" nudge.
  requiresNoAppWorkout?: boolean;
  // No coach-note slot ({{2}}) — one flowing message. The app hides the note box
  // and sends an empty note, and the GHL template must have NO {{2}} variable (an
  // empty {{2}} makes WhatsApp reject the send).
  noNote?: boolean;
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
    noNote: true,
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
    noNote: true,
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
    noNote: true,
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
    noNote: true,
    category: "welcome",
    auto: true,
    blurb: "Auto-sent when the 21-day trial starts — how to scan in + where to start.",
    templateBefore: "Hi {name}, welcome to your 21-day Kickstart at Eat Train Live! So glad to have you.",
    templateAfter: "Pop in whenever suits — just scan in at the door. Check the education area in the app for how to get started, and give me a shout if you want pointing in the right direction.\nCarla\nETL",
    defaultNote: "",
  },
  {
    key: "k21_post_first",
    label: "After 1st visit",
    day: 3,
    afterFirstSession: true,
    templateKey: "trial_k21_post_first",
    noNote: true,
    category: "checkin",
    blurb: "Check in after their first visit/session — how did it feel.",
    templateBefore: "Hey {name}, how did your first one go?",
    templateAfter: "Any aches or questions, just shout — totally normal to feel it at first. You've made the hardest step by getting in.",
    defaultNote: "",
  },
  {
    key: "k21_try_class",
    label: "Try a class",
    day: 5,
    templateKey: "trial_k21_try_class",
    category: "behaviour",
    blurb: "Nudge a gym-only Kickstarter to try one of the classes.",
    templateBefore:
      "Hey {name}, are there any classes you fancy trying while you're with us?",
    templateAfter:
      "They're a great way to mix it up and meet people — I can get you booked onto one, just let me know what takes your fancy and when suits.",
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
    templateBefore: "Week one down, {name} — loving seeing you getting stuck in!",
    templateAfter: "Is there anything in particular you need any help with?",
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
    templateBefore: "Hey {name}, not seen you in much — everything ok?",
    templateAfter: "What day works and I'll make sure someone's there to help you out?",
    defaultNote: "",
  },
  {
    key: "k21_app_workout",
    label: "Try an app workout",
    day: 8,
    requiresNoAppWorkout: true,
    templateKey: "trial_k21_app_workout",
    noNote: true,
    category: "behaviour",
    blurb:
      "Flags ~a week in if they've logged no app workouts — nudge them to try one.",
    templateBefore:
      "Hey {name}, noticed you've not tried any of our workouts in the app yet.",
    templateAfter:
      "There's loads in there you can follow along with in the gym, they are a great way to know exactly what to do. Want me to point you to a good one to start with?",
    defaultNote: "",
  },
  {
    key: "k21_pt_taster",
    label: "PT taster credit",
    day: 9,
    templateKey: "trial_k21_pt_taster",
    noNote: true,
    category: "convert",
    blurb: "Offer to add a group PT taster credit so they can try a group PT session.",
    templateBefore:
      "Hey {name}, fancy trying a group PT session while you're with us?",
    templateAfter:
      "I can pop a group PT taster credit on your account so you can give it a go with the team... no cost, just a chance to see what it's like. Want me to set it up?",
    defaultNote: "",
  },
  {
    key: "k21_mid",
    label: "Mid-trial check",
    day: 11,
    templateKey: "trial_k21_mid",
    category: "convert",
    blurb: "Over halfway — progress check + review offer.",
    templateBefore: "Over halfway through your Kickstart, {name}",
    templateAfter: "Just shout up if I can help at all",
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
    noNote: true,
    category: "convert",
    blurb: "Final nudge before the Kickstart ends — no membership set up yet.",
    templateBefore:
      "We haven't got your membership set up yet {name}. Shall we get you set up so you don't lose the momentum? Is there a day/time that works for a quick chat? Or you can book a slot here\nhttps://api.leadconnectorhq.com/widget/bookings/trial-reviews",
    templateAfter: "",
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
    noSessionBooked: boolean; // no booking at all + not been in → nudge to book
    firstSessionDone: boolean; // first booked session has passed → check in
    goneQuiet: boolean; // was active, now quiet (type-specific threshold)
    frequencyDrop: boolean; // < 2 visits in last 7 days (after week 1)
    reviewNotBooked: boolean; // near end + no review booked → push review booking
    noAppWorkout: boolean; // ~a week in + no app workout logged → nudge to try one
    hasMembership: boolean; // active membership on file (Kickstart: keep nurturing)
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
  session_type?: string | null;
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
  hasReview = false, // a live review_bookings row (booked/completed, future)
  membershipProduct: string | null = null, // active NON-trial membership, if any
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
    // drop the "try an app workout" nudge once they've logged one
    .filter((s) => !s.requiresNoAppWorkout || workoutDates.length === 0)
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

  // Many trial members set up a membership during their trial. GymOS doesn't
  // always fire a clean "join" event we can convert on, so an active NON-trial
  // membership on gym_members is our backstop.
  //   • Coached-30: an active membership = joined → out of nurture.
  //   • Kickstart-21: they can still cancel within the 21 days, so we KEEP
  //     nurturing them to protect the conversion — we only suppress the "review
  //     needed" nudge (they don't need one). It's not a conversion yet.
  const hasMembership = !!membershipProduct;
  const converted = !!c.converted || (hasMembership && tType === "coached30");

  // ── Situational signals (the new Carla nudges) ──────────────────────────────
  const trialLen = trialLengthDays(tType);
  // Review bookings come from the synced review_bookings table (GHL calendar),
  // not member_bookings — same source the trialist pipeline uses.
  const hasReviewBooked = hasReview;
  const last7Count = activityDates.filter(
    (d) => nowMs - d.getTime() <= 7 * MS_DAY,
  ).length;
  // Kickstart is shorter, so "quiet" bites sooner.
  const quietThreshold = tType === "kickstart21" ? 3 : 4;
  const firstSessionDue =
    firstBookingMs != null &&
    nowMs >= firstBookingMs + SESSION_FOLLOWUP_HOURS * 3600000;

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
    convertedProduct: c.converted_product ?? membershipProduct ?? null,
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
      // No booking on file at all and not been in — nudge them to book their first.
      noSessionBooked: firstBookingMs == null && attended === 0 && trialDay >= 2,
      // Their first booked session time has passed — time to check in.
      firstSessionDone: !converted && firstSessionDue,
      // Was active but has gone quiet (sooner for the shorter Kickstart).
      goneQuiet:
        !converted &&
        attended > 0 &&
        daysSinceVisit != null &&
        daysSinceVisit >= quietThreshold,
      // Dropped below 2 visits in the last 7 days (only meaningful after week 1).
      frequencyDrop: !converted && attended > 0 && trialDay >= 7 && last7Count < 2,
      // Near trial end with no review booked — push the review booking.
      // Near the end with no review booked — but NOT if they've already set up a
      // membership (they don't need a review either way).
      reviewNotBooked:
        !converted &&
        !hasMembership &&
        trialDay >= trialLen - 7 &&
        !hasReviewBooked,
      // Around a week in and still no app workout logged — prompt them to try one.
      noAppWorkout: !converted && trialDay >= 7 && workoutDates.length === 0,
      hasMembership,
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
          .select("email, session_at, status, session_type")
          .in("email", emails),
        supabase
          .from("trial_nurture_log")
          .select("email, step_key, sent_at, sent_by")
          .in("email", emails),
        // gym_members gives us each trialist's member_ref (for kiosk scans,
        // which link by member_ref not email) AND their current product/status,
        // so we can spot anyone already on an active paid membership.
        supabase
          .from("gym_members")
          .select("id, email, product, status")
          .in("email", emails),
      ]);

    // An active NON-trial membership on gym_members = they've signed up (often
    // in their induction). Same /21/ + 30-day test as trialType, so the trial
    // plans themselves never count as "a membership".
    const isTrialPlan = (p: string) =>
      /21/.test(p) ||
      /30\s*day/.test(p) ||
      /forever\s*strong/.test(p) ||
      /\btrial\b/.test(p);
    const membershipByEmail = new Map<string, string>();
    for (const m of (gmRows as any[]) ?? []) {
      const em = String(m?.email ?? "").toLowerCase();
      const prod = String(m?.product ?? "").trim();
      const st = String(m?.status ?? "").toLowerCase().trim();
      if (!em || !prod) continue;
      if (st === "active" && !isTrialPlan(prod.toLowerCase())) {
        membershipByEmail.set(em, prod);
      }
    }

    // Live review bookings (GHL-calendar sync) — same source the pipeline uses.
    const { data: reviewRows } = await supabase
      .from("review_bookings")
      .select("email, status, appointment_at")
      .in("email", emails);
    const nowReview = Date.now();
    const reviewSet = new Set<string>();
    for (const r of (reviewRows as any[]) ?? []) {
      const st = String(r?.status ?? "").toLowerCase().trim();
      const live =
        (st === "booked" || st === "completed") &&
        (!r?.appointment_at ||
          new Date(r.appointment_at).getTime() >= nowReview);
      if (live && r?.email) reviewSet.add(String(r.email).toLowerCase());
    }

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

    // Manual outcomes (mark won/lost): 'lost' drops them from the board, a
    // manual 'won' moves them to the Joined list even without a converted flag.
    const { data: outcomeRows } = await supabase
      .from("trial_outcomes")
      .select("email, outcome");
    const outcomeBy = new Map<string, string>();
    for (const o of (outcomeRows as any[]) ?? [])
      if (o?.email) outcomeBy.set(String(o.email).toLowerCase(), String(o.outcome));

    const enriched = rows
      .map((c) => {
        const k = String(c.email).toLowerCase();
        return enrich(
          c,
          bookingsBy.get(k) ?? [],
          logsBy.get(k) ?? [],
          scansBy.get(k) ?? [],
          workoutsBy.get(k) ?? [],
          reviewSet.has(k),
          membershipByEmail.get(k) ?? null,
        );
      })
      .filter((t): t is NurtureTrialist => t != null)
      // drop trialists whose window is well past (no more drip to work)
      .filter((t) => t.trialDay <= 35)
      // drop anyone the coach marked 'lost' — no more outreach.
      .filter((t) => outcomeBy.get(String(t.email).toLowerCase()) !== "lost");

    const isWon = (t: NurtureTrialist) =>
      t.converted ||
      outcomeBy.get(String(t.email).toLowerCase()) === "won";

    // Signed-up / won trialists — shown separately, no outreach.
    const joined = enriched
      .filter((t) => isWon(t))
      .sort((a, b) => b.trialDay - a.trialDay);
    const active = enriched.filter((t) => !isWon(t));

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
        // Rendered message text so the proxy can mirror it into the in-app thread.
        message_body: renderFullMessage(step, trialist.name, note),
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

// ── Conversion dashboard stats ───────────────────────────────────────────────
export interface TrialTypeStat {
  rate: number; // 0..1
  converted: number;
  completed: number;
}
export interface TrialStats {
  periodDays: number;
  activeNow: number;
  activeByType: Record<TrialType, number>;
  overall: TrialTypeStat;
  byType: Record<TrialType, TrialTypeStat>;
  prevRate: number; // conversion rate for the previous equal window (for a delta)
  funnel: {
    started: number;
    attended1st: number;
    attended3plus: number;
    reviewBooked: number;
    converted: number;
  };
  avgDaysToFirstSession: number | null;
}

/**
 * Conversion stats for trials that DECIDED (ended or converted) in the last
 * `periodDays`. Self-contained: reads trial_cohort + member_bookings + scans.
 * Attendance = past bookings + kiosk scans (same signal the board uses).
 */
export async function getTrialStats(periodDays = 30): Promise<TrialStats> {
  const emptyType = (): TrialTypeStat => ({ rate: 0, converted: 0, completed: 0 });
  const empty: TrialStats = {
    periodDays,
    activeNow: 0,
    activeByType: { coached30: 0, kickstart21: 0 },
    overall: emptyType(),
    byType: { coached30: emptyType(), kickstart21: emptyType() },
    prevRate: 0,
    funnel: {
      started: 0,
      attended1st: 0,
      attended3plus: 0,
      reviewBooked: 0,
      converted: 0,
    },
    avgDaysToFirstSession: null,
  };
  try {
    const { data: cohort } = await supabase
      .from("trial_cohort")
      .select("email, trial_start, trial_product, converted")
      .not("trial_start", "is", null);
    const rows = (cohort as any[]) ?? [];
    if (!rows.length) return empty;
    const emails = rows.map((r) => r.email);

    const [{ data: bookings }, { data: gmRows }] = await Promise.all([
      supabase
        .from("member_bookings")
        .select("email, session_at, status, session_type")
        .in("email", emails),
      supabase.from("gym_members").select("id, email").in("email", emails),
    ]);
    const refToEmail = new Map<string, string>();
    const refs: string[] = [];
    for (const m of (gmRows as any[]) ?? [])
      if (m?.id && m?.email) {
        refToEmail.set(String(m.id), String(m.email).toLowerCase());
        refs.push(String(m.id));
      }
    const { data: scans } = refs.length
      ? await supabase.from("scan_events").select("member_ref, ts").in("member_ref", refs)
      : { data: [] as any[] };

    const now = Date.now();
    const actBy = new Map<string, number[]>(); // email → activity day-numbers
    const reviewBy = new Set<string>();
    const pushAct = (em: string, ms: number) => {
      if (isNaN(ms) || ms > now) return;
      const d = Math.floor(ms / MS_DAY);
      (actBy.get(em) ?? actBy.set(em, []).get(em)!).push(d);
    };
    for (const b of (bookings as any[]) ?? []) {
      const em = String(b.email).toLowerCase();
      if (/review/i.test(String(b.session_type ?? ""))) reviewBy.add(em);
      if (b.status !== "cancelled" && b.session_at)
        pushAct(em, new Date(b.session_at).getTime());
    }
    for (const s of (scans as any[]) ?? []) {
      const em = refToEmail.get(String(s?.member_ref));
      if (em && s?.ts) pushAct(em, new Date(s.ts).getTime());
    }

    const today = todayDayNum();
    let f = { started: 0, attended1st: 0, attended3plus: 0, reviewBooked: 0, converted: 0 };
    let ttfsSum = 0;
    let ttfsN = 0;
    let prevConv = 0;
    let prevDone = 0;

    for (const r of rows) {
      const em = String(r.email).toLowerCase();
      const tType = trialType(r.trial_product);
      const startNum = dayNum(r.trial_start);
      const len = trialLengthDays(tType);
      const endNum = startNum + len - 1;
      const converted = !!r.converted;
      const acts = (actBy.get(em) ?? []).slice().sort((a, b) => a - b);

      // active now
      if (!converted && today >= startNum && today <= endNum) {
        empty.activeNow++;
        empty.activeByType[tType]++;
      }

      // decision day: converted → now-ish; else trial end.
      const completed = converted || today >= endNum;
      if (!completed) continue;
      const decisionDay = converted ? Math.min(endNum, today) : endNum;
      const ago = today - decisionDay;

      if (ago >= periodDays && ago < periodDays * 2) {
        prevDone++;
        if (converted) prevConv++;
        continue;
      }
      if (ago < 0 || ago >= periodDays) continue;

      // in current period
      empty.byType[tType].completed++;
      empty.overall.completed++;
      if (converted) {
        empty.byType[tType].converted++;
        empty.overall.converted++;
      }

      // funnel
      f.started++;
      const attended = acts.length;
      const attendedWk1 = acts.filter((d) => d - startNum < 7).length;
      if (attended >= 1) f.attended1st++;
      if (attendedWk1 >= 3) f.attended3plus++;
      if (reviewBy.has(em)) f.reviewBooked++;
      if (converted) f.converted++;
      if (attended >= 1) {
        ttfsSum += acts[0] - startNum + 1;
        ttfsN++;
      }
    }

    const rate = (s: TrialTypeStat) =>
      s.completed ? s.converted / s.completed : 0;
    empty.overall.rate = rate(empty.overall);
    empty.byType.coached30.rate = rate(empty.byType.coached30);
    empty.byType.kickstart21.rate = rate(empty.byType.kickstart21);
    empty.prevRate = prevDone ? prevConv / prevDone : 0;
    empty.funnel = f;
    empty.avgDaysToFirstSession = ttfsN ? Math.round((ttfsSum / ttfsN) * 10) / 10 : null;
    return empty;
  } catch (e) {
    console.warn("[trialNurture] getTrialStats:", e);
    return empty;
  }
}
