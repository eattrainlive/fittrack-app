import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  logErgMetres,
  ERG_MACHINES,
  ERG_MACHINE_LABELS,
  type ErgMachine,
} from "@/lib/ergChallenge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const MAX = 100000;

export default function ErgLogDialog({ open, onOpenChange, onSaved }: Props) {
  const [machine, setMachine] = useState<ErgMachine>("bike");
  const [metres, setMetres] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMetres("");
    setSaving(false);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const submit = async () => {
    const n = Math.floor(Number(metres));
    if (!metres || Number.isNaN(n) || n <= 0) {
      toast.error("Enter a whole number of metres (1+).");
      return;
    }
    if (n > MAX) {
      toast.error(`Max ${MAX.toLocaleString()} m per entry.`);
      return;
    }
    setSaving(true);
    const { error } = await logErgMetres(machine, n);
    if (error) {
      setSaving(false);
      toast.error("Couldn't save — try again.");
      return;
    }
    toast.success(`Nice — ${n.toLocaleString()} m added!`);
    reset();
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log metres</DialogTitle>
          <DialogDescription>
            Add what you covered to the Million Metre Challenge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Machine</Label>
            <div className="grid grid-cols-3 gap-2">
              {ERG_MACHINES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMachine(m.key)}
                  className={
                    "rounded-lg border px-3 py-2 text-sm font-medium transition " +
                    (machine === m.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground")
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="erg-metres">Metres</Label>
            <Input
              id="erg-metres"
              inputMode="numeric"
              type="number"
              min={1}
              max={MAX}
              placeholder="e.g. 5000"
              value={metres}
              onChange={(e) => setMetres(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {ERG_MACHINE_LABELS[machine]} · whole metres, up to{" "}
              {MAX.toLocaleString()} per entry.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
