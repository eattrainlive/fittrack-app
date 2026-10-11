/**
 * Centralised question labels for the accountability onboarding + check-in forms.
 *
 * These are the single source of truth for the coach "view full answers" views.
 * The labels are copied verbatim from the QLabel text in the form components
 * (OnboardingSections.tsx, WeeklyCheckin.tsx, FinalCheckin.tsx), keyed by the
 * exact response keys actually saved to the database.
 */

export interface QuestionDef {
  key: string;
  label: string;
}

/** Onboarding questions — keys match what's stored in `acc_clients.onboarding`. */
export const ONBOARDING_QUESTIONS: QuestionDef[] = [
  { key: "q1", label: "What made you join right now?" },
  {
    key: "q2",
    label: "Beyond losing weight, WHY — what would change day-to-day?",
  },
  {
    key: "q3",
    label:
      "How would hitting this affect work / family / confidence / social / health?",
  },
  {
    key: "q4",
    label: "Picture yourself at the end — what can you do / feel / wear?",
  },
  { key: "q5", label: "How ready & motivated are you?" },
  { key: "q6", label: "Main goal for the six weeks" },
  {
    key: "q7",
    label:
      "If the scale barely moved but you felt fitter / ate better — success?",
  },
  { key: "q8", label: "Non-scale wins that matter most" },
  { key: "q9", label: "A specific date / event you're working towards?" },
  { key: "q10", label: "Current weight (kg)" },
  { key: "q11", label: "Height" },
  { key: "q12", label: "Chest (cm)" },
  { key: "q13", label: "Waist (cm)" },
  { key: "q14", label: "Body fat % (Evolt)" },
  { key: "q15", label: "Thigh (cm)" },
  { key: "q16", label: "Tummy (cm)" },
  { key: "q17", label: "How would you prefer to track progress?" },
  {
    key: "q18",
    label: "Baseline photos (front + side, same spot / lighting)",
  },
  { key: "q19", label: "Energy on a normal day" },
  { key: "q20", label: "Typical day of eating (what & when)" },
  { key: "q21", label: "How many meals + snacks a day?" },
  {
    key: "q22",
    label: "How often a good protein source at each meal?",
  },
  { key: "q23", label: "Water on a typical day?" },
  { key: "q24", label: "When & why do you snack?" },
  { key: "q25", label: "Biggest cravings / hardest to resist?" },
  { key: "q26", label: "Alcoholic drinks in a typical week?" },
  {
    key: "q27",
    label: "Foods you love & want to keep / can't stand?",
  },
  { key: "q28", label: "Steps on a normal day (guess is fine)" },
  { key: "q29", label: "Job mostly: sitting / on your feet / active?" },
  {
    key: "q30",
    label: "Currently exercise / train? What & days/week?",
  },
  { key: "q31", label: "Sleep hours & quality?" },
  { key: "q32", label: "Stress level right now" },
  { key: "q33", label: "What does a typical week look like?" },
  {
    key: "q34",
    label: "What have you tried before? What worked / didn't?",
  },
  {
    key: "q35",
    label: "When you've fallen off track, what caused it?",
  },
  { key: "q36", label: "What do you STOP doing when slipping?" },
  {
    key: "q37",
    label: "When you're doing well, what's usually in place?",
  },
  {
    key: "q38",
    label: "Confidence to stick to daily habits for 6 weeks",
  },
  {
    key: "q39",
    label: "Plate method (no tracking) vs precise tracking?",
  },
  { key: "q40", label: "What accountability helps most?" },
  { key: "q41", label: "Weekly check-in preference" },
  {
    key: "trackingAppLabel",
    label: "If you track your food, which app do you use?",
  },
  { key: "tracking_app", label: "Tracking app (key)" },
  { key: "mfp_username", label: "MyFitnessPal username" },
  { key: "tracking_app_other", label: "Which app? (Other)" },
  { key: "q42", label: "Anything else you want me to know?" },
];

/** Weekly check-in questions (weeks 1–5) — keys match `acc_checkins.responses`. */
export const CHECKIN_QUESTIONS: QuestionDef[] = [
  { key: "q1", label: "Overall, how did this week go?" },
  {
    key: "q2",
    label: "How consistently did you hit your habits this week?",
  },
  { key: "q3", label: "Your win of the week (scale or non-scale)" },
  { key: "q4", label: "Energy levels this week" },
  { key: "q5", label: "Sleep quality this week" },
  { key: "q6", label: "General mood around food & training" },
  { key: "q7", label: "What got in the way this week, if anything?" },
  {
    key: "q8",
    label: "What might trip you up / SOS slip triggers — and what will you do?",
  },
  { key: "q9", label: "One thing you'll focus on next week" },
  { key: "q10", label: "How are you feeling about progress?" },
  { key: "avgSteps", label: "Your average daily steps this week" },
  { key: "weekQ", label: "This week's extra question" },
  { key: "weekA", label: "Answer to this week's extra question" },
  { key: "sos_on", label: "SOS plan — When I'm on it, I…" },
  { key: "sos_sign", label: "SOS plan — The first sign I'm slipping is…" },
  {
    key: "sos_action",
    label: "SOS plan — When I spot it, the first thing I'll do is…",
  },
  { key: "step_target", label: "Your daily step target from now on" },
  { key: "trackDays", label: "Days logged this week (tracking)" },
  { key: "trackCalories", label: "Average daily calories (tracking)" },
  { key: "trackProtein", label: "Average daily protein (g) (tracking)" },
  { key: "trackShot", label: "Tracking app weekly screenshot" },
];

/** Final check-in (week 6) questions — keys match `acc_checkins.responses`. */
export const FINAL_CHECKIN_QUESTIONS: QuestionDef[] = [
  { key: "q1", label: "Day-1 photo vs today — what do you see?" },
  { key: "q2", label: "Energy now" },
  { key: "q3", label: "Sleep quality now" },
  { key: "q4", label: "Confidence in yourself now" },
  { key: "q5", label: "Cravings & snacking vs 6 weeks ago" },
  { key: "q6", label: "How do clothes fit vs Day 1?" },
  {
    key: "q7",
    label: "What can you do / feel / wear now that you couldn't?",
  },
  { key: "q8", label: "What surprised you most?" },
  { key: "q9", label: "Biggest change to your day-to-day?" },
  {
    key: "q10",
    label: "If a friend was on the fence, what would you say?",
  },
  {
    key: "q11",
    label: "Keen to record a 30–60s voice note / video? (optional)",
  },
  { key: "q12", label: "Which habit changed the most?" },
  { key: "q13", label: "One habit you're keeping for good?" },
  {
    key: "q14",
    label: "Confidence to keep these going on your own",
  },
  {
    key: "q15",
    label: "Overall, how would you rate the programme?",
  },
  { key: "q16", label: "What did you love most?" },
  { key: "q17", label: "What could we improve / add?" },
  {
    key: "q18",
    label: "Anything you wanted more support / info on?",
  },
  {
    key: "q19",
    label: "How likely are you to recommend to a friend?",
  },
  {
    key: "q20",
    label: "Can we share your before/after photos in marketing?",
  },
  {
    key: "q21",
    label:
      "Can we use your written feedback as a testimonial (first name only)?",
  },
  {
    key: "q22",
    label: "Would you like to carry on / keep momentum?",
  },
  { key: "q23", label: "Anyone you'd recommend for the next round?" },
  { key: "q24", label: "Anything else you want to say?" },
  { key: "m_weight", label: "After weight (kg)" },
  { key: "m_chest", label: "After chest (cm)" },
  { key: "m_waist", label: "After waist (cm)" },
  { key: "m_bodyFat", label: "After body fat %" },
  { key: "m_thigh", label: "After thigh (cm)" },
  { key: "m_tummy", label: "After tummy (cm)" },
  {
    key: "maintenance_tier",
    label: "Sliding Scale of Motivation — where are you landing?",
  },
  { key: "afterFront", label: "After photo — front" },
  { key: "afterSide", label: "After photo — side" },
  { key: "afterBack", label: "After photo — back" },
  { key: "trackDays", label: "Days logged this week (tracking)" },
  { key: "trackCalories", label: "Average daily calories (tracking)" },
  { key: "trackProtein", label: "Average daily protein (g) (tracking)" },
  { key: "trackShot", label: "Tracking app weekly screenshot" },
];

/** Render a value for display — arrays comma-joined, photos as a label. */
export const fmtAnswer = (val: any): string => {
  if (val == null) return "";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") {
    // photos object — show which poses are present
    if (val.front || val.side || val.back) {
      return (
        [val.front && "front", val.side && "side", val.back && "back"]
          .filter(Boolean)
          .join(", ") + " photo(s)"
      );
    }
    return JSON.stringify(val);
  }
  return String(val);
};

/** Human-readable fallback label for keys not in the question maps. */
export const fallbackLabel = (key: string): string => {
  // Turn camelCase / snake_case into readable words
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
