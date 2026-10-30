// Staff view/edit of a member's calorie & macro targets (Member Activity modal).
// Reads via mm_staff_read; writes via staff_set_member_macros RPC (coach_set=true).
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  getMemberMacrosFor,
  staffSetMemberMacros,
  type MemberMacrosRow,
} from "@/lib/memberMacrosAdmin";
import { MacroTargetEditor, type MacroTargets } from "@/components/MacroTargetEditor";

export function CoachMacroTargets({ memberUserId }: { memberUserId: string }) {
  const [row, setRow] = useState<MemberMacrosRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getMemberMacrosFor(memberUserId)
      .then(setRow)
      .finally(() => setLoading(false));
  };
  useEffect(load, [memberUserId]);

  const save = async (v: MacroTargets) => {
    setSaving(true);
    const res = await staffSetMemberMacros(memberUserId, v);
    setSaving(false);
    if (res.success) {
      toast.success("Targets saved");
      setEditing(false);
      load();
    } else {
      console.error("staffSetMemberMacros failed for", memberUserId, res.error);
      toast.error(res.error?.message || "Couldn't save targets");
    }
  };

  const has = row && (row.calorie_target || row.protein_target);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Macro targets
        </p>
        {!editing && !loading && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" /> {has ? "Edit" : "Set"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : editing ? (
        <div className="border border-border rounded-lg p-3">
          <MacroTargetEditor
            initial={row ?? {}}
            onSave={save}
            onCancel={() => setEditing(false)}
            saving={saving}
            saveLabel="Save (coach)"
          />
        </div>
      ) : has ? (
        <div className="border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-heading">{row!.calorie_target}</span>
            <span className="text-xs text-muted-foreground">kcal/day</span>
            {row!.coach_set && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                Coach set
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            P {row!.protein_target}g · C {row!.carb_target}g · F{" "}
            {row!.fat_target}g
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">
          No targets set yet. Tap "Set" to add them.
        </p>
      )}
    </div>
  );
}
