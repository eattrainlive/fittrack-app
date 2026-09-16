import { useEffect, useState } from "react";
import {
  Play,
  Check,
  Plus,
  Camera,
  Loader2,
  Target,
  Sparkles,
  Video,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  getTrialHubContent,
  getEmbedUrl,
  saveBaseline,
  finishTrialSetup,
  type TrialHubContent,
} from "@/lib/trialHub";
import { getHabitLibrary } from "@/lib/trialGoals";
import { getMyGymMember } from "@/lib/store";

interface Props {
  onFinished: () => void;
}

const PRESET_HINTS = [
  "10k steps",
  "protein daily",
  "water 2L",
  "7h+ sleep",
  "3 sessions/wk",
  "no screens 9pm",
  "5 veg a day",
  "balanced plate",
  "no alcohol weekdays",
  "stretch 10 min",
  "log food daily",
];

export const TrialSetup = ({ onFinished }: Props) => {
  const [content, setContent] = useState<TrialHubContent | null>(null);
  const [firstName, setFirstName] = useState("");
  const [habits, setHabits] = useState<{ id: any; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");
  const [weight, setWeight] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [goalText, setGoalText] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [saving, setSaving] = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    (async () => {
      setContent(await getTrialHubContent());
      const lib = await getHabitLibrary();
      setHabits(
        (lib || [])
          .filter((h: any) => h?.name)
          .map((h: any) => ({ id: h.id, name: h.name })),
      );
      const member = await getMyGymMember();
      setFirstName((member?.full_name || "").split(" ")[0] || "there");
    })();
  }, []);

  const toggleHabit = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name],
    );
  };

  const addCustomHabit = () => {
    const name = customHabit.trim();
    if (!name) return;
    if (!selected.includes(name)) setSelected((prev) => [...prev, name]);
    setCustomHabit("");
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveStep1 = async () => {
    setSaving(true);
    try {
      const w = weight ? parseFloat(weight) : null;
      const res = await saveBaseline({ weight: w, photoFile });
      if (res.error) toast.error(res.error);
      else {
        toast.success("Starting point saved");
        setStep1Done(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await finishTrialSetup({
        goalText,
        sessionsPerWeek,
        habitNames: selected,
      });
      toast.success("Setup complete — your hub is unlocked");
      onFinished();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't finish setup");
    } finally {
      setSaving(false);
    }
  };

  const embedUrl = content?.welcome_video_url
    ? getEmbedUrl(content.welcome_video_url)
    : null;

  const stepsDone = [
    step1Done,
    selected.length > 0,
    !!goalText.trim() && sessionsPerWeek > 0,
  ];
  const stepsComplete = stepsDone.filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-primary/10 border border-primary/30 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Day 1 of 30
        </p>
        <h1 className="font-heading text-2xl md:text-3xl tracking-wide uppercase leading-tight mt-1">
          Welcome, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let's set up your month. About 5 minutes — then your progress hub
          unlocks.
        </p>
      </div>

      {/* Onboarding video */}
      {embedUrl && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> Start here
            </p>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="How your 30 days work"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup progress strip */}
      <div className="flex items-center gap-2">
        {stepsDone.map((done, i) => (
          <div
            key={i}
            className={
              "flex-1 h-1.5 rounded-full " + (done ? "bg-primary" : "bg-muted")
            }
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1 shrink-0">
          {stepsComplete}/3
        </span>
      </div>

      {/* Step 1 — Baseline */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              {step1Done ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <h2 className="font-heading text-lg tracking-wide uppercase">
              Set your starting point
            </h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Starting weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 82"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Before photo (optional)</Label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-20 h-24 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Before preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-primary font-medium">
                {photoFile ? "Change photo" : "Add a before photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          </div>

          <Button
            onClick={saveStep1}
            disabled={saving || (!weight && !photoFile)}
            className="w-full gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step1Done ? (
              <Check className="w-4 h-4" />
            ) : null}
            {step1Done ? "Saved" : "Save starting point"}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — Habits */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              {selected.length > 0 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <h2 className="font-heading text-lg tracking-wide uppercase">
              Choose your habits
            </h2>
          </div>

          {/* Compact helper video */}
          {content?.habits_video_url && (
            <Dialog open={showVideo} onOpenChange={setShowVideo}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5 text-left hover:bg-muted/70 transition"
                >
                  <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      How to choose your habits
                    </p>
                    <p className="text-xs text-muted-foreground">1 min</p>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0 overflow-hidden">
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={getEmbedUrl(content.habits_video_url) || ""}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="How to choose your habits"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(showAllHabits ? habits : habits.slice(0, 8)).map((h) => {
              const isSel = selected.includes(h.name);
              return (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => toggleHabit(h.name)}
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

          {habits.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllHabits((v) => !v)}
              className="w-full flex items-center justify-center gap-1 text-sm font-medium text-primary py-1"
            >
              {showAllHabits
                ? "Show fewer"
                : `Show all ${habits.length} habits`}
              <ChevronDown
                className={
                  "w-4 h-4 transition " + (showAllHabits ? "rotate-180" : "")
                }
              />
            </button>
          )}

          {/* Create your own */}
          <div className="flex gap-2">
            <Input
              placeholder="Create your own habit…"
              value={customHabit}
              onChange={(e) => setCustomHabit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomHabit();
                }
              }}
            />
            <Button
              variant="outline"
              onClick={addCustomHabit}
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
                    onClick={() => toggleHabit(h)}
                    className="ml-0.5 opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Aim for 2–3. These become your daily check-ins.
          </p>
        </CardContent>
      </Card>

      {/* Step 3 — Map your month */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              {goalText.trim() && sessionsPerWeek > 0 ? (
                <Check className="w-4 h-4" />
              ) : (
                "3"
              )}
            </div>
            <h2 className="font-heading text-lg tracking-wide uppercase">
              Map out your month
            </h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal for these 30 days</Label>
            <Textarea
              id="goal"
              placeholder="e.g. Feel stronger and get into a routine"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Sessions per week</Label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionsPerWeek(n)}
                  className={
                    "flex-1 rounded-lg border py-2.5 font-bold transition " +
                    (sessionsPerWeek === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted/50")
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finish */}
      <div className="space-y-2">
        <Button
          onClick={finish}
          disabled={
            saving || !step1Done || selected.length === 0 || !goalText.trim()
          }
          className="w-full gap-2 text-base font-bold h-12"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          Finish setup &amp; start my 30 days →
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Your progress hub unlocks once you're set up.
        </p>
      </div>
    </div>
  );
};

export default TrialSetup;
