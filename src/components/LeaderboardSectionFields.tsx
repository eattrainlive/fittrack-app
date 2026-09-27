import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  pe: any;
  updateProgExercise: (id: any, field: string, value: any) => void;
}

/**
 * Leaderboard workout toggle + optional title, shown in the programme editor
 * section meta row (alongside "Members pick one option"). Extracted into its
 * own component so Admin.tsx stays small.
 */
export function LeaderboardSectionFields({ pe, updateProgExercise }: Props) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 md:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
        <div className="space-y-0.5">
          <Label className="text-sm font-bold">Leaderboard workout</Label>
          <p className="text-xs text-muted-foreground leading-snug">
            Rank everyone who logs this block on a leaderboard — auto-set for
            Performance engine blocks.
          </p>
        </div>
        <Switch
          checked={!!pe.leaderboard}
          onCheckedChange={(v) => updateProgExercise(pe.id, "leaderboard", v)}
        />
      </div>
      {pe.leaderboard && (
        <div className="md:col-span-2">
          <Label className="text-sm font-bold">Leaderboard title</Label>
          <Input
            value={pe.leaderboardTitle ?? ""}
            onChange={(e) =>
              updateProgExercise(
                pe.id,
                "leaderboardTitle",
                e.target.value || null,
              )
            }
            placeholder={pe.name || "e.g. Engine Grinder"}
            className="mt-1"
          />
        </div>
      )}
    </>
  );
}
