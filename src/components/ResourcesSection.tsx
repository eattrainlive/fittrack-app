import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  PlayCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  Upload,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getResourceSections,
  addResourceSection,
  deleteResourceSection,
  getResources,
  addResource,
  deleteResource,
  updateResource,
  uploadResourceFile,
  makePdfCover,
  processPdf,
  reorderResources,
  reorderSections,
} from "@/lib/store";
import { updateResourceSection } from "@/lib/resourceSections";
import { getEmbedUrl } from "@/lib/utils";
import { ResourceItem } from "./ResourceItem";
import {
  AddSectionDialog,
  AddResourceDialog,
  EditResourceDialog,
  VideoPlayerDialog,
  RenameSectionDialog,
} from "./ResourceDialogs";

const isVideo = (u: string) =>
  /vimeo|youtube|youtu\.be|player\./i.test(u || "");

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [openSection, setOpenSection] = useState<string | undefined>(undefined);
  const [showRenameSection, setShowRenameSection] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");

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

  const handleRenameSection = async (id: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await updateResourceSection(id, name.trim());
    if (error) {
      toast.error("Couldn't rename section");
      return;
    }
    toast.success("Section renamed");
    setShowRenameSection(false);
    setRenameTarget(null);
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
    let thumbnail_url: string | null = null;

    if (resFile) {
      const uploaded = await uploadResourceFile(resFile);
      if (!uploaded) {
        toast.error("Upload failed");
        setSaving(false);
        return;
      }
      url = uploaded;
      type = "file";
      if (resFile.type === "application/pdf") {
        thumbnail_url = await makePdfCover(resFile);
      } else if (resFile.type.startsWith("image/")) {
        thumbnail_url = url;
      }
    } else if (!url) {
      toast.error("Please paste a URL or upload a file");
      setSaving(false);
      return;
    } else if (isVideo(url)) {
      type = "video";
    }

    if (coverFile) {
      const coverUrl = await uploadResourceFile(coverFile);
      if (coverUrl) thumbnail_url = coverUrl;
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
      thumbnail_url,
    });

    if (error) {
      toast.error("Couldn't add resource");
      setSaving(false);
      return;
    }

    toast.success("Resource added");
    setResForm({ title: "", url: "", description: "", section_id: "other" });
    setResFile(null);
    setCoverFile(null);
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

  const saveEdit = async () => {
    if (!editing) return;
    let thumbnail_url = editing.thumbnail_url || null;
    if (editFile) {
      const up = await uploadResourceFile(editFile);
      if (up) thumbnail_url = up;
    }
    const { error } = await updateResource(editing.id, {
      title: editing.title,
      description: editing.description ?? null,
      section_id: editing.section_id ?? null,
      thumbnail_url,
    });
    if (error) {
      toast.error("Couldn't save changes");
      return;
    }
    toast.success("Resource updated");
    setEditing(null);
    setEditFile(null);
    load();
  };

  const moveResource = async (
    sectionItems: Resource[],
    index: number,
    dir: -1 | 1,
  ) => {
    const next = index + dir;
    if (next < 0 || next >= sectionItems.length) return;
    const reordered = [...sectionItems];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setResources((prev) => {
      const updated = [...prev];
      for (const r of reordered) {
        const idx = updated.findIndex((u) => u.id === r.id);
        if (idx >= 0) updated[idx] = r;
      }
      return updated;
    });
    await reorderResources(reordered.map((r) => r.id));
    await load();
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setSections(reordered);
    await reorderSections(reordered.map((s) => s.id));
    await load();
  };

  const handleBulk = async (files: File[], section_id: string | null) => {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      const url = await uploadResourceFile(f);
      if (!url) continue;
      let title =
        f.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim() || "Untitled";
      let thumbnail_url: string | null = null;
      if (f.type === "application/pdf") {
        const r = await processPdf(f);
        title = r.title;
        thumbnail_url = r.thumbnail_url;
      } else if (f.type.startsWith("image/")) {
        thumbnail_url = url;
      }
      await addResource({
        page,
        section_id,
        title,
        url,
        type: "file",
        thumbnail_url,
      });
    }
    setProgress(null);
    await load();
  };

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
          {blurb && <p className="text-xs text-muted-foreground">{blurb}</p>}
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
                setCoverFile(null);
                setShowAddResource(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Resource
            </Button>
          </div>
        )}
      </div>

      {progress && (
        <div className="flex items-center gap-2 text-sm text-primary font-bold py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {progress}
        </div>
      )}

      {sections.length === 0 && uncategorised.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {isStaff
            ? "No sections yet — add one to get started."
            : "Your coach will add resources here soon."}
        </p>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={openSection}
          onValueChange={setOpenSection}
          className="w-full space-y-3"
        >
          {sections.map((sec, secIdx) => {
            const items = resources.filter((r) => r.section_id === sec.id);
            if (items.length === 0 && !isStaff) return null;
            return (
              <AccordionItem
                key={sec.id}
                value={sec.id}
                className="border border-border rounded-lg overflow-hidden data-[state=open]:border-primary/40"
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3.5 bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <PlayCircle className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-bold text-sm uppercase tracking-wider">
                      {sec.name}
                    </span>
                    <Badge variant="secondary" className="shrink-0 ml-1">
                      {items.length}
                    </Badge>
                    {isStaff && (
                      <div
                        className="flex items-center gap-0.5 shrink-0 ml-auto pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={secIdx === 0}
                          onClick={() => moveSection(secIdx, -1)}
                          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={secIdx === sections.length - 1}
                          onClick={() => moveSection(secIdx, 1)}
                          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setResForm({
                              title: "",
                              url: "",
                              description: "",
                              section_id: sec.id,
                            });
                            setResFile(null);
                            setCoverFile(null);
                            setShowAddResource(true);
                          }}
                          className="p-1 text-muted-foreground hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <label
                          className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                          title="Bulk upload"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            disabled={!!progress}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length) handleBulk(files, sec.id);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          onClick={() => {
                            setRenameTarget({ id: sec.id, name: sec.name });
                            setRenameName(sec.name);
                            setShowRenameSection(true);
                          }}
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
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
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-2">
                  {items.length === 0 && isStaff ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No resources in this section yet.
                    </p>
                  ) : (
                    items.map((r, i) => (
                      <ResourceItem
                        key={r.id}
                        r={r}
                        sectionItems={items}
                        index={i}
                        isStaff={isStaff}
                        onOpen={openResource}
                        onEdit={setEditing}
                        onDelete={handleDeleteResource}
                        onMoveUp={() => moveResource(items, i, -1)}
                        onMoveDown={() => moveResource(items, i, 1)}
                      />
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {uncategorised.length > 0 && (
            <AccordionItem
              value="uncategorised"
              className="border border-border rounded-lg overflow-hidden data-[state=open]:border-primary/40"
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3.5 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 text-left">
                  <PlayCircle className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-bold text-sm uppercase tracking-wider">
                    Other
                  </span>
                  <Badge variant="secondary" className="shrink-0 ml-1">
                    {uncategorised.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 space-y-2">
                {uncategorised.map((r, i) => (
                  <ResourceItem
                    key={r.id}
                    r={r}
                    sectionItems={uncategorised}
                    index={i}
                    isStaff={isStaff}
                    onOpen={openResource}
                    onEdit={setEditing}
                    onDelete={handleDeleteResource}
                    onMoveUp={() => moveResource(uncategorised, i, -1)}
                    onMoveDown={() => moveResource(uncategorised, i, 1)}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}

      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        newSectionName={newSectionName}
        setNewSectionName={setNewSectionName}
        onAdd={handleAddSection}
      />

      <AddResourceDialog
        open={showAddResource}
        onOpenChange={setShowAddResource}
        resForm={resForm}
        setResForm={setResForm}
        resFile={resFile}
        setResFile={setResFile}
        coverFile={coverFile}
        setCoverFile={setCoverFile}
        sections={sections}
        saving={saving}
        onAdd={handleAddResource}
      />

      <EditResourceDialog
        editing={editing}
        setEditing={setEditing}
        editFile={editFile}
        setEditFile={setEditFile}
        sections={sections}
        onSave={saveEdit}
      />

      <VideoPlayerDialog
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        onClose={() => {
          setVideoUrl(null);
          setVideoTitle("");
        }}
      />

      <RenameSectionDialog
        open={showRenameSection}
        onOpenChange={(o) => {
          setShowRenameSection(o);
          if (!o) {
            setRenameTarget(null);
            setRenameName("");
          }
        }}
        sectionName={renameName}
        setSectionName={setRenameName}
        onRename={() =>
          renameTarget && handleRenameSection(renameTarget.id, renameName)
        }
      />
    </div>
  );
}
