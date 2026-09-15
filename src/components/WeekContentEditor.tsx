import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  getAllWeekContent,
  updateWeekContent,
  type AccWeekContent,
  type AccWeekResource,
} from "@/lib/accWeekContent";

const WEEK_LABEL = (n: number) => (n === 0 ? "Onboarding info" : `Week ${n}`);

export function WeekContentEditor() {
  const [rows, setRows] = useState<AccWeekContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<AccWeekContent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setRows(await getAllWeekContent());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (r: AccWeekContent) => {
    setEditing(r.week_number);
    setDraft({
      ...r,
      resources: Array.isArray(r.resources) ? [...r.resources] : [],
    });
  };

  const cancel = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const { error } = await updateWeekContent(draft.week_number, {
      title: draft.title,
      theme: draft.theme,
      habit: draft.habit,
      teaching: draft.teaching,
      video_url: draft.video_url,
      resources: draft.resources,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't save: " + (error.message || "error"));
      return;
    }
    toast.success(`${WEEK_LABEL(draft.week_number)} content saved`);
    cancel();
    load();
  };

  const addResource = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      resources: [...draft.resources, { title: "", url: "" }],
    });
  };

  const updateResource = (
    i: number,
    field: keyof AccWeekResource,
    val: string,
  ) => {
    if (!draft) return;
    const resources = draft.resources.map((r, idx) =>
      idx === i ? { ...r, [field]: val } : r,
    );
    setDraft({ ...draft, resources });
  };

  const removeResource = (i: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      resources: draft.resources.filter((_, idx) => idx !== i),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-xl tracking-wider">
          Programme content
        </h3>
        <p className="text-sm text-muted-foreground">
          Author the teaching, video and resources for each week. Reused across
          every cohort.
        </p>
      </div>

      {rows.map((r) => {
        const isEditing = editing === r.week_number;
        const hasContent =
          r.teaching || r.video_url || (r.resources && r.resources.length > 0);
        return (
          <Card key={r.week_number} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {WEEK_LABEL(r.week_number)}
                  </Badge>
                  <CardTitle className="text-base">
                    {r.title || r.theme}
                  </CardTitle>
                  {!hasContent && (
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      No content yet
                    </Badge>
                  )}
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(r)}
                    className="gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            {isEditing && draft ? (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                      placeholder="e.g. Foundations"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Theme</Label>
                    <Input
                      value={draft.theme}
                      onChange={(e) =>
                        setDraft({ ...draft, theme: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Habit</Label>
                    <Input
                      value={draft.habit}
                      onChange={(e) =>
                        setDraft({ ...draft, habit: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Teaching (client-facing lesson)
                  </Label>
                  <Textarea
                    value={draft.teaching}
                    onChange={(e) =>
                      setDraft({ ...draft, teaching: e.target.value })
                    }
                    rows={5}
                    placeholder="The lesson copy the client reads this week…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Video URL (Loom / YouTube / Vimeo)
                  </Label>
                  <Input
                    value={draft.video_url}
                    onChange={(e) =>
                      setDraft({ ...draft, video_url: e.target.value })
                    }
                    placeholder="https://www.loom.com/share/…"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Resources</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addResource}
                      className="gap-1 h-7 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add link
                    </Button>
                  </div>
                  {draft.resources.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No resources yet.
                    </p>
                  )}
                  <div className="space-y-2">
                    {draft.resources.map((res, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={res.title}
                          onChange={(e) =>
                            updateResource(i, "title", e.target.value)
                          }
                          placeholder="Title"
                          className="flex-1"
                        />
                        <Input
                          value={res.url}
                          onChange={(e) =>
                            updateResource(i, "url", e.target.value)
                          }
                          placeholder="https://…"
                          className="flex-[2]"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeResource(i)}
                          className="px-2"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancel}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={busy}
                    className="gap-1"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="pt-0 space-y-1.5">
                {r.teaching ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {r.teaching}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No teaching copy yet.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {r.video_url && (
                    <Badge variant="outline" className="text-xs">
                      Video set
                    </Badge>
                  )}
                  {r.resources && r.resources.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {r.resources.length} resource
                      {r.resources.length === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default WeekContentEditor;
