import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  Check,
  Star,
  XCircle,
  Users,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getUpcomingEvents,
  getAllEvents,
  saveEvent,
  deleteEvent,
  uploadEventImage,
  isStaff,
  type CommunityEvent,
} from "@/lib/communityEvents";
import {
  getRsvpAggregates,
  setRsvp,
  getRsvpNames,
  type RsvpStatus,
  type RsvpAggregate,
  type RsvpName,
} from "@/lib/communityRsvp";
import { uploadWallImage } from "@/lib/communityWall";
import { supabase } from "@/lib/supabase";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

const fmtEventDate = (iso: string, endsIso?: string | null) => {
  try {
    const d = new Date(iso);
    const startStr = format(d, "EEE d MMM · h:mma").replace(":00", "");
    if (!endsIso) return startStr;
    const e = new Date(endsIso);
    if (isNaN(e.getTime())) return startStr;
    const endStr = format(e, "h:mma").replace(":00", "");
    return `${startStr}–${endStr}`;
  } catch {
    return iso;
  }
};

const toLocalInput = (iso: string) => {
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const staff = isStaff();

  const [editing, setEditing] = useState<CommunityEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<Record<string, RsvpAggregate>>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState<string | null>(null);
  const [namesFor, setNamesFor] = useState<string | null>(null);
  const [names, setNames] = useState<RsvpName[]>([]);
  const [namesLoading, setNamesLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = staff ? await getAllEvents() : await getUpcomingEvents();
    setEvents(data);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyId(user?.id ?? null);
    if (data.length) {
      const agg = await getRsvpAggregates(
        data.map((d) => d.id),
        user?.id ?? "",
      );
      setRsvps(agg);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRsvp = async (eventId: string, status: RsvpStatus) => {
    const current = rsvps[eventId]?.mine ?? null;
    setRsvpBusy(eventId);
    const ok = await setRsvp(eventId, status, current);
    setRsvpBusy(null);
    if (ok) {
      const a = rsvps[eventId] || {
        attending: 0,
        interested: 0,
        not_attending: 0,
        mine: null,
      };
      const next = { ...a };
      if (a.mine === "attending") next.attending--;
      else if (a.mine === "interested") next.interested--;
      else if (a.mine === "not_attending") next.not_attending--;
      if (a.mine === status) {
        next.mine = null;
      } else {
        if (status === "attending") next.attending++;
        else if (status === "interested") next.interested++;
        else if (status === "not_attending") next.not_attending++;
        next.mine = status;
      }
      setRsvps({ ...rsvps, [eventId]: next });
    } else {
      toast.error("Couldn't save your RSVP");
    }
  };

  const openNames = async (eventId: string) => {
    setNamesFor(eventId);
    setNamesLoading(true);
    setNames([]);
    const data = await getRsvpNames(eventId);
    setNames(data);
    setNamesLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (ev: CommunityEvent) => {
    setEditing(ev);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await deleteEvent(deleteId);
    setDeleteId(null);
    if (ok) {
      toast.success("Event deleted");
      load();
    } else {
      toast.error("Couldn't delete event");
    }
  };

  return (
    <div className="space-y-4">
      {staff && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add event
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          No upcoming events. Check back soon!
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              {ev.image_url && (
                <img
                  src={ev.image_url}
                  alt={ev.title}
                  loading="lazy"
                  className="w-full h-auto block"
                />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-lg tracking-wide leading-tight">
                    {ev.title}
                  </h3>
                  {staff && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(ev)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(ev.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {fmtEventDate(ev.event_at, ev.ends_at)}
                </div>
                {ev.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {ev.location}
                  </div>
                )}
                {ev.description && (
                  <p className="text-sm text-muted-foreground/90 whitespace-pre-wrap pt-1">
                    {ev.description}
                  </p>
                )}
                {ev.link && (
                  <a
                    href={ev.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary font-medium pt-1"
                  >
                    More info / Book <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {staff && !ev.published && (
                  <span className="inline-block text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                    Draft
                  </span>
                )}

                {/* RSVP controls */}
                {ev.published && (
                  <div className="pt-2 space-y-2">
                    <div className="flex gap-1.5">
                      {(
                        [
                          {
                            s: "attending",
                            icon: <Check className="h-3.5 w-3.5" />,
                            label: "Attending",
                          },
                          {
                            s: "interested",
                            icon: <Star className="h-3.5 w-3.5" />,
                            label: "Interested",
                          },
                          {
                            s: "not_attending",
                            icon: <XCircle className="h-3.5 w-3.5" />,
                            label: "Not attending",
                          },
                        ] as const
                      ).map(({ s, icon, label }) => {
                        const mine = rsvps[ev.id]?.mine === s;
                        const busy = rsvpBusy === ev.id;
                        return (
                          <button
                            key={s}
                            disabled={busy || !myId}
                            onClick={() => handleRsvp(ev.id, s)}
                            className={`flex-1 inline-flex items-center justify-center gap-1 text-xs font-medium px-2 py-2 rounded-lg border transition disabled:opacity-50 ${
                              mine
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40"
                            }`}
                          >
                            {icon}
                            <span className="hidden xs:inline sm:inline">
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3 w-3 text-primary" />
                        {rsvps[ev.id]?.attending ?? 0} going
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {rsvps[ev.id]?.interested ?? 0} interested
                      </span>
                      {staff && (
                        <button
                          onClick={() => openNames(ev.id)}
                          className="ml-auto inline-flex items-center gap-1 text-primary font-medium"
                        >
                          <Users className="h-3 w-3" /> Names
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventForm
        open={showForm}
        onOpenChange={setShowForm}
        event={editing}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff: names per RSVP bucket */}
      <Sheet open={!!namesFor} onOpenChange={(o) => !o && setNamesFor(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>RSVPs</SheetTitle>
          </SheetHeader>
          {namesLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : names.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No RSVPs yet.
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              {(["attending", "interested", "not_attending"] as const).map(
                (bucket) => {
                  const list = names.filter((n) => n.status === bucket);
                  if (list.length === 0) return null;
                  const label =
                    bucket === "attending"
                      ? "Attending"
                      : bucket === "interested"
                        ? "Interested"
                        : "Not attending";
                  return (
                    <div key={bucket} className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {label} · {list.length}
                      </p>
                      <div className="space-y-1">
                        {list.map((n) => (
                          <div
                            key={n.user_id}
                            className="text-sm bg-muted/40 rounded-lg px-3 py-2"
                          >
                            {n.full_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventForm({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: CommunityEvent | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventAt, setEventAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      if (url) setImageUrl(url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't upload image");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setDescription(event?.description ?? "");
      setEventAt(event ? toLocalInput(event.event_at) : "");
      setEndsAt(event?.ends_at ? toLocalInput(event.ends_at) : "");
      setLocation(event?.location ?? "");
      setLink(event?.link ?? "");
      setImageUrl(event?.image_url ?? "");
      setPublished(event?.published ?? true);
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!title.trim() || !eventAt) {
      toast.error("Title and date/time are required");
      return;
    }
    const startIso = new Date(eventAt).toISOString();
    const endIso = endsAt ? new Date(endsAt).toISOString() : null;
    if (endIso && new Date(endIso) <= new Date(startIso)) {
      toast.error("End time must be after the start time");
      return;
    }
    setSaving(true);
    const ok = await saveEvent({
      id: event?.id,
      title: title.trim(),
      description: description.trim() || null,
      event_at: startIso,
      ends_at: endIso,
      location: location.trim() || null,
      link: link.trim() || null,
      image_url: imageUrl.trim() || null,
      published,
    });
    setSaving(false);
    if (ok) {
      toast.success(event ? "Event updated" : "Event added");
      onSaved();
    } else {
      toast.error("Couldn't save event");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Date & time</Label>
            <Input
              type="datetime-local"
              value={eventAt}
              onChange={(e) => setEventAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date &amp; time (optional)</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional location"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Link (More info / Book)</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={imageUrl}
                  alt="Event"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1.5"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 text-muted-foreground hover:border-primary/40 transition disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                <span className="text-xs">
                  {uploading
                    ? "Uploading…"
                    : "Tap to upload an image (max 2MB)"}
                </span>
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
              className="resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label
              htmlFor="ev-pub"
              className="text-sm font-medium cursor-pointer"
            >
              Published (visible to members)
            </Label>
            <Switch
              id="ev-pub"
              checked={published}
              onCheckedChange={setPublished}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
