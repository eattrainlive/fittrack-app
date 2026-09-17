/**
 * Programme round-linking: the linkRounds propagation that Admin's
 * `updateProgExercise` / `updateProgExerciseFields` call after an edit.
 * Centralised here so Admin.tsx stays focused — it delegates the
 * Group-PT round-sibling propagation to this module.
 */
import {
  propagateAcrossRounds,
  propagateSectionFlagAcrossRounds,
  otherRoundWeeks,
} from "./groupPtRounds";

export type RoundLinkResult = {
  workouts: any[];
  propagated: boolean;
  siblings: number[];
};

/**
 * Apply round-link propagation after a single-field exercise edit.
 *
 * - Identity fields (name/trackingType/eachSide/blockType) ripple to the
 *   same exercise index in each sibling round-week, preserving loading.
 * - The `pickOne` section flag ripples to the same section index in each
 *   sibling round-week (section match by index — the rounds are structural
 *   copies), preserving each round's own exercises.
 * - Non-Group-PT or linkRounds off: no propagation.
 */
export const linkRoundField = (
  workouts: any[],
  session: any,
  exIndex: number,
  field: string,
  val: any,
  isGroupPT: boolean,
  linkRounds: boolean,
): RoundLinkResult => {
  if (
    !linkRounds ||
    !isGroupPT ||
    exIndex === -1 ||
    !session?.exercises?.[exIndex]
  ) {
    return { workouts, propagated: false, siblings: [] };
  }

  // Section-flag propagation (pickOne on a finisher section header).
  if (field === "pickOne" && session.exercises[exIndex].isSection) {
    const final = propagateSectionFlagAcrossRounds(
      workouts,
      Number(session.week),
      Number(session.day),
      exIndex,
      "pickOne",
      val,
    );
    const sibs = otherRoundWeeks(Number(session.week));
    return { workouts: final, propagated: sibs.length > 0, siblings: sibs };
  }

  // Identity-field propagation.
  if (["name", "trackingType", "eachSide", "blockType"].includes(field)) {
    const final = propagateAcrossRounds(
      workouts,
      Number(session.week),
      Number(session.day),
      exIndex,
      { [field]: val },
    );
    const sibs = otherRoundWeeks(Number(session.week));
    return { workouts: final, propagated: sibs.length > 0, siblings: sibs };
  }

  return { workouts, propagated: false, siblings: [] };
};

/**
 * Apply round-link propagation after a multi-field patch on one exercise.
 * Only the identity fields present in the patch ripple; loading is preserved.
 */
export const linkRoundFields = (
  workouts: any[],
  session: any,
  exIndex: number,
  patch: Record<string, any>,
  isGroupPT: boolean,
  linkRounds: boolean,
): RoundLinkResult => {
  if (
    !linkRounds ||
    !isGroupPT ||
    exIndex === -1 ||
    !session?.exercises?.[exIndex]
  ) {
    return { workouts, propagated: false, siblings: [] };
  }

  const identityKeys = ["name", "trackingType", "eachSide", "blockType"];
  const identity: Record<string, any> = {};
  for (const k of identityKeys) if (k in patch) identity[k] = patch[k];

  // pickOne on a section header
  if ("pickOne" in patch && session.exercises[exIndex].isSection) {
    const final = propagateSectionFlagAcrossRounds(
      workouts,
      Number(session.week),
      Number(session.day),
      exIndex,
      "pickOne",
      patch.pickOne,
    );
    const sibs = otherRoundWeeks(Number(session.week));
    return { workouts: final, propagated: sibs.length > 0, siblings: sibs };
  }

  if (Object.keys(identity).length > 0) {
    const final = propagateAcrossRounds(
      workouts,
      Number(session.week),
      Number(session.day),
      exIndex,
      identity,
    );
    const sibs = otherRoundWeeks(Number(session.week));
    return { workouts: final, propagated: sibs.length > 0, siblings: sibs };
  }

  return { workouts, propagated: false, siblings: [] };
};
