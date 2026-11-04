// Shows the member's remaining class / PT credits for the current period.
// Self-contained: fetches on mount, renders nothing if the membership has no
// credit allowance (e.g. open gym) or isn't synced yet.
import { useEffect, useState } from "react";
import { Ticket, Dumbbell, Infinity as InfinityIcon } from "lucide-react";
import { getMyCredits, type MemberCredits, type CreditLine } from "@/lib/memberCredits";

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

function CreditRow({
  icon,
  label,
  line,
}: {
  icon: React.ReactNode;
  label: string;
  line: CreditLine;
}) {
  const unlimited = line.remaining === null;
  const remaining = line.remaining ?? 0;
  const low = !unlimited && line.allowance !== "unlimited" && remaining <= 1;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight">{label}</p>
        {unlimited ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <InfinityIcon className="h-3 w-3" /> Unlimited
          </p>
        ) : (
          <p
            className={`text-xs ${low ? "text-destructive font-semibold" : "text-muted-foreground"}`}
          >
            {remaining} of {line.allowance} left · {line.used} used
          </p>
        )}
      </div>
    </div>
  );
}

export function MemberCreditsCard() {
  const [credits, setCredits] = useState<MemberCredits | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyCredits().then((c) => {
      if (alive) {
        setCredits(c);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || !credits) return null;
  if (!credits.classes && !credits.pt) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading uppercase tracking-wide text-sm">
          Your credits this period
        </p>
        <span className="text-[11px] text-muted-foreground">
          resets {fmtDate(credits.resetDate)}
        </span>
      </div>
      {credits.classes && (
        <CreditRow
          icon={<Ticket className="h-5 w-5" />}
          label="Classes"
          line={credits.classes}
        />
      )}
      {credits.pt && (
        <CreditRow
          icon={<Dumbbell className="h-5 w-5" />}
          label="PT sessions"
          line={credits.pt}
        />
      )}
    </div>
  );
}

export default MemberCreditsCard;
