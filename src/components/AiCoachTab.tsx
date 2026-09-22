/**
 * AI Coach tab wrapper — encapsulates the CoachAiChat component plus the
 * "Open in editor" handoff that maps a structured draft into the programme
 * editor state.
 *
 * The structured draft (from the coach-agent "structure" action) is passed
 * to draftToEditorWorkouts, which maps it into the editor's progWorkouts
 * shape (resolving exercises by exercise_id, carrying minDays → dayCounts).
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
