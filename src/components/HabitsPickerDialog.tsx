import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HabitExplainerVideo } from "@/components/HabitExplainerVideo";
import { getHabitLibrary, setMonthlyHabits } from "@/lib/memberGoals";

type Habit = { id: number; name: string };

const monthLabel = () =>
  new Date().toLocaleDateString("en-GB", { month: "long" });

export function HabitsPickerDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** pre-fill current habits (names) */
  initial?: (string | null)[];
  onSaved?: () => void;
}) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [picked, setPicked] = useState<(string | null)[]>([null, null, null]);
  const [customMode, setCustomMode] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPicked([
        initial?.[0] ?? null,
        initial?.[1] ?? null,
        initial?.[2] ?? null,
      ]);
    }
  }, [open, initial]);

  useEffect(() => {
    getHabitLibrary().then((h) =>
      setHabits(
        (h || [])
          .filter((x: any) => x && x.id != null)
          .map((x: any) => ({ id: Number(x.id), name: String(x.name || x.id) }))
          .sort((a: Habit, b: Habit) => a.id - b.id),
      ),
    );
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      await setMonthlyHabits(picked.map((h) => (h ? h.trim() : null)));
      toast.success("Habits saved");
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error("Couldn't save: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Your 3 habits for {monthLabel()}
          </DialogTitle>
          <DialogDescription>
            Pick the habits you'll build this month — they'll show in your habit
            tracker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <HabitExplainerVideo />
          <div className="space-y-2">
            {habits.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No habit library loaded yet — you can type custom habits below.
              </p>
            )}
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Habit {slot + 1}
                  {slot > 0 ? " (optional)" : ""}
                </Label>
                {customMode[slot] ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type your own habit…"
                      value={picked[slot] ?? ""}
                      onChange={(e) =>
                        setPicked((p) =>
                          p.map((x, i) => (i === slot ? e.target.value : x)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setCustomMode((m) =>
                          m.map((x, i) => (i === slot ? false : x)),
                        );
                        setPicked((p) =>
                          p.map((x, i) => (i === slot ? null : x)),
                        );
                      }}
                    >
                      List
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={
                        picked[slot] &&
                        habits.some(
                          (h) =>
                            h.name.toLowerCase() ===
                            picked[slot]!.toLowerCase(),
                        )
                          ? picked[slot]!
                          : ""
                      }
                      onChange={(e) =>
                        setPicked((p) =>
                          p.map((x, i) =>
                            i === slot ? e.target.value || null : x,
                          ),
                        )
                      }
                    >
                      <option value="">— None —</option>
                      {habits.map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setCustomMode((m) =>
                          m.map((x, i) => (i === slot ? true : x)),
                        );
                        setPicked((p) =>
                          p.map((x, i) => (i === slot ? null : x)),
                        );
                      }}
                    >
                      Custom
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </span>
            ) : (
              "Save habits"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HabitsPickerDialog;
