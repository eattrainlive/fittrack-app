/**
 * Structured exercise tags — shared options + keyword auto-classifier.
 *
 * Used by the Manage Exercises editor (Admin.tsx) and the smart-alternates
 * ranking (smartAlternates.ts). Keeping the option lists + classifier in one
 * place means the editor and the ranking agree on the vocabulary.
 */

export const MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "lunge_split",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "carry",
  "core",
  "isolation_arm",
  "isolation_shoulder",
  "isolation_leg",
  "olympic_power",
  "plyometric",
  "conditioning",
  "mobility",
] as const;

export const EXERCISE_ROLES = [
  "main",
  "accessory",
  "activation",
  "warmup",
  "conditioning",
  "core",
] as const;

export const CONTRAINDICATIONS = [
  "shoulder",
  "lower_back",
  "knee",
  "ankle",
  "wrist",
  "elbow",
] as const;

export interface ExerciseTags {
  movement_pattern?: string | null;
  movement_family?: string | null;
  role?: string | null;
  unilateral?: boolean | null;
  is_compound?: boolean | null;
  primary_muscles?: string[] | null;
  contraindications?: string[] | null;
}

/**
 * Keyword-based guess from an exercise name. Returns an editable suggestion
 * the coach confirms — never leaves a new exercise untagged.
 */
export const guessTagsFromName = (name: string): ExerciseTags => {
  const n = String(name || "").toLowerCase();
  const has = (re: RegExp) => re.test(n);

  let movement_pattern = "core";
  if (has(/squat/)) movement_pattern = "squat";
  else if (has(/rdl|romanian|deadlift|good.?morning|hip ?thrust|glute ?bridge/))
    movement_pattern = "hinge";
  else if (has(/lunge|split|step.?up|step.?down/))
    movement_pattern = "lunge_split";
  else if (has(/bench|press|push.?up|dip/))
    movement_pattern = "horizontal_push";
  else if (
    has(/overhead.?press|shoulder.?press|military.?press|push.?press|jerk/)
  )
    movement_pattern = "vertical_push";
  else if (has(/row|seal|face.?pull|band.?pull/))
    movement_pattern = "horizontal_pull";
  else if (has(/pull.?up|chin.?up|lat.?pull/))
    movement_pattern = "vertical_pull";
  else if (has(/carry|farmer|suitcase|rack.?carry/)) movement_pattern = "carry";
  else if (has(/curl|extension|kickback|tricep|bicep/))
    movement_pattern = "isolation_arm";
  else if (has(/lateral.?raise|front.?raise|rear.?delt|fly/))
    movement_pattern = "isolation_shoulder";
  else if (has(/leg.?curl|leg.?extension|calf/))
    movement_pattern = "isolation_leg";
  else if (has(/clean|snatch/)) movement_pattern = "olympic_power";
  else if (has(/jump|box.?jump|bound|plyo/)) movement_pattern = "plyometric";
  else if (has(/row.*machine|erg|bike|run|sprint|burpee|kettlebell.?swing/))
    movement_pattern = "conditioning";
  else if (has(/stretch|mobil|roll|foam|cat.?cow|world.?greatest/))
    movement_pattern = "mobility";
  else if (has(/plank|hollow|dead.?bug|bird.?dog|crunch|sit.?up|leg.?raise/))
    movement_pattern = "core";

  let role = "main";
  if (movement_pattern === "mobility") role = "warmup";
  else if (has(/activation|fire.?up|banded|glute.?bridge|clam/))
    role = "activation";
  else if (movement_pattern?.startsWith("isolation")) role = "accessory";
  else if (movement_pattern === "conditioning") role = "conditioning";
  else if (movement_pattern === "core") role = "core";

  const unilateral = has(
    /single.?leg|split|lunge|step.?up|one.?arm|one.?leg|unilateral/,
  )
    ? true
    : null;

  const is_compound =
    movement_pattern === "squat" ||
    movement_pattern === "hinge" ||
    movement_pattern === "lunge_split" ||
    movement_pattern === "horizontal_push" ||
    movement_pattern === "vertical_push" ||
    movement_pattern === "horizontal_pull" ||
    movement_pattern === "vertical_pull" ||
    movement_pattern === "olympic_power"
      ? true
      : null;

  return { movement_pattern, role, unilateral, is_compound };
};
