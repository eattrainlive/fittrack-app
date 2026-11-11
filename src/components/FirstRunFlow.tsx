// Single first-run flow for a logged-in member. Runs ONE card at a time, in
// order, and skips any step already done — so members never get the medical
// form, the install prompt and an event popup stacked on top of each other
// (which was leaving people stuck on the home screen).
//
//   1. Medical form (PAR-Q)      — only if theirs is missing/expired
//   2. Add app to your phone     — only if not already installed / not seen
//   3. Live event / info push    — only if there's one and they haven't seen it
//
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/authUser";
import { supabase } from "@/lib/supabase";
import { ParqForm } from "./ParqForm";
import { getMyParqStatus } from "@/lib/parq";
import { getUpcomingEvents, type CommunityEvent } from "@/lib/communityEvents";
import {
  getRsvpAggregates,
  setRsvp,
  type RsvpAggregate,
  type RsvpStatus,
} from "@/lib/communityRsvp";
import { Button } from "./ui/button";
import {
  Dumbbell,
  Share,
  MoreVertical,
  PlusSquare,
  Calendar,
  MapPin,
  Check,
  Star,
  XCircle,
  PartyPopper,
  X,
} from "lucide-react";

const INSTALL_SNOOZE = "etl_install_snooze_until"; // ms timestamp; re-nudge after
const INSTALL_SNOOZE_DAYS = 7; // show again ~weekly until they actually install
const EVENTS_SEEN = "etl_events_popup_seen";
const EVENTS_CAMPAIGN = "xmas-games-2026"; // bump to re-show for a new set of events

type Step = "parq" | "install" | "events";

const isStandalone = () => {
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone === true
    );
  } catch {
    return false;
  }
};
const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

export function FirstRunFlow() {
  const [queue, setQueue] = useState<Step[] | null>(null); // null = still deciding
  const [idx, setIdx] = useState(0);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [aggs, setAggs] = useState<Record<string, RsvpAggregate>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) return;
    decided.current = true;
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await getCurrentUser();
      if (!user) {
        if (alive) setQueue([]);
        return;
      }
      const steps: Step[] = [];

      // 1. PAR-Q — members only (staff are exempt). Fail open on any error.
      if (!isStaff()) {
        try {
          const st: any = await getMyParqStatus();
          if (!st?.valid) steps.push("parq");
        } catch {
          /* don't block on a status error */
        }
      }

      // 2. Install guide — members only (staff work on a laptop/browser, so the
      // prompt would keep re-triggering for them). Show to anyone NOT already
      // running the installed app; once installed (standalone) it never shows
      // again; if a member skips without installing we re-nudge roughly weekly.
      if (!isStaff() && !isStandalone()) {
        const snoozeUntil = Number(localStorage.getItem(INSTALL_SNOOZE) || 0);
        if (!snoozeUntil || Date.now() > snoozeUntil) steps.push("install");
      }

      // 3. Live events — only if there are any and they haven't seen this set.
      if (localStorage.getItem(EVENTS_SEEN) !== EVENTS_CAMPAIGN) {
        try {
          const evs = await getUpcomingEvents();
          if (evs.length) {
            const a = await getRsvpAggregates(
              evs.map((e) => e.id),
              user.id,
            );
            if (alive) {
              setEvents(evs);
              setAggs(a);
              steps.push("events");
            }
          }
        } catch {
          /* no events / error — skip */
        }
      }

      if (alive) {
        setQueue(steps);
        setIdx(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!queue || idx >= queue.length) return null;
  const step = queue[idx];
  const advance = () => setIdx((i) => i + 1);

  // ── Step 1: medical form ───────────────────────────────────────────────────
  if (step === "parq") {
    return <ParqForm softFail onDone={advance} />;
  }

  // ── Step 2: add to home screen ─────────────────────────────────────────────
  if (step === "install") {
    const done = () => {
      try {
        localStorage.setItem(
          INSTALL_SNOOZE,
          String(Date.now() + INSTALL_SNOOZE_DAYS * 86400000),
        );
      } catch {
        /* ignore */
      }
      advance();
    };
    return <InstallCard onDone={done} />;
  }

  // ── Step 3: event / info push ──────────────────────────────────────────────
  const dismissEvents = () => {
    try {
      localStorage.setItem(EVENTS_SEEN, EVENTS_CAMPAIGN);
    } catch {
      /* ignore */
    }
    advance();
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

  return (
    <FullScreenCard>
      <div className="flex items-center gap-2 mb-1">
        <PartyPopper className="h-6 w-6 text-primary" />
        <h1 className="font-heading text-2xl uppercase tracking-wide">
          What's on at ETL
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Coming up with the tribe — let us know if you're in.
      </p>
      <div className="space-y-3">
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
      <Button className="w-full mt-5" onClick={dismissEvents}>
        Done
      </Button>
    </FullScreenCard>
  );
}

// ── Shared full-screen single-card shell ─────────────────────────────────────
function FullScreenCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-md py-6">
          <div className="flex items-center gap-2 mb-5">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg uppercase tracking-wider mt-0.5">
              Eat Train Live
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── "Add to your phone" card ─────────────────────────────────────────────────
function InstallCard({ onDone }: { onDone: () => void }) {
  return (
    <FullScreenCard>
      <h1 className="font-heading text-2xl uppercase tracking-wide">
        Add ETL to your phone
      </h1>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Pop the app on your home screen so it opens in one tap and feels like a
        proper app — no more digging through your browser.
      </p>

      <div className="space-y-3">
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="font-bold text-sm flex items-center gap-2">
            <Share className="h-4 w-4 text-primary" /> iPhone / iPad (Safari)
          </p>
          <ol className="text-sm text-foreground/90 space-y-1 list-decimal ml-5">
            <li>
              Tap the <strong>Share</strong> button at the bottom of Safari.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> — done.
            </li>
          </ol>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="font-bold text-sm flex items-center gap-2">
            <MoreVertical className="h-4 w-4 text-primary" /> Android (Chrome)
          </p>
          <ol className="text-sm text-foreground/90 space-y-1 list-decimal ml-5">
            <li>
              Tap the <strong>⋮ menu</strong> (top right of Chrome).
            </li>
            <li>
              Tap <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>.
            </li>
            <li>
              Tap <strong>Install / Add</strong> — done.
            </li>
          </ol>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 text-xs text-muted-foreground">
        <PlusSquare className="h-4 w-4 shrink-0" />
        You only need to do this once.
      </div>

      <Button className="w-full mt-4" onClick={onDone}>
        I've done it / continue
      </Button>
      <button
        onClick={onDone}
        className="w-full text-center text-xs text-muted-foreground mt-2 py-1"
      >
        Skip for now
      </button>
    </FullScreenCard>
  );
}

export default FirstRunFlow;
