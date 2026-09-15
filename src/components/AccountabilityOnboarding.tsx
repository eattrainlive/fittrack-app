import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Target,
  Ruler,
  Camera as CameraIcon,
  Utensils,
  Activity,
  Brain,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  saveMyOnboarding,
  type AccClient,
} from "@/lib/accountabilityProgramme";
import {
  ShortText,
  LongText,
  NumberField,
  Scale05,
  MultiSelect,
  SingleSelect,
  QLabel,
} from "./onboardingFields";

interface SectionDef {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "why",
    title: "Your why & goals",
    icon: Heart,
    desc: "Let's understand what's driving you.",
  },
  {
    key: "nonscale",
    title: "Non-scale wins & events",
    icon: Target,
    desc: "Success beyond the number.",
  },
  {
    key: "baseline",
    title: "Baseline measurements",
    icon: Ruler,
    desc: "Where you're starting today.",
  },
  {
    key: "tracking",
    title: "Tracking, photos & energy",
    icon: CameraIcon,
    desc: "How we'll measure progress.",
  },
  {
    key: "eating",
    title: "Eating patterns",
    icon: Utensils,
    desc: "Your current relationship with food.",
  },
  {
    key: "activity",
    title: "Activity & sleep",
    icon: Activity,
    desc: "Movement and recovery.",
  },
  {
    key: "stress",
    title: "Stress, patterns & history",
    icon: Brain,
    desc: "What's helped and what hasn't.",
  },
  {
    key: "commit",
    title: "Commitment & approach",
    icon: ClipboardCheck,
    desc: "How you like to be coached.",
  },
];

export function AccountabilityOnboarding({
  client,
  onDone,
}: {
  client: AccClient;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, any>>({});

  const set = (k: string, v: any) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (client.onboarding && Object.keys(client.onboarding).length) {
      setF({ ...client.onboarding });
      const b = client.baseline || {};
      if (b.photos) {
        setPhotoFront(b.photos[0] || null);
        setPhotoSide(b.photos[1] || null);
      }
    }
  }, [client]);

  const start = () => {
    setSection(0);
    setOpen(true);
  };
  const goNext = () => setSection((s) => Math.min(s + 1, SECTIONS.length - 1));
  const goBack = () => setSection((s) => Math.max(s - 1, 0));

  const handlePhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    which: "front" | "side",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const ext = file.name.split(".").pop();
      const path = `nutrition-photos/${user.id}/acc-baseline-${which}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (which === "front") setPhotoFront(data.publicUrl);
      else setPhotoSide(data.publicUrl);
      toast.success("Photo added");
    } catch (err: any) {
      toast.error("Photo upload failed: " + err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const photos = [photoFront, photoSide].filter(Boolean) as string[];
      const baseline: Record<string, any> = {
        weight: f.q10 ? Number(f.q10) : null,
        height: f.q11 || null,
        chest: f.q12 ? Number(f.q12) : null,
        waist: f.q13 ? Number(f.q13) : null,
        bodyFat: f.q14 ? Number(f.q14) : null,
        thigh: f.q15 ? Number(f.q15) : null,
        tummy: f.q16 ? Number(f.q16) : null,
        steps: f.q28 ? Number(f.q28) : null,
        photos,
      };
      const why = (f.q2 && f.q2.trim()) || (f.q1 && f.q1.trim()) || null;
      const derailers =
        (f.q35 && f.q35.trim()) || (f.q25 && f.q25.trim()) || null;
      const events = (f.q9 && f.q9.trim()) || null;
      const stepTarget = f.q28 ? Number(f.q28) : null;
      let nutritionApproach: string | null = null;
      if (f.q39) {
        nutritionApproach = f.q39 === "Unsure" ? "plate" : f.q39.toLowerCase();
      }
      const accountabilityStyle = f.q40 || null;
      const checkinPref = f.q41 || null;

      const { error } = await saveMyOnboarding(client.id, {
        onboarding: f,
        why,
        derailers,
        events,
        baseline,
        step_target: stepTarget,
        nutrition_approach: nutritionApproach,
        accountability_style: accountabilityStyle,
        checkin_pref: checkinPref,
      });
      if (error) throw error;

      if (f.q10 && Number(f.q10) > 0) {
        try {
          const { saveBodyweight } = await import("@/lib/store");
          await saveBodyweight(Number(f.q10));
        } catch (_) {}
      }

      toast.success("Onboarding complete — let's do this 🎯");
      setOpen(false);
      onDone?.();
    } catch (err: any) {
      toast.error("Couldn't save: " + (err?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const isLast = section === SECTIONS.length - 1;
  const sec = SECTIONS[section];
  const SecIcon = sec.icon;

  return (
    <>
      <Button onClick={start} className="gap-2">
        <ClipboardCheck className="h-4 w-4" />
        {client.onboarding_done ? "Review onboarding" : "Complete onboarding"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5">
                {section + 1}/{SECTIONS.length}
              </span>
              <SecIcon className="w-4 h-4 text-primary" />
              {sec.title}
            </DialogTitle>
            <DialogDescription>{sec.desc}</DialogDescription>
          </DialogHeader>

          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((section + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-5 py-2">
            {section === 0 && (
              <>
                <div>
                  <QLabel n={1}>What made you join right now?</QLabel>
                  <ShortText
                    value={f.q1 || ""}
                    onChange={(v) => set("q1", v)}
                    placeholder="e.g. a friend's wedding, fed up of feeling tired…"
                  />
                </div>
                <div>
                  <QLabel n={2}>
                    Beyond losing weight, WHY — what would change day-to-day?
                  </QLabel>
                  <LongText
                    value={f.q2 || ""}
                    onChange={(v) => set("q2", v)}
                    placeholder="The deeper reason…"
                  />
                </div>
                <div>
                  <QLabel n={3}>
                    How would hitting this affect work / family / confidence /
                    social / health?
                  </QLabel>
                  <LongText value={f.q3 || ""} onChange={(v) => set("q3", v)} />
                </div>
                <div>
                  <QLabel n={4}>
                    Picture yourself at the end — what can you do / feel / wear?
                  </QLabel>
                  <LongText value={f.q4 || ""} onChange={(v) => set("q4", v)} />
                </div>
                <div>
                  <QLabel n={5}>How ready & motivated are you?</QLabel>
                  <Scale05 value={f.q5 || ""} onChange={(v) => set("q5", v)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = not at all, 5 = all in
                  </p>
                </div>
                <div>
                  <QLabel n={6}>Main goal for the six weeks</QLabel>
                  <MultiSelect
                    options={[
                      "Fat Loss",
                      "More Energy",
                      "Strength",
                      "Confidence",
                      "Better Habits",
                    ]}
                    value={f.q6 || []}
                    onChange={(v) => set("q6", v)}
                  />
                </div>
                <div>
                  <QLabel n={7}>
                    If the scale barely moved but you felt fitter / ate better —
                    success?
                  </QLabel>
                  <SingleSelect
                    options={["Yes", "No"]}
                    value={f.q7 || ""}
                    onChange={(v) => set("q7", v)}
                  />
                </div>
              </>
            )}

            {section === 1 && (
              <>
                <div>
                  <QLabel n={8}>Non-scale wins that matter most</QLabel>
                  <MultiSelect
                    options={[
                      "Energy",
                      "Sleep",
                      "Clothes fitting",
                      "Fewer cravings",
                      "Confidence",
                    ]}
                    value={f.q8 || []}
                    onChange={(v) => set("q8", v)}
                    allowOther
                  />
                </div>
                <div>
                  <QLabel n={9}>
                    A specific date / event you're working towards?
                  </QLabel>
                  <ShortText
                    value={f.q9 || ""}
                    onChange={(v) => set("q9", v)}
                    placeholder="e.g. holiday in June, birthday…"
                  />
                </div>
              </>
            )}

            {section === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <QLabel n={10}>Current weight (kg)</QLabel>
                  <NumberField
                    value={f.q10 || ""}
                    onChange={(v) => set("q10", v)}
                    placeholder="e.g. 78"
                  />
                </div>
                <div>
                  <QLabel n={11}>Height</QLabel>
                  <ShortText
                    value={f.q11 || ""}
                    onChange={(v) => set("q11", v)}
                    placeholder="e.g. 175 cm / 5'9"
                  />
                </div>
                <div>
                  <QLabel n={12}>Chest (cm)</QLabel>
                  <NumberField
                    value={f.q12 || ""}
                    onChange={(v) => set("q12", v)}
                  />
                </div>
                <div>
                  <QLabel n={13}>Waist (cm)</QLabel>
                  <NumberField
                    value={f.q13 || ""}
                    onChange={(v) => set("q13", v)}
                  />
                </div>
                <div>
                  <QLabel n={14}>Body fat % (Evolt)</QLabel>
                  <NumberField
                    value={f.q14 || ""}
                    onChange={(v) => set("q14", v)}
                  />
                </div>
                <div>
                  <QLabel n={15}>Thigh (cm)</QLabel>
                  <NumberField
                    value={f.q15 || ""}
                    onChange={(v) => set("q15", v)}
                  />
                </div>
                <div className="col-span-2">
                  <QLabel n={16}>Tummy (cm)</QLabel>
                  <NumberField
                    value={f.q16 || ""}
                    onChange={(v) => set("q16", v)}
                  />
                </div>
              </div>
            )}

            {section === 3 && (
              <>
                <div>
                  <QLabel n={17}>
                    How would you prefer to track progress?
                  </QLabel>
                  <MultiSelect
                    options={[
                      "Measurements",
                      "Weight",
                      "Photos",
                      "How clothes fit",
                    ]}
                    value={f.q17 || []}
                    onChange={(v) => set("q17", v)}
                  />
                </div>
                <div>
                  <QLabel n={18}>
                    Baseline photos (front + side, same spot / lighting)
                  </QLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {(["front", "side"] as const).map((which) => {
                      const url = which === "front" ? photoFront : photoSide;
                      return (
                        <label
                          key={which}
                          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-4 cursor-pointer hover:bg-muted/60 transition aspect-square overflow-hidden"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={which}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-primary" />
                              <span className="text-xs font-medium capitalize">
                                {which} photo
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhoto(e, which)}
                            disabled={busy}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Private — only you and your coach see these.
                  </p>
                </div>
                <div>
                  <QLabel n={19}>Energy on a normal day</QLabel>
                  <Scale05
                    value={f.q19 || ""}
                    onChange={(v) => set("q19", v)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = exhausted, 5 = buzzing
                  </p>
                </div>
              </>
            )}

            {section === 4 && (
              <>
                <div>
                  <QLabel n={20}>Typical day of eating (what & when)</QLabel>
                  <LongText
                    value={f.q20 || ""}
                    onChange={(v) => set("q20", v)}
                    placeholder="Breakfast at 7, coffee, sandwich at 12…"
                  />
                </div>
                <div>
                  <QLabel n={21}>How many meals + snacks a day?</QLabel>
                  <ShortText
                    value={f.q21 || ""}
                    onChange={(v) => set("q21", v)}
                    placeholder="e.g. 3 meals, 2 snacks"
                  />
                </div>
                <div>
                  <QLabel n={22}>
                    How often a good protein source at each meal?
                  </QLabel>
                  <SingleSelect
                    options={["Never", "Some", "Most", "Every meal"]}
                    value={f.q22 || ""}
                    onChange={(v) => set("q22", v)}
                  />
                </div>
                <div>
                  <QLabel n={23}>Water on a typical day?</QLabel>
                  <SingleSelect
                    options={["<1L", "1–2L", "2L+"]}
                    value={f.q23 || ""}
                    onChange={(v) => set("q23", v)}
                  />
                </div>
                <div>
                  <QLabel n={24}>When & why do you snack?</QLabel>
                  <MultiSelect
                    options={[
                      "Habit",
                      "Social",
                      "Hunger",
                      "Boredom",
                      "Stress",
                      "Tiredness",
                    ]}
                    value={f.q24 || []}
                    onChange={(v) => set("q24", v)}
                  />
                </div>
                <div>
                  <QLabel n={25}>Biggest cravings / hardest to resist?</QLabel>
                  <ShortText
                    value={f.q25 || ""}
                    onChange={(v) => set("q25", v)}
                    placeholder="e.g. chocolate in the evenings…"
                  />
                </div>
                <div>
                  <QLabel n={26}>Alcoholic drinks in a typical week?</QLabel>
                  <NumberField
                    value={f.q26 || ""}
                    onChange={(v) => set("q26", v)}
                    placeholder="e.g. 4"
                  />
                </div>
                <div>
                  <QLabel n={27}>
                    Foods you love & want to keep / can't stand?
                  </QLabel>
                  <ShortText
                    value={f.q27 || ""}
                    onChange={(v) => set("q27", v)}
                  />
                </div>
              </>
            )}

            {section === 5 && (
              <>
                <div>
                  <QLabel n={28}>Steps on a normal day (guess is fine)</QLabel>
                  <NumberField
                    value={f.q28 || ""}
                    onChange={(v) => set("q28", v)}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <QLabel n={29}>
                    Job mostly: sitting / on your feet / active?
                  </QLabel>
                  <SingleSelect
                    options={["Sitting", "On your feet", "Active"]}
                    value={f.q29 || ""}
                    onChange={(v) => set("q29", v)}
                  />
                </div>
                <div>
                  <QLabel n={30}>
                    Currently exercise / train? What & days/week?
                  </QLabel>
                  <ShortText
                    value={f.q30 || ""}
                    onChange={(v) => set("q30", v)}
                    placeholder="e.g. gym twice a week, walks…"
                  />
                </div>
                <div>
                  <QLabel n={31}>Sleep hours & quality?</QLabel>
                  <ShortText
                    value={f.q31 || ""}
                    onChange={(v) => set("q31", v)}
                    placeholder="e.g. 7 hrs, decent…"
                  />
                </div>
              </>
            )}

            {section === 6 && (
              <>
                <div>
                  <QLabel n={32}>Stress level right now</QLabel>
                  <Scale05
                    value={f.q32 || ""}
                    onChange={(v) => set("q32", v)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = chilled, 5 = overwhelmed
                  </p>
                </div>
                <div>
                  <QLabel n={33}>What does a typical week look like?</QLabel>
                  <LongText
                    value={f.q33 || ""}
                    onChange={(v) => set("q33", v)}
                  />
                </div>
                <div>
                  <QLabel n={34}>
                    What have you tried before? What worked / didn't?
                  </QLabel>
                  <LongText
                    value={f.q34 || ""}
                    onChange={(v) => set("q34", v)}
                  />
                </div>
                <div>
                  <QLabel n={35}>
                    When you've fallen off track, what caused it?
                  </QLabel>
                  <LongText
                    value={f.q35 || ""}
                    onChange={(v) => set("q35", v)}
                  />
                </div>
                <div>
                  <QLabel n={36}>What do you STOP doing when slipping?</QLabel>
                  <ShortText
                    value={f.q36 || ""}
                    onChange={(v) => set("q36", v)}
                  />
                </div>
                <div>
                  <QLabel n={37}>
                    When you're doing well, what's usually in place?
                  </QLabel>
                  <ShortText
                    value={f.q37 || ""}
                    onChange={(v) => set("q37", v)}
                  />
                </div>
              </>
            )}

            {section === 7 && (
              <>
                <div>
                  <QLabel n={38}>
                    Confidence to stick to daily habits for 6 weeks
                  </QLabel>
                  <Scale05
                    value={f.q38 || ""}
                    onChange={(v) => set("q38", v)}
                  />
                </div>
                <div>
                  <QLabel n={39}>
                    Plate method (no tracking) vs precise tracking?
                  </QLabel>
                  <SingleSelect
                    options={["Plate", "Tracking", "Unsure"]}
                    value={f.q39 || ""}
                    onChange={(v) => set("q39", v)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unsure? We'll start with the plate method.
                  </p>
                </div>
                <div>
                  <QLabel n={40}>What accountability helps most?</QLabel>
                  <SingleSelect
                    options={[
                      "Gentle nudges",
                      "Firm push",
                      "Data review",
                      "Group",
                    ]}
                    value={f.q40 || ""}
                    onChange={(v) => set("q40", v)}
                  />
                </div>
                <div>
                  <QLabel n={41}>Weekly check-in preference</QLabel>
                  <SingleSelect
                    options={["Phone call", "Loom video", "Either"]}
                    value={f.q41 || ""}
                    onChange={(v) => set("q41", v)}
                  />
                </div>
                <div>
                  <QLabel n={42}>Anything else you want me to know?</QLabel>
                  <LongText
                    value={f.q42 || ""}
                    onChange={(v) => set("q42", v)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={section === 0 ? () => setOpen(false) : goBack}
              disabled={busy}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {section === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goNext}
                  disabled={busy}
                >
                  Skip
                </Button>
              )}
              {isLast ? (
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={busy}
                  className="gap-1"
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                    </span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Submit
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={goNext}
                  disabled={busy}
                  className="gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AccountabilityOnboarding;
