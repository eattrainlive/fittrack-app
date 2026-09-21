/**
 * Hook that returns a handler to apply an AI Coach draft to the programme
 * editor state. Kept in its own module so Admin.tsx stays lean — the hook
 * receives the setters and returns a single callback.
 */
import { useCallback } from "react";
import { toast } from "sonner";

interface ApplyDraftSetters {
  editingProgramIdRef: React.MutableRefObject<string | null>;
  setEditingProgramId: (v: string | null) => void;
  setNewProgName: (v: string) => void;
  setNewProgDesc: (v: string) => void;
  setNewProgStream: (v: string) => void;
  setNewProgStartDate: (v: string) => void;
  setNewProgCover: (v: string) => void;
  setNewProgType: (v: any) => void;
  setNewProgWeeks: (v: number) => void;
  setNewProgDays: (v: number) => void;
  setProgWorkouts: (v: any[]) => void;
  setProgWeekNotes: (v: Record<number, any>) => void;
  setSelectedWorkoutIndex: (v: number) => void;
  setProgViewMode: (v: "day" | "full") => void;
  setActiveTab: (v: string) => void;
}

export const useApplyDraft = (s: ApplyDraftSetters) =>
  useCallback(
    (r: {
      workouts: any[];
      stream: string;
      weekCount: number;
      daysInFirstWeek: number;
      type: "program" | "GroupPT";
      unmatchedCount: number;
    }) => {
      if (r.unmatchedCount > 0) {
        toast.warning(
          `${r.unmatchedCount} exercise(s) didn't match the library — check them in the editor.`,
        );
      } else {
        toast.success(
          "Draft loaded into the editor — tweak and save when ready.",
        );
      }
      s.editingProgramIdRef.current = null;
      s.setEditingProgramId(null);
      s.setNewProgName(`AI Draft — ${r.stream}`);
      s.setNewProgDesc("");
      s.setNewProgStream(r.stream);
      s.setNewProgStartDate("");
      s.setNewProgCover("");
      s.setNewProgType(r.type);
      s.setNewProgWeeks(r.weekCount);
      s.setNewProgDays(r.daysInFirstWeek);
      s.setProgWorkouts(r.workouts);
      s.setProgWeekNotes({});
      s.setSelectedWorkoutIndex(0);
      s.setProgViewMode("day");
      s.setActiveTab("programs");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [s],
  );
