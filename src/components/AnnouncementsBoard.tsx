// Staff Hub — internal announcements. Post once, all staff see it on Today.
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Pin, PinOff, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { staffName, fmtDate } from "@/components/staffHubShared";
import {
  listAnnouncements,
  createAnnouncement,
  togglePin,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/staffBoards";

export function AnnouncementsBoard({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [pinned, setPinned] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listAnnouncements());
    } catch {
      /* best effort */
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Give it a title");
    const r = await createAnnouncement({ title, body: bodyText, pinned, created_by: staffName() || "Staff" });
    if (r.ok) {
      setTitle("");
      setBodyText("");
      setPinned(false);
      setAdding(false);
      load();
    } else toast.error(r.error || "Couldn't post");
  };

  // On Today (compact) only show pinned + the latest couple, no composer.
  const shown = compact ? items.filter((a) => a.pinned).slice(0, 3) : items;
  if (compact && shown.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Megaphone className="h-4 w-4" /> Announcements
        </h3>
        {!compact && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" /> Post
          </Button>
        )}
      </div>

      {adding && !compact && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <Input placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Detail (optional)" rows={2} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
          </label>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={submit}>
              Post
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {shown.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl border p-3 ${a.pinned ? "border-amber-400/60 bg-amber-500/5" : "border-border bg-card"}`}
        >
          <div className="flex items-start gap-2">
            {a.pinned && <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{a.title}</p>
              {a.body && <p className="text-xs mt-0.5 whitespace-pre-line">{a.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {a.created_by ? `${a.created_by} · ` : ""}
                {fmtDate(a.created_at)}
              </p>
            </div>
            {!compact && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="text-muted-foreground"
                  onClick={() => togglePin(a.id, !a.pinned).then(load)}
                  title={a.pinned ? "Unpin" : "Pin"}
                >
                  {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
                <button className="text-muted-foreground" onClick={() => deleteAnnouncement(a.id).then(load)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {!compact && items.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">No announcements yet.</p>
      )}
    </div>
  );
}

export default AnnouncementsBoard;
