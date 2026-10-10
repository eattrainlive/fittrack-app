import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setStepTarget, type AccClient } from "@/lib/accountabilityProgramme";

/**
 * Coach console: set / adjust a client's daily step target.
 * Applies to every client (Plate or Tracking) — the step target is
 * independent of the nutrition approach.
 */
export function StepTargetCard({
  client,
  onSaved,
}: {
  client: AccClient;
  onSaved?: () => void;
}) {
  const [val, setVal] = useState(
    client.step_target ? String(client.step_target) : "",
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const n = val.trim() ? Number(val) : null;
    if (n != null && (Number.isNaN(n) || n <= 0)) {
      toast.error("Enter a valid step target");
      return;
    }
    setBusy(true);
    const { error } = await setStepTarget(client.id, n);
    setBusy(false);
    if (error) {
      toast.error("Couldn't save step target");
    } else {
      toast.success("Step target saved");
      onSaved?.();
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-3">
        <Label className="block text-xs font-semibold text-primary mb-1.5">
          Daily step target
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={
              client.step_target ? String(client.step_target) : "Not set yet"
            }
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={save}
            disabled={busy}
            className="gap-1.5 shrink-0"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {client.step_target
            ? `Current: ${Number(client.step_target).toLocaleString()}/day`
            : "Not set yet — nudge on the Week 3 call"}
        </p>
      </CardContent>
    </Card>
  );
}

export default StepTargetCard;
