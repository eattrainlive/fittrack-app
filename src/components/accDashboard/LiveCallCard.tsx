import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Join live call" card for the accountability member dashboard.
 *
 * Prominence by UK time (Europe/London):
 *  - Wednesday 00:00–11:59 → "Live call today — {label}"
 *  - Wednesday 12:00–13:00 → "● Live now — Join" (highlighted/pulsing)
 *  - any other time        → quieter "Next live call: {label}"
 *
 * Renders nothing when `callUrl` is empty.
 */
export function LiveCallCard({
  callUrl,
  callLabel,
  readOnly,
}: {
  callUrl?: string | null;
  callLabel?: string | null;
  readOnly?: boolean;
}) {
  if (!callUrl) return null;
  const label = callLabel?.trim() || "Wednesdays 12:00";

  // Europe/London day-of-week + hour. toLocaleString with the tz gives the
  // right local time for DST; a simple day-of-week + hour check is enough.
  const now = new Date();
  const londonParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = londonParts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(londonParts.find((p) => p.type === "hour")?.value ?? "0");
  const isWed = weekday.startsWith("Wed");
  const liveNow = isWed && hour >= 12 && hour < 13;
  const callToday = isWed && hour < 12;

  if (liveNow) {
    return (
      <div className="rounded-xl border border-primary bg-primary/10 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm uppercase tracking-wider text-primary">
              Live now
            </p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
          </div>
          {readOnly ? (
            <span className="text-xs font-medium text-primary">
              Join (preview)
            </span>
          ) : (
            <a
              href={callUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button size="sm" className="gap-1.5">
                <Video className="h-4 w-4" /> Join
              </Button>
            </a>
          )}
        </div>
      </div>
    );
  }

  const headline = callToday ? "Live call today" : "Next live call";
  const accent = callToday
    ? "border-primary/40 bg-primary/5"
    : "border-border bg-card";

  return (
    <div className={`rounded-xl border ${accent} p-4`}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Video className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-heading font-bold text-sm uppercase tracking-wider ${
              callToday ? "text-primary" : "text-foreground"
            }`}
          >
            {headline}
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
        {readOnly ? (
          <span className="text-xs font-medium text-primary">
            Join (preview)
          </span>
        ) : (
          <a
            href={callUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button
              size="sm"
              variant={callToday ? "default" : "outline"}
              className="gap-1.5"
            >
              <Video className="h-4 w-4" /> Join call
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

export default LiveCallCard;
