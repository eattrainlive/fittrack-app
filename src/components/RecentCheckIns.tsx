import { AlertTriangle, Clock } from "lucide-react";

export type RecentCheckIn = {
  name: string;
  time: string;
  result: string;
  membership?: string;
  checkinFor?: string;
  paymentFailed?: boolean;
};

export function RecentCheckIns({ recent }: { recent: RecentCheckIn[] }) {
  if (recent.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Recent check-ins
      </p>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {recent.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm gap-2"
          >
            <span className="truncate text-foreground flex items-center gap-1.5">
              {r.paymentFailed && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              )}
              {r.name}
              {r.checkinFor && (
                <span className="text-muted-foreground text-xs hidden sm:inline">
                  · {r.checkinFor}
                </span>
              )}
              {r.membership && (
                <span className="text-muted-foreground text-xs hidden lg:inline">
                  · {r.membership}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span
                className={`h-2 w-2 rounded-full ${
                  r.result === "granted"
                    ? "bg-primary"
                    : r.result === "unknown_code"
                      ? "bg-destructive"
                      : "bg-amber-500"
                }`}
              />
              <span className="text-muted-foreground text-xs">{r.time}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
