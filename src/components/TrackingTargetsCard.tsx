import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  setTrackingTargets,
  type AccClient,
} from "@/lib/accountabilityProgramme";

const TRACKING_APP_LABELS: Record<string, string> = {
  mfp: "MyFitnessPal",
  nutracheck: "Nutracheck",
  other: "Other",
  none: "I don't track",
};

/**
 * Coach-set nutrition targets card. Shown only when the client's
 * nutrition_approach is "tracking". Lets the coach set calorie + protein
 * targets, view the tracking app, and see a suggested protein from
 * baseline weight.
 */
export function TrackingTargetsCard({
  client,
  onSaved,
}: {
  client: AccClient;
  onSaved: () => void;
}) {
  const [calTarget, setCalTarget] = useState("");
  const [protTarget, setProtTarget] = useState("");

  useEffect(() => {
    setCalTarget(client.calorie_target?.toString() ?? "");
    setProtTarget(client.protein_target?.toString() ?? "");
  }, [client.calorie_target, client.protein_target]);

  if (client.nutrition_approach !== "tracking") return null;

  const baselineWeight = client.baseline?.weight;
  const suggestedProtein = baselineWeight
    ? Math.round(Number(baselineWeight) * 1.2)
    : null;
  const appLabel =
    client.tracking_app === "other"
      ? client.tracking_app_other || "Other"
      : TRACKING_APP_LABELS[client.tracking_app || ""] || "this app";

  const saveTargets = async () => {
    const { error } = await setTrackingTargets(client.id, {
      calorie_target: calTarget ? Number(calTarget) : null,
      protein_target: protTarget ? Number(protTarget) : null,
    });
    if (error) toast.error("Couldn't save targets");
    else {
      toast.success("Targets saved");
      onSaved();
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Nutrition tracking</p>
          <Badge variant="secondary" className="text-xs">
            {client.tracking_app === "other"
              ? client.tracking_app_other || "Other"
              : TRACKING_APP_LABELS[client.tracking_app || ""] || "—"}
          </Badge>
        </div>

        {client.tracking_app === "mfp" && client.mfp_username ? (
          <a
            href={`https://www.myfitnesspal.com/food/diary/${encodeURIComponent(client.mfp_username)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline"
          >
            Open MyFitnessPal diary →
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            No shared diary for {appLabel} — check the weekly screenshot below.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Calorie target
            </Label>
            <Input
              type="number"
              value={calTarget}
              onChange={(e) => setCalTarget(e.target.value)}
              placeholder="e.g. 1800"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Protein target (g)
            </Label>
            <Input
              type="number"
              value={protTarget}
              onChange={(e) => setProtTarget(e.target.value)}
              placeholder="e.g. 140"
              className="h-9"
            />
          </div>
        </div>

        {suggestedProtein != null && (
          <p className="text-xs text-muted-foreground">
            Suggested protein: {suggestedProtein} g (based on baseline weight)
          </p>
        )}

        <Button size="sm" onClick={saveTargets} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> Save targets
        </Button>
      </CardContent>
    </Card>
  );
}

export default TrackingTargetsCard;
