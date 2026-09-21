/**
 * Editable structured tags for an exercise — movement_pattern, movement_family,
 * role, unilateral, is_compound, contraindications, primary_muscles.
 *
 * Self-contained so it can be dropped into both the edit-exercise dialog and
 * the add-exercise form in Admin.tsx without bloating that component.
 *
 * `value` is the exercise object; `onChange` returns a partial patch the parent
 * merges into its state.
 */
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MOVEMENT_PATTERNS,
  EXERCISE_ROLES,
  CONTRAINDICATIONS,
} from "@/lib/exerciseTags";

interface ExerciseTagsEditorProps {
  value: any;
  onChange: (patch: Record<string, any>) => void;
  /** Existing movement_family values for autocomplete suggestions. */
  existingFamilies?: string[];
}

const toArr = (v: any): string[] =>
  Array.isArray(v)
    ? v.map((s) => String(s).trim()).filter(Boolean)
    : v == null
      ? []
      : String(v)
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);

export const ExerciseTagsEditor = ({
  value,
  onChange,
  existingFamilies = [],
}: ExerciseTagsEditorProps) => {
  const families = useMemo(
    () =>
      Array.from(
        new Set([
          ...(existingFamilies || []).filter(Boolean),
          ...toArr(value?.movement_family),
        ]),
      ).sort(),
    [existingFamilies, value?.movement_family],
  );

  const contra = toArr(value?.contraindications);
  const muscles = toArr(value?.primary_muscles);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Structured tags (smart-alternates & variety)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Movement pattern</Label>
          <Select
            value={value?.movement_pattern || "_none"}
            onValueChange={(v) =>
              onChange({ movement_pattern: v === "_none" ? null : v })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— none —</SelectItem>
              {MOVEMENT_PATTERNS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Role</Label>
          <Select
            value={value?.role || "_none"}
            onValueChange={(v) => onChange({ role: v === "_none" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— none —</SelectItem>
              {EXERCISE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Movement family</Label>
          <Input
            list="movement-family-list"
            value={value?.movement_family || ""}
            onChange={(e) => onChange({ movement_family: e.target.value })}
            placeholder="e.g. glute_bridge"
            className="h-9"
          />
          <datalist id="movement-family-list">
            {families.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Primary muscles (comma-separated)</Label>
          <Input
            value={muscles.join(", ")}
            onChange={(e) =>
              onChange({ primary_muscles: toArr(e.target.value) })
            }
            placeholder="e.g. glutes, hamstrings"
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Switch
            checked={!!value?.unilateral}
            onCheckedChange={(c) => onChange({ unilateral: c })}
          />
          <Label className="text-sm">Unilateral</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!value?.is_compound}
            onCheckedChange={(c) => onChange({ is_compound: c })}
          />
          <Label className="text-sm">Compound</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Contraindications</Label>
        <div className="flex flex-wrap gap-4 pt-1">
          {CONTRAINDICATIONS.map((c) => (
            <div key={c} className="flex items-center space-x-2">
              <Checkbox
                id={`contra-${c}`}
                checked={contra.includes(c)}
                onCheckedChange={(checked) => {
                  let next = [...contra];
                  if (checked && !next.includes(c)) next.push(c);
                  else if (!checked) next = next.filter((x) => x !== c);
                  onChange({ contraindications: next });
                }}
              />
              <label
                htmlFor={`contra-${c}`}
                className="text-sm font-medium leading-none"
              >
                {c.replace(/_/g, " ")}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
