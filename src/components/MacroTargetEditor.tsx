// Reusable calorie + macro target editor. Macros can be entered in grams OR as
// a % of calories (grams derived). Used by both the member (Nutrition page) and
// staff (Member Activity modal). Calls onSave with final GRAMS values.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";

const KPG = { p: 4, c: 4, f: 9 } as const;

export interface MacroTargets {
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
}

export function MacroTargetEditor({
  initial,
  onSave,
  onCancel,
  saving = false,
  saveLabel = "Save targets",
}: {
  initial: Partial<MacroTargets>;
  onSave: (v: MacroTargets) => void;
  onCancel?: () => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  const [cal, setCal] = useState(String(initial.calorie_target ?? ""));
  const [mode, setMode] = useState<"g" | "%">("g");
  // Values are held in the CURRENT unit (grams or %).
  const [p, setP] = useState(String(initial.protein_target ?? ""));
  const [c, setC] = useState(String(initial.carb_target ?? ""));
  const [f, setF] = useState(String(initial.fat_target ?? ""));

  const calNum = Number(cal) || 0;

  // Grams for whichever mode we're in.
  const grams = useMemo(() => {
    const toG = (val: string, k: number) => {
      const n = Number(val) || 0;
      return mode === "g" ? Math.round(n) : Math.round(((n / 100) * calNum) / k);
    };
    return {
      p: toG(p, KPG.p),
      c: toG(c, KPG.c),
      f: toG(f, KPG.f),
    };
  }, [p, c, f, mode, calNum]);

  const pctSum =
    mode === "%" ? (Number(p) || 0) + (Number(c) || 0) + (Number(f) || 0) : null;
  const calFromMacros = grams.p * KPG.p + grams.c * KPG.c + grams.f * KPG.f;

  const switchMode = (next: "g" | "%") => {
    if (next === mode) return;
    if (next === "%") {
      // grams → %
      const pct = (val: string, k: number) => {
        const g = Number(val) || 0;
        return calNum > 0 ? String(Math.round(((g * k) / calNum) * 100)) : "";
      };
      setP(pct(p, KPG.p));
      setC(pct(c, KPG.c));
      setF(pct(f, KPG.f));
    } else {
      // % → grams (use current computed grams)
      setP(String(grams.p));
      setC(String(grams.c));
      setF(String(grams.f));
    }
    setMode(next);
  };

  const field = (
    label: string,
    val: string,
    set: (s: string) => void,
    g: number,
  ) => (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={val}
          onChange={(e) => set(e.target.value)}
          className="h-9 pr-8"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {mode}
        </span>
      </div>
      {mode === "%" && <p className="text-[10px] text-muted-foreground">= {g}g</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">
          Calorie target (kcal)
        </Label>
        <Input
          type="number"
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          placeholder="e.g. 2000"
          className="h-9"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">Macros</Label>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["g", "%"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => switchMode(u)}
              className={`px-3 py-1 font-bold ${
                mode === u
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {u === "g" ? "grams" : "%"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {field("Protein", p, setP, grams.p)}
        {field("Carbs", c, setC, grams.c)}
        {field("Fat", f, setF, grams.f)}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Macros ≈ {calFromMacros} kcal
        {calNum > 0 && Math.abs(calFromMacros - calNum) > 50 && (
          <span className="text-amber-600">
            {" "}
            · {calFromMacros > calNum ? "over" : "under"} target by{" "}
            {Math.abs(calFromMacros - calNum)}
          </span>
        )}
        {mode === "%" && pctSum != null && (
          <span className={pctSum !== 100 ? " text-amber-600" : ""}>
            {" "}
            · {pctSum}% total
          </span>
        )}
      </p>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
        <Button
          className="flex-1 gap-1.5"
          disabled={saving}
          onClick={() =>
            onSave({
              calorie_target: calNum,
              protein_target: grams.p,
              carb_target: grams.c,
              fat_target: grams.f,
            })
          }
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" /> {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
