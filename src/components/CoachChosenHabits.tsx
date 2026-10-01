import { Loader2, ListChecks } from "lucide-react";
import type { ChosenHabit } from "@/lib/chosenHabits";

interface Props {
  habits: ChosenHabit[];
  loading: boolean;
  /** Authoritative "on app" from the server (resolves the real auth account by
   * email). When false, show "Not on app yet" instead of misleading zeros. */
  onApp: boolean;
}

/**
 * Coach review "Chosen Habits" section. Reads habits resolved server-side
 * (progress-summary resolves the member's app-account id by email, then queries
 * member_habits by that id) and shows "Not on app yet" when the member has no
 * app account so the coach sees an onboarding gap rather than fake zeros.
 */
export function CoachChosenHabits({ habits, loading, onApp }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <ListChecks className="w-3.5 h-3.5 text-primary" /> Chosen Habits
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading habits…
        </div>
      ) : !onApp ? (
        <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border">
          Not on app yet.
        </p>
      ) : habits.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border">
          No habits set yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {habits.map((h, i) => (
            <li
              key={(h.id || h.name) + i}
              className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-lg bg-muted/30 border border-border"
            >
              <span className="font-medium truncate">{h.name}</span>
              <span className="text-muted-foreground shrink-0">
                {h.checkins7d} in 7d
                {h.totalCheckins > 0 && ` · ${h.totalCheckins} all-time`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CoachChosenHabits;
