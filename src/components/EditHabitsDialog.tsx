import { useEffect, useState } from "react";
import { Check, Plus, Pencil, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { getHabitLibrary } from "@/lib/trialGoals";
import { saveTrialHabits } from "@/lib/trialHub";

interface CurrentHabit {
  id: string;
  habit_id: string | number | null;
  habit_name: string | null;
  habits?: { name: string } | null;
}

interface Props {
  currentHabits: CurrentHabit[];
  onSaved: () => void;
  trigger?: React.ReactNode;
}

export const EditHabitsDialog = ({
  currentHabits,
  onSaved,
  trigger,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<{ id: any; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const lib = await getHabitLibrary();
      setLibrary(
        (lib || [])
          .filter((h: any) => h?.name)
          .map((h: any) => ({ id: h.id, name: h.name })),
      );
      // Pre-select current habits by their display name
      const names = currentHabits.map(
        (h) => h.habit_name || h.habits?.name || "",
      );
      setSelected(names.filter(Boolean));
    })();
  }, [open, currentHabits]);

  const toggle = (name: string) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name],
    );

  const addCustom = () => {
    const name = customHabit.trim();
    if (!name) return;
    if (!selected.includes(name)) setSelected((prev) => [...prev, name]);
    setCustomHabit("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTrialHabits(selected, currentHabits);
      toast.success("Habits updated");
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save habits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide uppercase">
            Edit your habits
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {(showAll ? library : library.slice(0, 8)).map((h) => {
            const isSel = selected.includes(h.name);
            return (
              <button
                key={h.name}
                type="button"
                onClick={() => toggle(h.name)}
                className={
                  "rounded-xl border p-3 text-left text-sm font-medium transition flex items-start justify-between gap-2 min-h-[3.25rem] py-2.5 " +
                  (isSel
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted/50")
                }
              >
                <span className="whitespace-normal leading-tight text-left">
                  {h.name}
                </span>
                {isSel ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Plus className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {library.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-sm font-medium text-primary py-1"
          >
            {showAll ? "Show fewer" : `Show all ${library.length} habits`}
            <ChevronDown
              className={"w-4 h-4 transition " + (showAll ? "rotate-180" : "")}
            />
          </button>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Create your own habit…"
            value={customHabit}
            onChange={(e) => setCustomHabit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button
            variant="outline"
            onClick={addCustom}
            disabled={!customHabit.trim()}
            className="shrink-0 gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-1"
              >
                {h}
                <button
                  type="button"
                  onClick={() => toggle(h)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">Aim for 2–3.</p>

        <Button
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="w-full gap-2"
        >
          {saving ? "Saving…" : "Save habits"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default EditHabitsDialog;
