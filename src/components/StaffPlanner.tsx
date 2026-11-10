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
  Sparkles,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Repeat as RepeatIcon2,
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
  generateIdeas,
  type ContentIdeas,
  buildCalendar,
  type CalItem,
  listCoaches,
  type Coach,
  updateReminder,
  splitOccurrence,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  EVENT_KIND_LABEL,
  type StaffEvent,
  type EventKind,
} from "@/lib/staffPlanner";

const todayStr = () => new Date().toISOString().slice(0, 10);
const isDue = (d: string) => d <= todayStr();

const SECTION_LABELS: Record<"calendar" | "reminders" | "content" | "events", string> = {
  calendar: "Calendar",
  reminders: "Reminders",
  content: "Content calendar",
  events: "Events",
};

export function StaffPlanner({ staffSecret }: { staffSecret: string }) {
  const [section, setSection] = useState<"calendar" | "reminders" | "content" | "events">(
    "calendar",
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["calendar", "reminders", "content", "events"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              section === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>
      {section === "calendar" && <CalendarSection staffSecret={staffSecret} />}
      {section === "reminders" && <RemindersSection />}
      {section === "content" && <ContentSection staffSecret={staffSecret} />}
      {section === "events" && <EventsSection />}
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

function ReminderForm({
  onDone,
  onCancel,
  initialDue,
}: {
  onDone: () => void;
  onCancel: () => void;
  initialDue?: string;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assigned, setAssigned] = useState("");
  const [due, setDue] = useState(initialDue || todayStr());
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [saving, setSaving] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  useEffect(() => {
    listCoaches().then(setCoaches).catch(() => {});
  }, []);

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
        <select
          value={assigned}
          onChange={(e) => setAssigned(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Anyone on shift</option>
          {coaches.map((c) => (
            <option key={c.user_id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
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

function ContentSection({ staffSecret }: { staffSecret: string }) {
  const [items, setItems] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const [prefill, setPrefill] = useState("");

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

  const useCaption = (text: string) => {
    setPrefill(text);
    setAdding(true);
    setShowIdeas(false);
  };

  const queued = items.filter((p) => p.status !== "posted");
  const posted = items.filter((p) => p.status === "posted");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {queued.filter((p) => isDue(p.scheduled_for)).length} due to post · {queued.length} queued
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowIdeas((v) => !v)}
          >
            <Sparkles className="h-4 w-4" /> Idea generator
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { setPrefill(""); setAdding((v) => !v); }}>
            <Plus className="h-4 w-4" /> New post
          </Button>
        </div>
      </div>

      {showIdeas && <IdeaGenerator staffSecret={staffSecret} onUse={useCaption} />}

      {adding && (
        <PostForm
          initialCaption={prefill}
          onDone={() => {
            setAdding(false);
            setPrefill("");
            load();
          }}
          onCancel={() => {
            setAdding(false);
            setPrefill("");
          }}
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

function PostForm({
  onDone,
  onCancel,
  initialCaption = "",
  initialDate,
}: {
  onDone: () => void;
  onCancel: () => void;
  initialCaption?: string;
  initialDate?: string;
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [destination, setDestination] = useState<Destination>("main");
  const [when, setWhen] = useState(initialDate || todayStr());
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

function IdeaGenerator({
  staffSecret,
  onUse,
}: {
  staffSecret: string;
  onUse: (text: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [destination, setDestination] = useState<Destination>("main");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdeas | null>(null);

  const run = async () => {
    if (!topic.trim()) return toast.error("Give it a topic to work with");
    setLoading(true);
    setIdeas(null);
    const r = await generateIdeas(staffSecret, { topic, destination, tone });
    setLoading(false);
    if (r.ok && r.ideas) setIdeas(r.ideas);
    else toast.error(r.error || "Couldn't generate — try again");
  };

  const copy = (t: string) => {
    navigator.clipboard?.writeText(t).then(
      () => toast.success("Copied"),
      () => {},
    );
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> Content idea generator
      </div>
      <Input
        placeholder="Topic — e.g. the million-metre challenge, metabolic adaptation, our Xmas party"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && run()}
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
        <Input placeholder="Tone (optional) — e.g. playful, inspiring" value={tone} onChange={(e) => setTone(e.target.value)} />
      </div>
      <Button className="w-full gap-1" disabled={loading} onClick={run}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Thinking…" : "Generate ideas"}
      </Button>

      {ideas && (
        <div className="space-y-3 pt-1">
          <IdeaGroup title="Captions" items={ideas.captions} onUse={onUse} onCopy={copy} useable />
          <IdeaGroup title="Story ideas" items={ideas.stories} onCopy={copy} />
          <IdeaGroup title="Future angles" items={ideas.angles} onCopy={copy} />
        </div>
      )}
    </div>
  );
}

function IdeaGroup({
  title,
  items,
  onUse,
  onCopy,
  useable = false,
}: {
  title: string;
  items: string[];
  onUse?: (t: string) => void;
  onCopy: (t: string) => void;
  useable?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <ChevronDown className="h-3 w-3" /> {title}
      </p>
      {items.map((t, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-2.5 text-sm">
          <p className="whitespace-pre-line">{t}</p>
          <div className="flex gap-2 mt-2">
            {useable && onUse && (
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onUse(t)}>
                <Plus className="h-3.5 w-3.5" /> Use in a post
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onCopy(t)}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Calendar view ────────────────────────────────────────────────────────────
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fromKey = (s: string) => new Date(s + "T00:00:00Z");
const toKey = (d: Date) => d.toISOString().slice(0, 10);
// Monday=0 index for a date.
const mondayIdx = (d: Date) => (d.getUTCDay() + 6) % 7;

function CalendarSection({ staffSecret }: { staffSecret: string }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(() => todayStr()); // a date inside the shown period
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<"reminder" | "post" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p, e] = await Promise.all([listReminders(), listPosts(), listEvents()]);
      setReminders(r);
      setPosts(p);
      setEvents(e);
    } catch {
      toast.error("Couldn't load the calendar");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Visible grid range.
  const a = fromKey(anchor);
  let gridStart: Date;
  let gridEnd: Date;
  if (mode === "week") {
    gridStart = new Date(a);
    gridStart.setUTCDate(a.getUTCDate() - mondayIdx(a));
    gridEnd = new Date(gridStart);
    gridEnd.setUTCDate(gridStart.getUTCDate() + 6);
  } else {
    const first = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
    gridStart = new Date(first);
    gridStart.setUTCDate(first.getUTCDate() - mondayIdx(first));
    const last = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 0));
    gridEnd = new Date(last);
    gridEnd.setUTCDate(last.getUTCDate() + (6 - mondayIdx(last)));
  }

  const days: string[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setUTCDate(d.getUTCDate() + 1)) days.push(toKey(d));
  const byDay = buildCalendar(reminders, posts, toKey(gridStart), toKey(gridEnd), events);

  const shift = (dir: 1 | -1) => {
    const d = fromKey(anchor);
    if (mode === "week") d.setUTCDate(d.getUTCDate() + 7 * dir);
    else d.setUTCMonth(d.getUTCMonth() + dir);
    setAnchor(toKey(d));
    setSelected(null);
    setAddKind(null);
  };

  const title =
    mode === "week"
      ? `Week of ${fromKey(days[0]).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : a.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const monthOf = a.getUTCMonth();
  const todayKey = todayStr();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[150px] text-center">{title}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="ml-1" onClick={() => { setAnchor(todayStr()); setSelected(null); }}>
            Today
          </Button>
        </div>
        <div className="flex gap-1.5">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {m === "month" ? "Month" : "Week"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-border bg-border">
            {WD.map((w) => (
              <div key={w} className="bg-muted/50 py-1 text-center text-[11px] font-medium text-muted-foreground">
                {w}
              </div>
            ))}
            {days.map((dk) => {
              const items = byDay[dk] ?? [];
              const inMonth = mode === "week" || fromKey(dk).getUTCMonth() === monthOf;
              const isToday = dk === todayKey;
              return (
                <button
                  key={dk}
                  onClick={() => { setSelected(dk); setAddKind(null); }}
                  className={`min-h-[76px] bg-card p-1 text-left align-top transition hover:bg-muted/40 ${
                    inMonth ? "" : "opacity-40"
                  } ${selected === dk ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <div className={`text-[11px] font-medium mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {fromKey(dk).getUTCDate()}
                    {isToday ? " • today" : ""}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, mode === "week" ? 8 : 3).map((it) => (
                      <CalChip key={it.key} it={it} />
                    ))}
                    {items.length > (mode === "week" ? 8 : 3) && (
                      <div className="text-[10px] text-muted-foreground">+{items.length - (mode === "week" ? 8 : 3)} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <DayPanel
              date={selected}
              items={byDay[selected] ?? []}
              addKind={addKind}
              onAdd={setAddKind}
              onChanged={() => { setAddKind(null); load(); }}
            />
          )}
        </>
      )}
    </div>
  );
}

const eventStyle = "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium";
function CalChip({ it }: { it: CalItem }) {
  const base =
    it.kind === "event"
      ? eventStyle
      : it.kind === "post"
        ? destStyle[it.post!.destination]
        : it.recurring
          ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
          : "bg-violet-500/10 text-violet-700 dark:text-violet-400";
  return (
    <div className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate flex items-center gap-0.5 ${base}`}>
      {it.kind === "event" && <CalendarDays className="h-2.5 w-2.5 shrink-0" />}
      {it.kind === "reminder" && it.recurring && <RepeatIcon2 className="h-2.5 w-2.5 shrink-0" />}
      {it.kind === "post" && <CalendarClock className="h-2.5 w-2.5 shrink-0" />}
      <span className="truncate">{it.title}</span>
    </div>
  );
}

function DayPanel({
  date,
  items,
  addKind,
  onAdd,
  onChanged,
}: {
  date: string;
  items: CalItem[];
  addKind: "reminder" | "post" | null;
  onAdd: (k: "reminder" | "post" | null) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const nice = fromKey(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" /> {nice}
        </h3>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => onAdd(addKind === "reminder" ? null : "reminder")}>
            + Reminder
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAdd(addKind === "post" ? null : "post")}>
            + Post
          </Button>
        </div>
      </div>

      {addKind === "reminder" && (
        <ReminderForm initialDue={date} onDone={onChanged} onCancel={() => onAdd(null)} />
      )}
      {addKind === "post" && (
        <PostForm initialDate={date} onDone={onChanged} onCancel={() => onAdd(null)} />
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing scheduled. Add a reminder or post above.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) =>
            editing === it.key && it.kind === "reminder" ? (
              <EditOccurrenceForm
                key={it.key}
                item={it}
                date={date}
                onDone={() => { setEditing(null); onChanged(); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={it.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    it.kind === "event"
                      ? eventStyle
                      : it.kind === "post"
                        ? destStyle[it.post!.destination]
                        : "bg-violet-500/10 text-violet-700 dark:text-violet-400"
                  }`}
                >
                  {it.kind === "event"
                    ? EVENT_KIND_LABEL[it.event!.kind]
                    : it.kind === "post"
                      ? DESTINATION_LABEL[it.post!.destination]
                      : it.recurring
                        ? "Recurring"
                        : "Reminder"}
                </span>
                {it.kind === "reminder" ? (
                  <button className="truncate text-left hover:underline flex-1" onClick={() => setEditing(it.key)}>
                    {it.title}
                    {it.reminder?.assigned_to ? <span className="text-muted-foreground"> · {it.reminder.assigned_to}</span> : ""}
                  </button>
                ) : (
                  <span className="truncate">{it.title}</span>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EditOccurrenceForm({
  item,
  date,
  onDone,
  onCancel,
}: {
  item: CalItem;
  date: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const r = item.reminder!;
  const [title, setTitle] = useState(r.title);
  const [detail, setDetail] = useState(r.detail || "");
  const [assigned, setAssigned] = useState(r.assigned_to || "");
  const [scope, setScope] = useState<"all" | "one">("all");
  const [saving, setSaving] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  useEffect(() => {
    listCoaches().then(setCoaches).catch(() => {});
  }, []);

  const patch = { title, detail, assigned_to: assigned };

  const save = async () => {
    if (!title.trim()) return toast.error("Give it a title");
    setSaving(true);
    let res;
    if (r.repeat !== "none" && scope === "one") res = await splitOccurrence(r, date, patch);
    else res = await updateReminder(r.id, patch);
    setSaving(false);
    if (res.ok) {
      toast.success("Saved");
      onDone();
    } else toast.error(res.error || "Couldn't save");
  };

  const remove = async () => {
    setSaving(true);
    let res;
    if (r.repeat !== "none" && scope === "one") res = await splitOccurrence(r, date, null);
    else res = await deleteReminder(r.id);
    setSaving(false);
    if (res.ok) {
      toast.success(r.repeat !== "none" && scope === "one" ? "This day removed" : "Deleted");
      onDone();
    } else toast.error(res.error || "Couldn't remove");
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-card p-3 space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} placeholder="Detail (optional)" />
      <select
        value={assigned}
        onChange={(e) => setAssigned(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Anyone on shift</option>
        {coaches.map((c) => (
          <option key={c.user_id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {r.repeat !== "none" && (
        <div className="flex gap-1.5 text-xs">
          {(["all", "one"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-2.5 py-1 font-medium transition ${
                scope === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s === "all" ? "Every occurrence" : "Just this day"}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
        <Button size="sm" variant="outline" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="ghost" className="text-red-500" disabled={saving} onClick={remove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Events / marketing campaigns ─────────────────────────────────────────────
const EVENT_KINDS: EventKind[] = ["event", "campaign", "promo", "other"];
function EventsSection() {
  const [events, setEvents] = useState<StaffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await listEvents());
    } catch {
      toast.error("Couldn't load events");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();
  const upcoming = events.filter((e) => (e.end_date || e.start_date) >= today);
  const past = events.filter((e) => (e.end_date || e.start_date) < today);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming · hidden from members
        </p>
        <Button size="sm" className="gap-1" onClick={() => { setAdding((v) => !v); setEditId(null); }}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      {adding && <EventForm onDone={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}

      {loading ? (
        <Spinner />
      ) : upcoming.length === 0 && past.length === 0 ? (
        <EmptyState text="No events planned. Add a campaign or event to get ahead." />
      ) : (
        <>
          <div className="space-y-2">
            {upcoming.map((e) =>
              editId === e.id ? (
                <EventForm key={e.id} event={e} onDone={() => { setEditId(null); load(); }} onCancel={() => setEditId(null)} />
              ) : (
                <EventRow key={e.id} e={e} onEdit={() => setEditId(e.id)} onChanged={load} />
              ),
            )}
          </div>
          {past.length > 0 && (
            <details className="pt-1">
              <summary className="text-xs text-muted-foreground cursor-pointer">Past ({past.length})</summary>
              <div className="space-y-2 mt-2">
                {past.map((e) => (
                  <EventRow key={e.id} e={e} onEdit={() => setEditId(e.id)} onChanged={load} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function EventRow({ e, onEdit, onChanged }: { e: StaffEvent; onEdit: () => void; onChanged: () => void }) {
  const range =
    e.end_date && e.end_date !== e.start_date
      ? `${fmtDate(e.start_date)} → ${fmtDate(e.end_date)}`
      : fmtDate(e.start_date);
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
        {EVENT_KIND_LABEL[e.kind]}
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
        <p className="font-semibold text-sm">{e.title}</p>
        <p className="text-[11px] text-muted-foreground">{range}</p>
        {e.notes && <p className="text-xs mt-1">{e.notes}</p>}
      </button>
      <button className="text-muted-foreground shrink-0" onClick={() => deleteEvent(e.id).then(onChanged)}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function EventForm({ event, onDone, onCancel }: { event?: StaffEvent; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "event");
  const [start, setStart] = useState(event?.start_date ?? todayStr());
  const [end, setEnd] = useState(event?.end_date ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error("Give the event a title");
    if (end && end < start) return toast.error("End date is before the start");
    setSaving(true);
    const payload = { title, kind, start_date: start, end_date: end || null, notes };
    const r = event
      ? await updateEvent(event.id, payload)
      : await createEvent({ ...payload, created_by: staffName() || "Staff" });
    setSaving(false);
    if (r.ok) {
      toast.success(event ? "Updated" : "Event added");
      onDone();
    } else toast.error(r.error || "Couldn't save");
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
      <Input placeholder="Event / campaign name" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as EventKind)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {EVENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {EVENT_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <div>
          <label className="text-[10px] text-muted-foreground">Start</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">End (optional)</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <Textarea placeholder="Notes / plan (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saving} onClick={submit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : event ? "Save" : "Add event"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
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
