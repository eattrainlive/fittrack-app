// Staff newsletter builder: create issues from blocks, publish, copy the
// shareable /n/<slug> link the GHL email points at. Output renders on-brand via
// NewsletterRenderer. Staff only.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Eye,
  Link2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAllNewsletters,
  getNewsletterById,
  saveNewsletter,
  deleteNewsletter,
  uploadNewsletterImage,
  slugify,
  blockId,
  type Newsletter,
  type Block,
  type BlockType,
} from "@/lib/newsletters";
import { NewsletterRenderer } from "@/components/NewsletterRenderer";

const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero banner",
  heading: "Heading",
  text: "Text",
  image: "Image",
  callout: "Highlight box",
  button: "Button / link",
  quote: "Quote",
  divider: "Divider",
};
const ADDABLE: BlockType[] = [
  "heading",
  "text",
  "image",
  "callout",
  "button",
  "quote",
  "divider",
];

export default function NewsletterAdmin() {
  const navigate = useNavigate();
  const [list, setList] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    setList(await listAllNewsletters());
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);

  if (!isStaff())
    return <div className="p-6 text-center text-muted-foreground">Staff only.</div>;

  const newIssue = () =>
    setEditing({
      id: "",
      slug: "",
      title: "",
      subtitle: "",
      cover_image: null,
      blocks: [],
      published: false,
      published_at: null,
    });

  const openEdit = async (id: string) => {
    const full = await getNewsletterById(id);
    if (full) setEditing(full);
  };

  const patch = (p: Partial<Newsletter>) =>
    setEditing((e) => (e ? { ...e, ...p } : e));

  const addBlock = (type: BlockType) =>
    setEditing((e) =>
      e ? { ...e, blocks: [...e.blocks, { id: blockId(), type }] } : e,
    );
  const patchBlock = (i: number, p: Partial<Block>) =>
    setEditing((e) => {
      if (!e) return e;
      const blocks = e.blocks.slice();
      blocks[i] = { ...blocks[i], ...p };
      return { ...e, blocks };
    });
  const removeBlock = (i: number) =>
    setEditing((e) =>
      e ? { ...e, blocks: e.blocks.filter((_, j) => j !== i) } : e,
    );
  const move = (i: number, dir: -1 | 1) =>
    setEditing((e) => {
      if (!e) return e;
      const j = i + dir;
      if (j < 0 || j >= e.blocks.length) return e;
      const blocks = e.blocks.slice();
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...e, blocks };
    });

  const pickImage = async (cb: (url: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const url = await uploadNewsletterImage(f);
        if (url) cb(url);
      } catch (e: any) {
        toast.error(e?.message || "Upload failed");
      }
    };
    input.click();
  };

  const doSave = async (publish?: boolean) => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Give the issue a title");
      return;
    }
    setSaving(true);
    const slug = editing.slug || slugify(editing.title);
    const res = await saveNewsletter({
      ...editing,
      slug,
      published: publish ?? editing.published,
    });
    setSaving(false);
    if (res.success) {
      toast.success(publish ? "Published" : "Saved");
      setEditing(null);
      reload();
    } else {
      toast.error("Couldn't save — are you signed in as staff?");
      console.error(res.error);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/n/${slug}`;
    navigator.clipboard?.writeText(url);
    toast.success("Link copied — paste it into your GHL email");
  };

  // ── Editor ────────────────────────────────────────────────────────────────
  if (editing) {
    if (preview) {
      return (
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-background z-10">
            <Button variant="ghost" size="sm" onClick={() => setPreview(false)}>
              <ChevronLeft className="h-4 w-4" /> Back to editor
            </Button>
            <span className="text-xs text-muted-foreground">Preview</span>
          </div>
          <div className="pt-4">
            <NewsletterRenderer issue={editing} />
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 pb-28">
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> All issues
        </button>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Issue title</Label>
            <Input
              value={editing.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. ETL November Newsletter"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs">Subtitle (optional)</Label>
            <Input
              value={editing.subtitle || ""}
              onChange={(e) => patch({ subtitle: e.target.value })}
              placeholder="A line under the title"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs">Cover image</Label>
            <div className="flex items-center gap-2 mt-1">
              {editing.cover_image && (
                <img
                  src={editing.cover_image}
                  className="h-14 w-24 object-cover rounded-lg border border-border"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => pickImage((url) => patch({ cover_image: url }))}
                className="gap-1.5"
              >
                <ImagePlus className="h-4 w-4" />
                {editing.cover_image ? "Change" : "Upload"}
              </Button>
            </div>
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sections
          </p>
          {editing.blocks.map((b, i) => (
            <div key={b.id} className="border border-border rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {BLOCK_LABELS[b.type]}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(i, -1)} className="p-1 text-muted-foreground hover:text-foreground">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(i, 1)} className="p-1 text-muted-foreground hover:text-foreground">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => removeBlock(i)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {(b.type === "hero") && (
                <>
                  <Input placeholder="Heading" value={b.heading || ""} onChange={(e) => patchBlock(i, { heading: e.target.value })} />
                  <Input placeholder="Subheading" value={b.subheading || ""} onChange={(e) => patchBlock(i, { subheading: e.target.value })} />
                  <ImageField url={b.image} onPick={() => pickImage((url) => patchBlock(i, { image: url }))} />
                </>
              )}
              {b.type === "heading" && (
                <Input placeholder="Heading text" value={b.text || ""} onChange={(e) => patchBlock(i, { text: e.target.value })} />
              )}
              {b.type === "text" && (
                <Textarea placeholder="Write your paragraph(s)…" value={b.text || ""} onChange={(e) => patchBlock(i, { text: e.target.value })} rows={4} />
              )}
              {b.type === "image" && (
                <>
                  <ImageField url={b.image} onPick={() => pickImage((url) => patchBlock(i, { image: url }))} />
                  <Input placeholder="Caption (optional)" value={b.caption || ""} onChange={(e) => patchBlock(i, { caption: e.target.value })} />
                </>
              )}
              {b.type === "callout" && (
                <Textarea placeholder="Highlighted text" value={b.text || ""} onChange={(e) => patchBlock(i, { text: e.target.value })} rows={3} />
              )}
              {b.type === "button" && (
                <>
                  <Input placeholder="Button label" value={b.label || ""} onChange={(e) => patchBlock(i, { label: e.target.value })} />
                  <Input placeholder="Link URL (https://…)" value={b.url || ""} onChange={(e) => patchBlock(i, { url: e.target.value })} />
                </>
              )}
              {b.type === "quote" && (
                <>
                  <Textarea placeholder="Quote" value={b.text || ""} onChange={(e) => patchBlock(i, { text: e.target.value })} rows={2} />
                  <Input placeholder="Who said it" value={b.author || ""} onChange={(e) => patchBlock(i, { author: e.target.value })} />
                </>
              )}
              {b.type === "divider" && (
                <p className="text-xs text-muted-foreground italic">A line break between sections.</p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {ADDABLE.map((t) => (
              <Button key={t} size="sm" variant="outline" className="gap-1" onClick={() => addBlock(t)}>
                <Plus className="h-3.5 w-3.5" /> {BLOCK_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-3 flex gap-2 max-w-2xl mx-auto">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" className="flex-1" disabled={saving} onClick={() => doSave(false)}>
            Save draft
          </Button>
          <Button className="flex-1" disabled={saving} onClick={() => doSave(true)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
          </Button>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 pb-24">
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Admin
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading uppercase">Newsletters</h1>
        <Button onClick={newIssue} className="gap-1.5">
          <Plus className="h-4 w-4" /> New issue
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No issues yet. Tap "New issue" to build your first newsletter.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="flex items-center gap-2 border border-border rounded-lg p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {n.title}
                  {!n.published && (
                    <span className="ml-2 text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">
                      draft
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">/n/{n.slug}</p>
              </div>
              {n.published && (
                <>
                  <button onClick={() => copyLink(n.slug)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title="Copy link">
                    <Link2 className="h-4 w-4" />
                  </button>
                  <a href={`/n/${n.slug}`} target="_blank" rel="noopener" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" title="Open">
                    <Eye className="h-4 w-4" />
                  </a>
                </>
              )}
              <button onClick={() => openEdit(n.id)} className="text-xs font-bold text-primary px-2">
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${n.title}"?`)) return;
                  await deleteNewsletter(n.id);
                  reload();
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageField({ url, onPick }: { url?: string; onPick: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {url && <img src={url} className="h-12 w-20 object-cover rounded border border-border" />}
      <Button variant="outline" size="sm" onClick={onPick} className="gap-1.5">
        <ImagePlus className="h-4 w-4" /> {url ? "Change" : "Upload image"}
      </Button>
    </div>
  );
}
