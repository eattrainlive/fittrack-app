import {
  ShortText,
  LongText,
  NumberField,
  Scale05,
  MultiSelect,
  SingleSelect,
  QLabel,
} from "./onboardingFields";
import { Camera } from "lucide-react";

interface SectionProps {
  section: number;
  f: Record<string, any>;
  set: (k: string, v: any) => void;
  photoFront: string | null;
  photoSide: string | null;
  busy: boolean;
  handlePhoto: (
    e: React.ChangeEvent<HTMLInputElement>,
    which: "front" | "side",
  ) => void;
}

export function OnboardingSection({
  section,
  f,
  set,
  photoFront,
  photoSide,
  busy,
  handlePhoto,
}: SectionProps) {
  if (section === 0) {
    return (
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
            How would hitting this affect work / family / confidence / social /
            health?
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
    );
  }

  if (section === 1) {
    return (
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
          <QLabel n={9}>A specific date / event you're working towards?</QLabel>
          <ShortText
            value={f.q9 || ""}
            onChange={(v) => set("q9", v)}
            placeholder="e.g. holiday in June, birthday…"
          />
        </div>
      </>
    );
  }

  if (section === 2) {
    return (
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
          <NumberField value={f.q12 || ""} onChange={(v) => set("q12", v)} />
        </div>
        <div>
          <QLabel n={13}>Waist (cm)</QLabel>
          <NumberField value={f.q13 || ""} onChange={(v) => set("q13", v)} />
        </div>
        <div>
          <QLabel n={14}>Body fat % (Evolt)</QLabel>
          <NumberField value={f.q14 || ""} onChange={(v) => set("q14", v)} />
        </div>
        <div>
          <QLabel n={15}>Thigh (cm)</QLabel>
          <NumberField value={f.q15 || ""} onChange={(v) => set("q15", v)} />
        </div>
        <div className="col-span-2">
          <QLabel n={16}>Tummy (cm)</QLabel>
          <NumberField value={f.q16 || ""} onChange={(v) => set("q16", v)} />
        </div>
      </div>
    );
  }

  if (section === 3) {
    return (
      <>
        <div>
          <QLabel n={17}>How would you prefer to track progress?</QLabel>
          <MultiSelect
            options={["Measurements", "Weight", "Photos", "How clothes fit"]}
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
          <Scale05 value={f.q19 || ""} onChange={(v) => set("q19", v)} />
          <p className="text-xs text-muted-foreground mt-1">
            0 = exhausted, 5 = buzzing
          </p>
        </div>
      </>
    );
  }

  if (section === 4) {
    return (
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
          <QLabel n={22}>How often a good protein source at each meal?</QLabel>
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
          <QLabel n={27}>Foods you love & want to keep / can't stand?</QLabel>
          <ShortText value={f.q27 || ""} onChange={(v) => set("q27", v)} />
        </div>
      </>
    );
  }

  if (section === 5) {
    return (
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
          <QLabel n={29}>Job mostly: sitting / on your feet / active?</QLabel>
          <SingleSelect
            options={["Sitting", "On your feet", "Active"]}
            value={f.q29 || ""}
            onChange={(v) => set("q29", v)}
          />
        </div>
        <div>
          <QLabel n={30}>Currently exercise / train? What & days/week?</QLabel>
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
    );
  }

  if (section === 6) {
    return (
      <>
        <div>
          <QLabel n={32}>Stress level right now</QLabel>
          <Scale05 value={f.q32 || ""} onChange={(v) => set("q32", v)} />
          <p className="text-xs text-muted-foreground mt-1">
            0 = chilled, 5 = overwhelmed
          </p>
        </div>
        <div>
          <QLabel n={33}>What does a typical week look like?</QLabel>
          <LongText value={f.q33 || ""} onChange={(v) => set("q33", v)} />
        </div>
        <div>
          <QLabel n={34}>
            What have you tried before? What worked / didn't?
          </QLabel>
          <LongText value={f.q34 || ""} onChange={(v) => set("q34", v)} />
        </div>
        <div>
          <QLabel n={35}>When you've fallen off track, what caused it?</QLabel>
          <LongText value={f.q35 || ""} onChange={(v) => set("q35", v)} />
        </div>
        <div>
          <QLabel n={36}>What do you STOP doing when slipping?</QLabel>
          <ShortText value={f.q36 || ""} onChange={(v) => set("q36", v)} />
        </div>
        <div>
          <QLabel n={37}>
            When you're doing well, what's usually in place?
          </QLabel>
          <ShortText value={f.q37 || ""} onChange={(v) => set("q37", v)} />
        </div>
      </>
    );
  }

  // section === 7
  return (
    <>
      <div>
        <QLabel n={38}>Confidence to stick to daily habits for 6 weeks</QLabel>
        <Scale05 value={f.q38 || ""} onChange={(v) => set("q38", v)} />
      </div>
      <div>
        <QLabel n={39}>Plate method (no tracking) vs precise tracking?</QLabel>
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
          options={["Gentle nudges", "Firm push", "Data review", "Group"]}
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

      {/* Optional: which tracking app (if any). Does NOT affect the 5 required items. */}
      <div className="pt-2 border-t border-border">
        <QLabel n={42}>If you track your food, which app do you use?</QLabel>
        <SingleSelect
          options={["MyFitnessPal", "Nutracheck", "Other", "I don't track"]}
          value={f.trackingAppLabel || ""}
          onChange={(v) => {
            set("trackingAppLabel", v);
            if (v === "MyFitnessPal") set("tracking_app", "mfp");
            else if (v === "Nutracheck") set("tracking_app", "nutracheck");
            else if (v === "Other") set("tracking_app", "other");
            else if (v === "I don't track") set("tracking_app", "none");
          }}
        />
        {f.tracking_app === "mfp" && (
          <div className="mt-2 space-y-1">
            <ShortText
              value={f.mfp_username || ""}
              onChange={(v) => set("mfp_username", v)}
              placeholder="Your MyFitnessPal username"
            />
            <p className="text-xs text-muted-foreground">
              Set your diary to Public (MyFitnessPal → Settings → Diary Settings
              → Public) so your coach can view it.
            </p>
          </div>
        )}
        {f.tracking_app === "other" && (
          <div className="mt-2">
            <ShortText
              value={f.tracking_app_other || ""}
              onChange={(v) => set("tracking_app_other", v)}
              placeholder="Which app?"
            />
          </div>
        )}
      </div>

      <div>
        <QLabel n={43}>Anything else you want me to know?</QLabel>
        <LongText value={f.q42 || ""} onChange={(v) => set("q42", v)} />
      </div>
    </>
  );
}
