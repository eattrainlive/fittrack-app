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
  Check,
  Trophy,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  saveCheckin,
  getMyCheckin,
  saveFinalOutcome,
} from "@/lib/accountabilityCheckins";
import {
  ShortText,
  LongText,
  NumberField,
  Scale05,
  SingleSelect,
  QLabel,
} from "./onboardingFields";
import { Label } from "@/components/ui/label";
import type { AccClient, AccCohort } from "@/lib/accountabilityProgramme";

interface SectionDef {
  key: string;
  title: string;
  desc: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "reflect",
    title: "Reflection",
    desc: "Looking back at your 6 weeks.",
  },
  {
    key: "results",
    title: "Results & photos",
    desc: "Capture your after photos + measurements.",
  },
  {
    key: "feedback",
    title: "Feedback & ratings",
    desc: "How did the programme land for you?",
  },
  {
    key: "consent",
    title: "Consents & next steps",
    desc: "Can we celebrate you? And what's next?",
  },
];

/** 0–10 NPS selector. */
function Scale010({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 11 }, (_, n) => n).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={`w-9 h-10 rounded-lg border font-heading text-sm transition ${
            value === String(n)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function FinalCheckin({
  client,
  cohort,
  onDone,
}: {
  client: AccClient;
  cohort: AccCohort;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [afterFront, setAfterFront] = useState<string | null>(null);
  const [afterSide, setAfterSide] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, any>>({});

  const set = (k: string, v: any) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) return;
    (async () => {
      const existing = await getMyCheckin(client.id, 6);
      if (existing) {
        setF({ ...existing.responses });
        setSubmitted(true);
        setAfterFront(existing.responses.afterFront || null);
        setAfterSide(existing.responses.afterSide || null);
      } else {
        setF({});
        setSubmitted(false);
        setAfterFront(null);
        setAfterSide(null);
      }
    })();
  }, [open, client.id]);

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
      const path = `nutrition-photos/${user.id}/acc-after-${which}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (which === "front") setAfterFront(data.publicUrl);
      else setAfterSide(data.publicUrl);
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
      const afterMeasurements = {
        weight: f.m_weight ? Number(f.m_weight) : null,
        chest: f.m_chest ? Number(f.m_chest) : null,
        waist: f.m_waist ? Number(f.m_waist) : null,
        bodyFat: f.m_bodyFat ? Number(f.m_bodyFat) : null,
        thigh: f.m_thigh ? Number(f.m_thigh) : null,
        tummy: f.m_tummy ? Number(f.m_tummy) : null,
      };
      const responses = {
        ...f,
        afterFront,
        afterSide,
        afterMeasurements,
      };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await saveCheckin({
        clientId: client.id,
        userId: user.id,
        cohortId: cohort.id,
        weekNumber: 6,
        responses,
      });
      if (error) throw error;

      // Write outcome fields to acc_clients.
      const results = {
        nps: f.q19 ? Number(f.q19) : null,
        consent_photos: f.q20 || null,
        consent_testimonial: f.q21 || null,
        testimonial_willing: f.q11 || null,
        referrals: f.q23 || null,
        afterPhotos: [afterFront, afterSide].filter(Boolean),
        afterMeasurements,
      };
      const { error: ocErr } = await saveFinalOutcome(client.id, {
        results,
        maintenanceTier: f.maintenance_tier || null,
        resignOutcome: f.q22 || null,
      });
      if (ocErr) console.warn("final outcome save failed", ocErr);

      toast.success("Final check-in submitted — what a journey 🎉");
      setSubmitted(true);
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

  return (
    <>
      <Button
        onClick={start}
        variant={submitted ? "outline" : "default"}
        className="gap-2 w-full"
      >
        <Trophy className="h-4 w-4" />
        {submitted ? "Final review done ✓" : "Complete your final review"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5">
                {section + 1}/{SECTIONS.length}
              </span>
              <Trophy className="w-4 h-4 text-primary" />
              {sec.title}
            </DialogTitle>
            <DialogDescription>{sec.desc}</DialogDescription>
          </DialogHeader>

          <div className="h-1 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((section + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-5 py-2">
            {section === 0 && (
              <>
                <div>
                  <QLabel n={1}>Day-1 photo vs today — what do you see?</QLabel>
                  <LongText value={f.q1 || ""} onChange={(v) => set("q1", v)} />
                </div>
                <div>
                  <QLabel n={2}>Energy now</QLabel>
                  <Scale05 value={f.q2 || ""} onChange={(v) => set("q2", v)} />
                </div>
                <div>
                  <QLabel n={3}>Sleep quality now</QLabel>
                  <Scale05 value={f.q3 || ""} onChange={(v) => set("q3", v)} />
                </div>
                <div>
                  <QLabel n={4}>Confidence in yourself now</QLabel>
                  <Scale05 value={f.q4 || ""} onChange={(v) => set("q4", v)} />
                </div>
                <div>
                  <QLabel n={5}>Cravings & snacking vs 6 weeks ago</QLabel>
                  <SingleSelect
                    options={[
                      "Much worse",
                      "A bit worse",
                      "Same",
                      "A bit better",
                      "Much better",
                    ]}
                    value={f.q5 || ""}
                    onChange={(v) => set("q5", v)}
                  />
                </div>
                <div>
                  <QLabel n={6}>How do clothes fit vs Day 1?</QLabel>
                  <ShortText
                    value={f.q6 || ""}
                    onChange={(v) => set("q6", v)}
                  />
                </div>
                <div>
                  <QLabel n={7}>
                    What can you do / feel / wear now that you couldn't?
                  </QLabel>
                  <LongText value={f.q7 || ""} onChange={(v) => set("q7", v)} />
                </div>
                <div>
                  <QLabel n={8}>What surprised you most?</QLabel>
                  <LongText value={f.q8 || ""} onChange={(v) => set("q8", v)} />
                </div>
                <div>
                  <QLabel n={9}>Biggest change to your day-to-day?</QLabel>
                  <LongText value={f.q9 || ""} onChange={(v) => set("q9", v)} />
                </div>
                <div>
                  <QLabel n={10}>
                    If a friend was on the fence, what would you say?
                  </QLabel>
                  <LongText
                    value={f.q10 || ""}
                    onChange={(v) => set("q10", v)}
                  />
                </div>
                <div>
                  <QLabel n={11}>
                    Keen to record a 30–60s voice note / video? (optional)
                  </QLabel>
                  <SingleSelect
                    options={["Yes", "No"]}
                    value={f.q11 || ""}
                    onChange={(v) => set("q11", v)}
                  />
                </div>
              </>
            )}

            {section === 1 && (
              <>
                <div>
                  <QLabel n={12}>Which habit changed the most?</QLabel>
                  <SingleSelect
                    options={[
                      "Mindset",
                      "Plate",
                      "Protein",
                      "Steps",
                      "Hydration",
                      "Rhythm",
                    ]}
                    value={f.q12 || ""}
                    onChange={(v) => set("q12", v)}
                  />
                </div>
                <div>
                  <QLabel n={13}>One habit you're keeping for good?</QLabel>
                  <ShortText
                    value={f.q13 || ""}
                    onChange={(v) => set("q13", v)}
                  />
                </div>
                <div>
                  <QLabel n={14}>
                    Confidence to keep these going on your own
                  </QLabel>
                  <Scale05
                    value={f.q14 || ""}
                    onChange={(v) => set("q14", v)}
                  />
                </div>

                {/* After photos + measurements */}
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-semibold mb-2">
                    After photos (front + side)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["front", "side"] as const).map((which) => {
                      const url = which === "front" ? afterFront : afterSide;
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Weight (kg)
                    </Label>
                    <NumberField
                      value={f.m_weight || ""}
                      onChange={(v) => set("m_weight", v)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Chest (cm)
                    </Label>
                    <NumberField
                      value={f.m_chest || ""}
                      onChange={(v) => set("m_chest", v)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Waist (cm)
                    </Label>
                    <NumberField
                      value={f.m_waist || ""}
                      onChange={(v) => set("m_waist", v)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Body fat %
                    </Label>
                    <NumberField
                      value={f.m_bodyFat || ""}
                      onChange={(v) => set("m_bodyFat", v)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Thigh (cm)
                    </Label>
                    <NumberField
                      value={f.m_thigh || ""}
                      onChange={(v) => set("m_thigh", v)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">
                      Tummy (cm)
                    </Label>
                    <NumberField
                      value={f.m_tummy || ""}
                      onChange={(v) => set("m_tummy", v)}
                    />
                  </div>
                </div>
              </>
            )}

            {section === 2 && (
              <>
                <div>
                  <QLabel n={15}>
                    Overall, how would you rate the programme?
                  </QLabel>
                  <Scale05
                    value={f.q15 || ""}
                    onChange={(v) => set("q15", v)}
                  />
                </div>
                <div>
                  <QLabel n={16}>What did you love most?</QLabel>
                  <LongText
                    value={f.q16 || ""}
                    onChange={(v) => set("q16", v)}
                  />
                </div>
                <div>
                  <QLabel n={17}>What could we improve / add?</QLabel>
                  <LongText
                    value={f.q17 || ""}
                    onChange={(v) => set("q17", v)}
                  />
                </div>
                <div>
                  <QLabel n={18}>
                    Anything you wanted more support / info on?
                  </QLabel>
                  <LongText
                    value={f.q18 || ""}
                    onChange={(v) => set("q18", v)}
                  />
                </div>
                <div>
                  <QLabel n={19}>
                    How likely are you to recommend to a friend?
                  </QLabel>
                  <Scale010
                    value={f.q19 || ""}
                    onChange={(v) => set("q19", v)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = not at all, 10 = absolutely
                  </p>
                </div>
              </>
            )}

            {section === 3 && (
              <>
                <div>
                  <QLabel n={20}>
                    Can we share your before/after photos in marketing?
                  </QLabel>
                  <SingleSelect
                    options={["Yes", "No"]}
                    value={f.q20 || ""}
                    onChange={(v) => set("q20", v)}
                  />
                </div>
                <div>
                  <QLabel n={21}>
                    Can we use your written feedback as a testimonial (first
                    name only)?
                  </QLabel>
                  <SingleSelect
                    options={["Yes", "No"]}
                    value={f.q21 || ""}
                    onChange={(v) => set("q21", v)}
                  />
                </div>
                <div>
                  <QLabel n={22}>
                    Would you like to carry on / keep momentum?
                  </QLabel>
                  <SingleSelect
                    options={["Yes tell me more", "Maybe", "No"]}
                    value={f.q22 || ""}
                    onChange={(v) => set("q22", v)}
                  />
                </div>
                <div>
                  <QLabel n={23}>
                    Anyone you'd recommend for the next round?
                  </QLabel>
                  <ShortText
                    value={f.q23 || ""}
                    onChange={(v) => set("q23", v)}
                    placeholder="Names / emails…"
                  />
                </div>

                {/* Sliding Scale of Motivation */}
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-semibold mb-2">
                    Sliding Scale of Motivation — where are you landing?
                  </p>
                  <SingleSelect
                    options={[
                      "High — all 3 habits + tracking",
                      "Middle — 3 habits, no numbers",
                      "Low — one non-negotiable",
                    ]}
                    value={f.maintenance_tier || ""}
                    onChange={(v) => set("maintenance_tier", v)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This shapes how we support you after the programme.
                  </p>
                </div>

                <div>
                  <QLabel n={24}>Anything else you want to say?</QLabel>
                  <LongText
                    value={f.q24 || ""}
                    onChange={(v) => set("q24", v)}
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
              <ChevronLeft className="w-4 w-4" />
              {section === 0 ? "Cancel" : "Back"}
            </Button>
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
                    <Check className="w-4 h-4" /> Submit final review
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
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FinalCheckin;
