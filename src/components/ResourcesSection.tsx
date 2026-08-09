import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, PlayCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getResourceSections,
  addResourceSection,
  deleteResourceSection,
  getResources,
  addResource,
  deleteResource,
  uploadResourceFile,
} from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";

const isVideo = (u: string) => /vimeo|youtube|youtu\.be|player\./i.test(u || "");

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
}

export function ResourcesSection({
  page,
  heading = "Resources",
  blurb,
}: {
  page: string;
  heading?: string;
  blurb?: string;
}) {
  const isStaff = localStorage.getItem("fittrack_is_staff") === "true";
  const [sections, setSections] = useState<Section[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");

  // Staff dialog state
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [resForm, setResForm] = useState({
    title: "",
    url: "",
    description: "",
    section_id: "other",
  });
  const [resFile, setResFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [secs, res] = await Promise.all([
      getResourceSections(page),
      getResources(page),
    ]);
    setSections(secs);
    setResources(res);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openResource = (r: Resource) => {
    if (isVideo(r.url)) {
      setVideoUrl(r.url);
      setVideoTitle(r.title);
    } else {
      window.open(r.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    const { error } = await addResourceSection(page, newSectionName.trim());
    if (error) {
      toast.error("Couldn't add section");
      return;
    }
    toast.success("Section added");
    setNewSectionName("");
    setShowAddSection(false);
    load();
  };

  const handleDeleteSection = async (id: string) => {
    const { error } = await deleteResourceSection(id);
    if (error) {
      toast.error("Couldn't delete section");
      return;
    }
    toast.success("Section deleted");
    load();
  };

  const handleAddResource = async () => {
    if (!resForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    let url = resForm.url;
    let type = "link";

    if (resFile) {
      const uploaded = await uploadResourceFile(resFile);
      if (!uploaded) {
        toast.error("Upload failed");
        setSaving(false);
        return;
      }
      url = uploaded;
      type = "file";
    } else if (!url) {
      toast.error("Please paste a URL or upload a file");
      setSaving(false);
      return;
    } else if (isVideo(url)) {
      type = "video";
    }

    const section_id =
      resForm.section_id === "other" ? null : resForm.section_id;

    const { error } = await addResource({
      page,
      section_id,
      title: resForm.title.trim(),
      url,
      type,
      description: resForm.description.trim() || undefined,
    });

    if (error) {
      toast.error("Couldn't add resource");
      setSaving(false);
      return;
    }

    toast.success("Resource added");
    setResForm({ title: "", url: "", description: "", section_id: "other" });
    setResFile(null);
    setShowAddResource(false);
    setSaving(false);
    load();
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await deleteResource(id);
    if (error) {
      toast.error("Couldn't delete resource");
      return;
    }
    toast.success("Resource deleted");
    load();
  };

  const renderResource = (r: Resource) => (
    <div
      key={r.id}
      className="w-full flex items-center gap-3 border border-border rounded-xl p-3 text-left active:scale-[0.99] transition"
    >
      <button
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        onClick={() => openResource(r)}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {isVideo(r.url) ? (
            <PlayCircle className="w-5 h-5 text-primary" />
          ) : (
            <FileText className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{r.title}</p>
          {r.description && (
            <p className="text-xs text-muted-foreground truncate">
              {r.description}
            </p>
          )}
        </div>
      </button>
      {isStaff && (
        <button
          onClick={() => handleDeleteResource(r.id)}
          className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const uncategorised = resources.filter((r) => !r.section_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-heading uppercase">{heading}</h2>
          {blurb && (
            <p className="text-xs text-muted-foreground">{blurb}</p>
          )}
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setShowAddSection(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Section
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => {
                setResForm({
                  title: "",
                  url: "",
                  description: "",
                  section_id: sections.length > 0 ? sections[0].id : "other",
                });
                setResFile(null);
                setShowAddResource(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Resource
            </Button>
          </div>
        )}
      </div>

      {sections.length === 0 && uncategorised.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {isStaff
            ? "No sections yet — add one to get started."
            : "Your coach will add resources here soon."}
        </p>
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => {
            const items = resources.filter(
              (r) => r.section_id === sec.id
            );
            if (items.length === 0 && !isStaff) return null;
            return (
              <div key={sec.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {sec.name}
                  </h3>
                  {isStaff && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setResForm({
                            title: "",
                            url: "",
                            description: "",
                            section_id: sec.id,
                          });
                          setResFile(null);
                          setShowAddResource(true);
                        }}
                        className="p-1 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {items.length === 0 && isStaff ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No resources in this section yet.
                    </p>
                  ) : (
                    items.map(renderResource)
                  )}
                </div>
              </div>
            );
          })}

          {uncategorised.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Other
              </h3>
              <div className="space-y-2">
                {uncategorised.map(renderResource)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Section dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
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
                onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
              />
            </div>
            <Button className="w-full" onClick={handleAddSection}>
              Add Section
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Resource dialog */}
      <Dialog open={showAddResource} onOpenChange={setShowAddResource}>
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
                onValueChange={(v) =>
                  setResForm({ ...resForm, section_id: v })
                }
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
                onChange={(e) =>
                  setResForm({ ...resForm, url: e.target.value })
                }
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
                  if (e.target.files?.[0])
                    setResForm({ ...resForm, url: "" });
                }}
              />
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
            <Button
              className="w-full"
              onClick={handleAddResource}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Resource"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video player modal */}
      {videoUrl && (
        <Dialog
          open={!!videoUrl}
          onOpenChange={(open) => {
            if (!open) {
              setVideoUrl(null);
              setVideoTitle("");
            }
          }}
        >
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
    </div>
  );
}
