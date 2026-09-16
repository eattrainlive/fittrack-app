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
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  getTrialHubContent,
  saveTrialHubContent,
  type TrialHubContent,
} from "@/lib/trialHub";

export const TrialHubSettings = () => {
  const [content, setContent] = useState<TrialHubContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTrialHubContent().then(setContent);
  }, []);

  if (!content) return null;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await saveTrialHubContent(content);
      if (error) toast.error("Couldn't save");
      else toast.success("Trial hub content saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Trial Hub Content</CardTitle>
        <CardDescription>
          Onboarding video, habit helper & review link shown on the 30-day trial
          hub.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="welcome">Welcome / onboarding video URL</Label>
          <Input
            id="welcome"
            placeholder="https://www.loom.com/share/… or YouTube"
            value={content.welcome_video_url}
            onChange={(e) =>
              setContent({ ...content, welcome_video_url: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="habits">Habit helper video URL</Label>
          <Input
            id="habits"
            placeholder="https://…"
            value={content.habits_video_url}
            onChange={(e) =>
              setContent({ ...content, habits_video_url: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="review">Review booking link</Label>
          <Input
            id="review"
            placeholder="https://…"
            value={content.review_booking_url}
            onChange={(e) =>
              setContent({ ...content, review_booking_url: e.target.value })
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
