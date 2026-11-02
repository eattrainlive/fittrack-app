// One-time popup on app open: shows upcoming community events (e.g. Xmas party,
// Games day) and lets members RSVP. Answers write to community_event_rsvps via
// setRsvp, so they feed the same totals shown on the Community events page.
// Shows once per member per campaign (bump CAMPAIGN to re-announce).
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Check, Star, XCircle, X, PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getUpcomingEvents, type CommunityEvent } from "@/lib/communityEvents";
import {
  getRsvpAggregates,
  setRsvp,
  type RsvpAggregate,
  type RsvpStatus,
} from "@/lib/communityRsvp";

const CAMPAIGN = "xmas-games-2026"; // bump this to re-show for a new set of events
const SEEN_KEY = "etl_events_popup_seen";

const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
};

export function EventsAnnouncement() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [aggs, setAggs] = useState<Record<string, RsvpAggregate>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    // NOTE: staff are currently included so Michael can test on his own account.
    // To exclude staff for launch, uncomment the next line:
    // if (localStorage.getItem("fittrack_is_staff") === "true") return;
    // Already seen this campaign.
    if (localStorage.getItem(SEEN_KEY) === CAMPAIGN) return;

    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const evs = await getUpcomingEvents();
      if (!alive || !evs.length) return; // nothing to announce — don't mark seen
      const a = await getRsvpAggregates(
        evs.map((e) => e.id),
        user.id,
      );
      if (!alive) return;
      setEvents(evs);
      setAggs(a);
      setOpen(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, CAMPAIGN);
    setOpen(false);
  };

  const rsvp = async (eventId: string, status: RsvpStatus) => {
    const cur = aggs[eventId] || {
      attending: 0,
      interested: 0,
      not_attending: 0,
      mine: null,
    };
    setBusy(eventId);
    const ok = await setRsvp(eventId, status, cur.mine);
    setBusy(null);
    if (!ok) return;
    // Update local counts so the popup reflects the change immediately.
    const next: RsvpAggregate = { ...cur };
    const dec = (s: RsvpStatus | null) => {
      if (s === "attending") next.attending = Math.max(0, next.attending - 1);
      else if (s === "not_attending")
        next.not_attending = Math.max(0, next.not_attending - 1);
      else if (s === "interested")
        next.interested = Math.max(0, next.interested - 1);
    };
    if (cur.mine === status) {
      dec(cur.mine);
      next.mine = null;
    } else {
      dec(cur.mine);
      if (status === "attending") next.attending++;
      else if (status === "not_attending") next.not_attending++;
      next.mine = status;
    }
    setAggs((p) => ({ ...p, [eventId]: next }));
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="w-[92vw] max-w-md bg-card border-border max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wider flex items-center gap-2 uppercase">
            <PartyPopper className="h-5 w-5 text-primary" />
            What's on at ETL
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Coming up with the tribe — let us know if you're in.
        </p>

        <div className="space-y-3 pt-1">
          {events.map((e) => {
            const a = aggs[e.id];
            const going = a?.attending ?? 0;
            const interested = a?.interested ?? 0;
            const mine = a?.mine ?? null;
            return (
              <div
                key={e.id}
                className="rounded-xl border border-border overflow-hidden"
              >
                {e.image_url && (
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    <img
                      src={e.image_url}
                      alt={e.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <p className="font-bold text-sm">{e.title}</p>
                  <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                    {e.event_at && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> {fmtWhen(e.event_at)}
                      </span>
                    )}
                    {e.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </span>
                    )}
                  </div>
                  {(going > 0 || interested > 0) && (
                    <p className="text-[11px] font-semibold text-primary">
                      {going} going
                      {interested > 0 && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {interested} interested
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex gap-1.5 pt-0.5">
                    <Button
                      size="sm"
                      variant={mine === "attending" ? "default" : "outline"}
                      className="flex-1 flex-col h-auto py-2 gap-1 text-[11px]"
                      disabled={busy === e.id}
                      onClick={() => rsvp(e.id, "attending")}
                    >
                      <Check className="h-4 w-4" /> Attending
                    </Button>
                    <Button
                      size="sm"
                      variant={mine === "interested" ? "secondary" : "outline"}
                      className="flex-1 flex-col h-auto py-2 gap-1 text-[11px]"
                      disabled={busy === e.id}
                      onClick={() => rsvp(e.id, "interested")}
                    >
                      <Star className="h-4 w-4" /> Interested
                    </Button>
                    <Button
                      size="sm"
                      variant={mine === "not_attending" ? "secondary" : "outline"}
                      className="flex-1 flex-col h-auto py-2 gap-1 text-[11px]"
                      disabled={busy === e.id}
                      onClick={() => rsvp(e.id, "not_attending")}
                    >
                      <XCircle className="h-4 w-4" /> Not attending
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="ghost" className="w-full gap-1.5 mt-1" onClick={dismiss}>
          <X className="h-4 w-4" /> Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
