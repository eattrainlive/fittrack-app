// "Listen & Let Go" — audio recordings (sound baths now; wider wellness hub
// later). Members play published tracks; staff add / manage them.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Waves, Plus, Trash2, Loader2, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  listTracks,
  listAllTracks,
  saveTrack,
  deleteTrack,
  uploadAudio,
  type WellnessTrack,
} from "@/lib/wellnessTracks";

const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

export function ListenAndLetGo() {
  const staff = isStaff();
  const [tracks, setTracks] = useState<WellnessTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WellnessTrack | null>(null);

  const load = async () => {
    setLoading(true);
    setTracks(staff ? await listAllTracks() : await listTracks());
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const formOpen = adding || !!editing;
  const closeForm = () => {
    setAdding(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl uppercase tracking-wide">
            Listen &amp; Let Go
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Press play, get comfy, and let the sound do the work. Best with
          headphones somewhere quiet.
        </p>
      </div>

      {staff && !formOpen && (
        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add recording
        </Button>
      )}
      {staff && formOpen && (
        <TrackForm
          editing={editing}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            load();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No recordings yet — check back soon.
        </p>
      ) : (
        <div className="space-y-3">
          {tracks.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold leading-tight">
                    {t.title}
                    {!t.published && (
                      <span className="ml-2 text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">
                        hidden
                      </span>
                    )}
                  </p>
                  {t.duration_label && (
                    <p className="text-[11px] text-muted-foreground">
                      {t.duration_label}
                    </p>
                  )}
                </div>
                {staff && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setAdding(false);
                        setEditing(t);
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${t.title}"?`)) return;
                        await deleteTrack(t.id);
                        load();
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {t.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {t.description}
                </p>
              )}
              <audio
                controls
                preload="none"
                src={t.audio_url}
                className="w-full mt-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: WellnessTrack | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [duration, setDuration] = useState(editing?.duration_label ?? "");
  const [url, setUrl] = useState(editing?.audio_url ?? "");
  const [published, setPublished] = useState(editing?.published ?? true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = async (f: File) => {
    setBusy(true);
    try {
      const publicUrl = await uploadAudio(f);
      setUrl(publicUrl);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Give it a title");
    if (!url.trim()) return toast.error("Upload a file or paste an audio URL");
    setBusy(true);
    const { success } = await saveTrack({
      id: editing?.id,
      title,
      description,
      duration_label: duration,
      audio_url: url,
      published,
    });
    setBusy(false);
    if (success) {
      toast.success(editing ? "Saved" : "Recording added");
      onSaved();
    } else {
      toast.error("Couldn't save — are you signed in as staff?");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Evening Sound Bath"
          className="h-10"
        />
      </div>
      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A line on what it's for / how to use it"
          rows={2}
        />
      </div>
      <div>
        <Label className="text-xs">Length (optional)</Label>
        <Input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 32 min"
          className="h-10"
        />
      </div>
      <div>
        <Label className="text-xs">Audio</Label>
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload file
          </Button>
          <span className="text-[11px] text-muted-foreground">
            or paste a URL below
          </span>
        </div>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (.mp3)"
          className="h-10 mt-2 font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Tip: compress to MP3 (~128kbps) first — big files are slow to load.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Visible to members
      </label>
      <div className="flex gap-2 pt-1">
        <Button className="flex-1" disabled={busy} onClick={save}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editing ? (
            "Save changes"
          ) : (
            "Add recording"
          )}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default ListenAndLetGo;
