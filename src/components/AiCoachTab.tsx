/**
 * AI Coach tab wrapper — encapsulates the CoachAiChat component plus the
 * "Open in editor" handoff that maps a draft into the programme editor state.
 *
 * Extracted so Admin.tsx doesn't grow. The parent passes the exercise library,
 * the members list, and a callback that receives the mapped workouts + meta
 * (it sets the editor state and switches to the Programs tab).
 */
import { CoachAiChat } from "@/components/CoachAiChat";
import { draftToEditorWorkouts } from "@/lib/draftToEditor";
import type { ProgrammeDraft } from "@/lib/coachAgent";

interface AiCoachTabProps {
  exercises: any[];
  members: any[];
  /** Called with the mapped workouts + programme meta when the coach clicks
   *  "Open in editor". The parent applies these to its editor state. */
  onApplyDraft: (result: {
    workouts: any[];
    stream: string;
    weekCount: number;
    daysInFirstWeek: number;
    type: "program" | "GroupPT";
    unmatchedCount: number;
  }) => void;
}

export const AiCoachTab = ({
  exercises,
  members,
  onApplyDraft,
}: AiCoachTabProps) => {
  const handleOpenInEditor = (draft: ProgrammeDraft, stream: string) => {
    const result = draftToEditorWorkouts(draft, exercises);
    onApplyDraft({
      workouts: result.workouts,
      stream,
      weekCount: result.weekCount,
      daysInFirstWeek: result.daysInFirstWeek,
      type: stream === "GroupPT" ? "GroupPT" : "program",
      unmatchedCount: result.unmatchedCount,
    });
  };

  return <CoachAiChat onOpenInEditor={handleOpenInEditor} members={members} />;
};
