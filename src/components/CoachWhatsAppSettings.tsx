import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  getCoachWhatsAppSettings,
  saveCoachWhatsAppSettings,
  type CoachWhatsAppSettings as CoachWhatsAppSettingsType,
} from "@/lib/coachWhatsApp";

export const CoachWhatsAppSettings = () => {
  const [settings, setSettings] = useState<CoachWhatsAppSettingsType | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCoachWhatsAppSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await saveCoachWhatsAppSettings(settings);
      if (error) toast.error("Couldn't save");
      else toast.success("Coach WhatsApp settings saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Coach WhatsApp</CardTitle>
        <CardDescription>
          The number members reach via the "Message a coach" button. Use E.164
          digits only (e.g. 447700900123) — no "+".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wa-number">WhatsApp number</Label>
          <Input
            id="wa-number"
            placeholder="447700900123"
            value={settings.number}
            onChange={(e) =>
              setSettings({ ...settings, number: e.target.value })
            }
          />
          {settings.number && (
            <p className="text-xs text-muted-foreground">
              Members will open: wa.me/{settings.number.replace(/\D/g, "")}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="wa-everywhere" className="text-sm">
            Show on Coaching tab (all members)
          </Label>
          <Switch
            id="wa-everywhere"
            checked={settings.enabledEverywhere}
            onCheckedChange={(v) =>
              setSettings({ ...settings, enabledEverywhere: v })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="wa-trial" className="text-sm">
            Show on trial hub
          </Label>
          <Switch
            id="wa-trial"
            checked={settings.enabledOnTrial}
            onCheckedChange={(v) =>
              setSettings({ ...settings, enabledOnTrial: v })
            }
          />
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};
