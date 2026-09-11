import { getEmbedUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImageIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Section {
  id: string;
  page: string;
  name: string;
}

interface Resource {
  id: string;
  page: string;
  section_id: string | null;
  title: string;
  url: string;
  type: string;
  description?: string;
  thumbnail_url?: string | null;
}

export function AddSectionDialog({
  open,
  onOpenChange,
  newSectionName,
  setNewSectionName,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  newSectionName: string;
  setNewSectionName: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Section name</Label>
            <Input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Nutrition Tips"
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
            />
          </div>
          <Button className="w-full" onClick={onAdd}>
            Add Section
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddResourceDialog({
  open,
  onOpenChange,
  resForm,
  setResForm,
  resFile,
  setResFile,
  coverFile,
  setCoverFile,
  sections,
  saving,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resForm: {
    title: string;
    url: string;
    description: string;
    section_id: string;
  };
  setResForm: (v: any) => void;
  resFile: File | null;
  setResFile: (f: File | null) => void;
  coverFile: File | null;
  setCoverFile: (f: File | null) => void;
  sections: Section[];
  saving: boolean;
  onAdd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={resForm.title}
              onChange={(e) =>
                setResForm({ ...resForm, title: e.target.value })
              }
              placeholder="Resource title"
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={resForm.section_id}
              onValueChange={(v) => setResForm({ ...resForm, section_id: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL (video or link)</Label>
            <Input
              value={resForm.url}
              onChange={(e) => setResForm({ ...resForm, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Or upload a file</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                setResFile(e.target.files?.[0] || null);
                if (e.target.files?.[0]) setResForm({ ...resForm, url: "" });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Cover image (optional)
            </Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
            <p className="text-[10px] text-muted-foreground">
              Overrides the auto-generated cover for PDFs/videos/links.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={resForm.description}
              onChange={(e) =>
                setResForm({ ...resForm, description: e.target.value })
              }
              placeholder="Short description"
              rows={2}
            />
          </div>
          <Button className="w-full" onClick={onAdd} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Resource"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditResourceDialog({
  editing,
  setEditing,
  editFile,
  setEditFile,
  sections,
  onSave,
}: {
  editing: Resource | null;
  setEditing: (r: Resource | null) => void;
  editFile: File | null;
  setEditFile: (f: File | null) => void;
  sections: Section[];
  onSave: () => void;
}) {
  return (
    <Dialog
      open={!!editing}
      onOpenChange={(o) => {
        if (!o) {
          setEditing(null);
          setEditFile(null);
        }
      }}
    >
      <DialogContent className="w-[92vw] max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
        </DialogHeader>
        {editing && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                placeholder="Resource title"
              />
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <select
                value={editing.section_id || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    section_id: e.target.value || null,
                  })
                }
                className="w-full border border-border rounded-md h-10 px-2 text-sm bg-background"
              >
                <option value="">Other (no section)</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Replace cover image
                (optional)
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                placeholder="Short description"
                rows={2}
              />
            </div>
            <Button className="w-full" onClick={onSave}>
              Save changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VideoPlayerDialog({
  videoUrl,
  videoTitle,
  onClose,
}: {
  videoUrl: string | null;
  videoTitle: string;
  onClose: () => void;
}) {
  return (
    <>
      {videoUrl && (
        <Dialog open={!!videoUrl} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none">
            <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
              <DialogTitle className="text-white">{videoTitle}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full mt-10">
              <iframe
                src={getEmbedUrl(videoUrl)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
