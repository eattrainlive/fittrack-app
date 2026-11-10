// Staff Hub — daily checklists (opening / closing / cleaning). Items reset each
// day; ticking stamps who did it and when. Staff manage the template list.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, CheckCircle2, Circle, Trash2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { staffName } from "@/components/staffHubShared";
import {
  getChecklists,
  tickChecklist,
  untickChecklist,
  addChecklistItem,
  removeChecklistItem,
  SECTION_LABEL,
  type ChecklistState,
  type ChecklistSection,
} from "@/lib/staffBoards";

const SECTIONS: ChecklistSection[] = ["opening", "closing", "cleaning", "general"];

export function DailyChecklists() {
  const [items, setItems] = useState<ChecklistState[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState<ChecklistSection>("opening");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getChecklists());
    } catch {
      toast.error("Couldn't load checklists");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (it: ChecklistState) => {
    if (it.doneToday && it.logId) await untickChecklist(it.logId);
    else {
      const r = await tickChecklist(it.id, staffName() || "Staff");
      if (!r.ok) return toast.error(r.error || "Couldn't update");
    }
    load();
  };

  const add = async () => {
    if (!newTitle.trim()) return;
    const r = await addChecklistItem({ title: newTitle, section: newSection });
    if (r.ok) {
      setNewTitle("");
      load();
    } else toast.error(r.error || "Couldn't add");
  };

  const doneCount = items.filter((i) => i.doneToday).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ListChecks className="h-5 w-5" /> Daily checklists
        </h2>
        <p className="text-sm text-muted-foreground">
          {doneCount}/{items.length} done today · resets at midnight
        </p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="New checklist item" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <select
          value={newSection}
          onChange={(e) => setNewSection(e.target.value as ChecklistSection)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shrink-0"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {SECTION_LABEL[s]}
            </option>
          ))}
        </select>
        <Button className="gap-1 shrink-0" onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklist items yet. Add your opening/closing jobs above.</p>
      ) : (
        SECTIONS.filter((sec) => items.some((i) => i.section === sec)).map((sec) => (
          <div key={sec} className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {SECTION_LABEL[sec]}
            </h3>
            {items
              .filter((i) => i.section === sec)
              .map((it) => (
                <div key={it.id} className="rounded-lg border border-border bg-card p-2.5 flex items-center gap-3">
                  <button onClick={() => toggle(it)} className="shrink-0">
                    {it.doneToday ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${it.doneToday ? "line-through text-muted-foreground" : ""}`}>{it.title}</p>
                    {it.doneToday && it.doneBy && (
                      <p className="text-[10px] text-muted-foreground">Done by {it.doneBy}</p>
                    )}
                  </div>
                  <button className="text-muted-foreground shrink-0" onClick={() => removeChecklistItem(it.id).then(load)} title="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        ))
      )}
    </div>
  );
}

export default DailyChecklists;
