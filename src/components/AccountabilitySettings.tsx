import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAccountabilitySettings,
  saveAccountabilitySettings,
  type AccountabilitySettings,
} from "@/lib/accountability";

export function AccountabilitySettings() {
  const [cfg, setCfg] = useState<AccountabilitySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccountabilitySettings().then(setCfg);
  }, []);

  if (!cfg) return null;

  const update = (patch: Partial<AccountabilitySettings>) =>
    setCfg({ ...cfg, ...patch });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveAccountabilitySettings(cfg);
    setSaving(false);
    if (error) {
      console.error("saveAccountabilitySettings", error);
      toast.error("Couldn't save accountability settings");
    } else {
      toast.success("Accountability settings saved");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Accountability Programme</CardTitle>
        <CardDescription>
          Control the 6 Week Accountability Programme launch card shown in the
          Coaching section. Off = members register interest; On = opens the
          in-app course.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold">Course live</Label>
            <p className="text-xs text-muted-foreground">
              On = "Open programme" button. Off = "Register your interest".
            </p>
          </div>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Programme title</Label>
          <Input
            value={cfg.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="6 Week Accountability Programme"
          />
        </div>

        <div className="space-y-2">
          <Label>Start date</Label>
          <Input
            type="date"
            value={cfg.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Register-interest URL</Label>
          <Input
            value={cfg.registerUrl}
            onChange={(e) => update({ registerUrl: e.target.value })}
            placeholder="https://…"
          />
          <p className="text-xs text-muted-foreground">
            The link members open when the toggle is OFF. Leave blank to show
            "Details coming soon".
          </p>
        </div>

        <div className="space-y-2">
          <Label>Course route / link</Label>
          <Input
            value={cfg.courseRoute}
            onChange={(e) => update({ courseRoute: e.target.value })}
            placeholder="/accountability (set when the course is built)"
          />
          <p className="text-xs text-muted-foreground">
            In-app route members open when the toggle is ON.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
