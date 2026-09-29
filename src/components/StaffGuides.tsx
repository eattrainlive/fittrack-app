/**
 * Staff Guides — a staff-only "How-to Guides" area in the Coaching Hub.
 * Reads/writes the `staff_guides` table (RLS-locked to staff). Self-contained:
 * folder list, markdown guide view with embedded video, add/edit/delete, search.
 */
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { getEmbedUrl } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  Search,
  Loader2,
  Video,
} from "lucide-react";

export interface StaffGuide {
  id: string;
  title: string;
  category: string;
  body: string;
  video_url: string | null;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ── minimal markdown renderer (mirrors CoachAiChat) ── */
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderInline = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

function GuideBody({ body }: { body: string }) {
  const lines = (body || "").split("\n");
  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      blocks.push(
        `<${tag} class="ml-5 my-1 space-y-1">${list.items
          .map((it) => `<li>${renderInline(it)}</li>`)
          .join("")}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = escapeHtml(raw.trimEnd());
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      const cls =
        lvl <= 1
          ? "font-heading font-bold text-xl mt-4 mb-2"
          : lvl === 2
            ? "font-heading font-semibold text-lg mt-3 mb-1.5"
            : lvl === 3
              ? "font-semibold text-base mt-2 mb-1"
              : "font-medium text-sm mt-2 mb-1";
      blocks.push(`<p class="${cls}">${renderInline(h[2])}</p>`);
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    flush();
    blocks.push(`<p class="leading-relaxed my-1.5">${renderInline(line)}</p>`);
  }
  flush();

  return (
    <div
      className="text-sm text-foreground/90 [&_ol]:list-decimal [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: blocks.join("") }}
    />
  );
}

/* ── empty editor form ── */
const emptyGuide = (): Omit<
  StaffGuide,
  "id" | "updated_by" | "created_at" | "updated_at"
> => ({
  title: "",
  category: "",
  body: "",
  video_url: "",
  sort_order: 0,
});

export function StaffGuides() {
  const [guides, setGuides] = useState<StaffGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGuide, setOpenGuide] = useState<StaffGuide | null>(null);
  const [query, setQuery] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StaffGuide | null>(null);
  const [form, setForm] = useState(emptyGuide());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_guides")
        .select("*")
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      setGuides((data as StaffGuide[]) || []);
    } catch (e: any) {
      toast.error("Could not load guides", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, StaffGuide[]>();
    for (const g of guides) {
      const key = g.category || "Uncategorised";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [guides]);

  const existingCategories = useMemo(
    () => [...new Set(guides.map((g) => g.category).filter(Boolean))].sort(),
    [guides],
  );

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map(
        ([cat, list]) =>
          [
            cat,
            list.filter(
              (g) =>
                g.title.toLowerCase().includes(q) ||
                g.body.toLowerCase().includes(q),
            ),
          ] as [string, StaffGuide[]],
      )
      .filter(([, list]) => list.length > 0);
  }, [categories, query]);

  const openEditor = (g: StaffGuide | null) => {
    setEditing(g);
    setForm(
      g
        ? {
            title: g.title,
            category: g.category,
            body: g.body,
            video_url: g.video_url || "",
            sort_order: g.sort_order,
          }
        : emptyGuide(),
    );
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Please add a title");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || "Getting started",
        body: form.body,
        video_url: form.video_url?.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) {
        const { error } = await supabase
          .from("staff_guides")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Guide updated");
      } else {
        const { error } = await supabase.from("staff_guides").insert(payload);
        if (error) throw error;
        toast.success("Guide added");
      }
      setEditorOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Could not save guide", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: StaffGuide) => {
    if (!confirm(`Delete "${g.title}"? This can't be undone.`)) return;
    try {
      const { error } = await supabase
        .from("staff_guides")
        .delete()
        .eq("id", g.id);
      if (error) throw error;
      toast.success("Guide deleted");
      if (openGuide?.id === g.id) setOpenGuide(null);
      await load();
    } catch (e: any) {
      toast.error("Could not delete guide", { description: e?.message });
    }
  };

  /* ── single guide reading view ── */
  if (openGuide) {
    const embed = openGuide.video_url ? getEmbedUrl(openGuide.video_url) : null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setOpenGuide(null)}
          >
            <ChevronLeft className="h-4 w-4" /> All guides
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => openEditor(openGuide)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive"
              onClick={() => remove(openGuide)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="text-xs text-muted-foreground">
              {openGuide.category}
            </div>
            <CardTitle className="text-2xl">{openGuide.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {embed && (
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-border bg-black">
                <iframe
                  src={embed}
                  title={openGuide.title}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <GuideBody body={openGuide.body} />
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Updated{" "}
              {new Date(openGuide.updated_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>

        <GuideEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          form={form}
          setForm={setForm}
          existingCategories={existingCategories}
          saving={saving}
          onSave={save}
          editing={editing}
        />
      </div>
    );
  }

  /* ── folder list view ── */
  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Staff Guides</CardTitle>
              <CardDescription>
                How-to guides for running the app. Staff only.
              </CardDescription>
            </div>
            <Button className="gap-2" onClick={() => openEditor(null)}>
              <Plus className="h-4 w-4" /> Add guide
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides…"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {query
                ? "No guides match your search."
                : 'No guides yet. Click "Add guide" to create your first one.'}
            </p>
          ) : (
            <div className="space-y-5">
              {filteredCategories.map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {cat}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setOpenGuide(g)}
                        className="text-left flex items-start gap-3 rounded-xl border border-border bg-background hover:bg-accent/40 p-3 transition group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-snug group-hover:text-primary">
                            {g.title}
                          </div>
                          {g.video_url && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Video className="h-3 w-3" /> Video
                            </div>
                          )}
                        </div>
                        <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground shrink-0 mt-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GuideEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        form={form}
        setForm={setForm}
        existingCategories={existingCategories}
        saving={saving}
        onSave={save}
        editing={editing}
      />
    </div>
  );
}

/* ── editor dialog ── */
function GuideEditor({
  open,
  onOpenChange,
  form,
  setForm,
  existingCategories,
  saving,
  onSave,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: Omit<StaffGuide, "id" | "updated_by" | "created_at" | "updated_at">;
  setForm: (
    v: Omit<StaffGuide, "id" | "updated_by" | "created_at" | "updated_at">,
  ) => void;
  existingCategories: string[];
  saving: boolean;
  onSave: () => void;
  editing: StaffGuide | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{editing ? "Edit guide" : "Add guide"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. How to assign a programme"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Programming"
                list="staff-guide-categories"
              />
              <datalist id="staff-guide-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Body (Markdown)</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={
                "# Heading\n\nWrite the guide in **markdown**. Supports:\n- bullet lists\n- `code`"
              }
              className="min-h-[260px] font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label>Video URL (optional)</Label>
            <Input
              value={form.video_url || ""}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="Loom or YouTube link"
            />
            <p className="text-[11px] text-muted-foreground">
              Embedded above the text on the guide page.
            </p>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add guide"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StaffGuides;
