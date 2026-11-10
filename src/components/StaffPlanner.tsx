// Staff Hub — Planner. Two sections behind a toggle: recurring staff reminders
// and a content scheduler (draft → scheduled → posted). Both team-wide; items
// due today surface on the Today feed.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  CalendarClock,
  CheckCircle2,
  Repeat as RepeatIcon,
  Trash2,
  Camera,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EmptyState, staffName, fmtDate } from "@/components/staffHubShared";
import {
  listReminders,
  createReminder,
  completeReminder,
  reopenReminder,
  deleteReminder,
  REPEAT_LABEL,
  type Reminder,
  type Repeat,
  listPosts,
  createPost,
  markPosted,
  deletePost,
  uploadContentMedia,
  DESTINATION_LABEL,
  type ContentPost,
  type Destination,
} from "@/lib/staffPlanner";

const todayStr = () => new Date().toISOString().slice(0, 10);
const isDue = (d: string) => d <= todayStr();

export function StaffPlanner() {
  const [section, setSection] = useState<"reminders" | "content">("reminders");
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["reminders", "content"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              section === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {s === "reminders" ? "Reminders" : "Content calendar"}
          </button>
        ))}
      </div>
      {section === "reminders" ? <RemindersSection /> : <ContentSection />}
    </div>
  );
}

// ── Reminders ────────────────────────────────────────────────────────────────
function RemindersSection() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listReminders());
    } catch {
      toast.error("Couldn't load reminders");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = items.filter((r) => !r.done);
  const done = items.filter((r) => r.done);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.filter((r) => isDue(r.due_date)).length} due now · {active.length} open
        </p>
        <Button size="sm" className="gap-1" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" /> New reminder
        </Button>
      </div>

      {adding && (
        <ReminderForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <Spinner />
      ) : active.length === 0 ? (
        <EmptyState text="No reminders on the go. Add one to get started." />
      ) : (
        <div className="space-y-2">
          {active.map((r) => (
            <ReminderRow key={r.id} r={r} onChange={load} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="pt-1">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Completed one-offs ({done.length})
          </summary>
          <div className="space-y-2 mt-2">
            {done.map((r) => (
              <ReminderRow key={r.id} r={r} onChange={load} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ReminderForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState(todayStr());
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error("Give the reminder a title");
    setSaving(true);
    const r = await createReminder({
      title,
      detail,
      assigned_to: assigned,
      due_date: due,
      repeat,
      created_by: staffName() || "Staff",
    });
    setSaving(false);
    if (r.ok) {
      toast.success("Reminder added");
      onDone();
    } else toast.error(r.error || "Couldn't save");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Input placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea
        placeholder="Detail (optional)"
        rows={2}
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input placeholder="Assign to (optional)" value={assigned} onChange={(e) => setAssigned(e.target.value)} />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as Repeat)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {(Object.keys(REPEAT_LABEL) as Repeat[]).map((k) => (
            <option key={k} value={k}>
              {REPEAT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving} onClick={submit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add reminder"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReminderRow({ r, onChange }: { r: Reminder; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) onChange();
    else toast.error(res.error || "Couldn't update");
  };
  const due = isDue(r.due_date) && !r.done;

  return (
    <div
      className={`rounded-xl border bg-card p-3 flex items-start gap-3 ${
        due ? "border-amber-400/60" : "border-border"
      } ${r.done ? "opacity-60" : ""}`}
    >
      <button
        className="mt-0.5 shrink-0"
        disabled={busy}
        onClick={() => act(() => completeReminder(r, staffName() || "Staff"))}
        title="Mark done"
      >
        <CheckCircle2 className={`h-5 w-5 ${r.done ? "text-emerald-500" : "text-muted-foreground"}`} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${r.done ? "line-through" : ""}`}>{r.title}</span>
          {r.repeat !== "none" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <RepeatIcon className="h-3 w-3" /> {REPEAT_LABEL[r.repeat]}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Due {fmtDate(r.due_date)}
          {r.assigned_to ? ` · ${r.assigned_to}` : ""}
        </p>
        {r.detail && <p className="text-xs mt-1">{r.detail}</p>}
      </div>
      {r.done && r.repeat === "none" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => reopenReminder(r.id))}>
          Reopen
        </Button>
      )}
      <button className="text-muted-foreground shrink-0" disabled={busy} onClick={() => act(() => deleteReminder(r.id))}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Content scheduler ────────────────────────────────────────────────────────
const destStyle: Record<Destination, string> = {
  private: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  stories: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  main: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

function ContentSection() {
  const [items, setItems] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPosts());
    } catch {
      toast.error("Couldn't load the content calendar");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const queued = items.filter((p) => p.status !== "posted");
  const posted = items.filter((p) => p.status === "posted");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {queued.filter((p) => isDue(p.scheduled_for)).length} due to post · {queued.length} queued
        </p>
        <Button size="sm" className="gap-1" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {adding && (
        <PostForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <Spinner />
      ) : queued.length === 0 ? (
        <EmptyState text="Nothing scheduled. Plan a post to get ahead." />
      ) : (
        <div className="space-y-2">
          {queued.map((p) => (
            <PostCard key={p.id} p={p} onChange={load} />
          ))}
        </div>
      )}

      {posted.length > 0 && (
        <details className="pt-1">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Posted ({posted.length})
          </summary>
          <div className="space-y-2 mt-2">
            {posted.map((p) => (
              <PostCard key={p.id} p={p} onChange={load} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PostForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [caption, setCaption] = useState("");
  const [destination, setDestination] = useState<Destination>("main");
  const [when, setWhen] = useState(todayStr());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (status: "draft" | "scheduled") => {
    if (!caption.trim()) return toast.error("Add a caption");
    setSaving(true);
    try {
      let media_url: string | null = null;
      if (file) {
        try {
          media_url = await uploadContentMedia(file);
        } catch {
          toast.error("Image upload failed — saving without it");
        }
      }
      const r = await createPost({
        caption,
        destination,
        scheduled_for: when,
        media_url,
        notes,
        status,
        created_by: staffName() || "Staff",
      });
      if (r.ok) {
        toast.success(status === "draft" ? "Saved as draft" : "Scheduled");
        onDone();
      } else toast.error(r.error || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Textarea
        placeholder="Caption / post copy…"
        rows={3}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value as Destination)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {(Object.keys(DESTINATION_LABEL) as Destination[]).map((d) => (
            <option key={d} value={d}>
              {DESTINATION_LABEL[d]}
            </option>
          ))}
        </select>
        <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Input placeholder="Notes for whoever posts it (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" /> {file ? "Change image" : "Add image"}
        </Button>
        {preview && (
          <div className="relative">
            <img src={preview} alt="" className="h-14 w-14 rounded object-cover" />
            <button
              onClick={() => pick(null)}
              className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving} onClick={() => submit("scheduled")}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
        </Button>
        <Button variant="outline" disabled={saving} onClick={() => submit("draft")}>
          Save draft
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PostCard({ p, onChange }: { p: ContentPost; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) onChange();
    else toast.error(res.error || "Couldn't update");
  };
  const due = isDue(p.scheduled_for) && p.status !== "posted";

  return (
    <div
      className={`rounded-xl border bg-card p-3 ${
        due ? "border-amber-400/60" : "border-border"
      } ${p.status === "posted" ? "opacity-60" : ""}`}
    >
      <div className="flex gap-3">
        {p.media_url && <img src={p.media_url} alt="" className="h-16 w-16 rounded object-cover shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${destStyle[p.destination]}`}>
              {DESTINATION_LABEL[p.destination]}
            </span>
            {p.status === "draft" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Draft</span>
            )}
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> {fmtDate(p.scheduled_for)}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-line">{p.caption}</p>
          {p.notes && <p className="text-[11px] text-muted-foreground mt-1">Note: {p.notes}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        {p.status === "posted" ? (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mr-auto">
            Posted{p.posted_by ? ` by ${p.posted_by}` : ""}
          </span>
        ) : (
          <>
            <span className="text-[11px] text-muted-foreground mr-auto">
              {due ? "Due to post" : "Scheduled"}
            </span>
            <Button size="sm" className="gap-1" disabled={busy} onClick={() => act(() => markPosted(p.id, staffName() || "Staff"))}>
              <Send className="h-4 w-4" /> Mark posted
            </Button>
          </>
        )}
        <button className="text-muted-foreground" disabled={busy} onClick={() => act(() => deletePost(p.id))}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

export default StaffPlanner;
