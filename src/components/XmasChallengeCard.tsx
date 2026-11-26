// Member-facing Christmas challenge: 12 active days in Dec, progress + calendar + raffle status.
// Renders nothing unless the challenge is enabled (so it only appears in December / when switched on).
import { useEffect, useState } from "react";
import { Gift, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { getMyChallenge, challengeDays, type MyChallenge } from "@/lib/xmasChallenge";

export function XmasChallengeCard() {
  const [c, setC] = useState<MyChallenge | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { getMyChallenge().then(setC).catch(() => {}); }, []);

  if (!c || !c.enabled) return null;
  // Hide only after the challenge is well over (end + short grace so the final
  // tally and raffle winner still show). Before the start date we show a preview.
  const todayStr = new Date().toISOString().slice(0, 10);
  const graceEnd = new Date(c.end + "T00:00:00Z"); graceEnd.setUTCDate(graceEnd.getUTCDate() + 10);
  if (todayStr > graceEnd.toISOString().slice(0, 10)) return null;

  // Pre-launch preview: challenge switched on but not started yet → show the rules, not a tracker.
  if (todayStr < c.start) {
    const starts = new Date(c.start + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    return (
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-emerald-500/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <div className="font-bold text-sm">{c.title}</div>
            <div className="text-[11px] font-semibold text-red-600 dark:text-red-400">Starts {starts} 🎄</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>Get <span className="font-semibold text-foreground">{c.target} active days</span> between {new Date(c.start + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} and {new Date(c.end + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to enter the raffle for a free {c.prize}.</p>
          <p>Each day counts once — a <span className="font-medium text-foreground">gym scan</span>, a <span className="font-medium text-foreground">24hr visit</span>, or a <span className="font-medium text-foreground">booked class/PT</span>. Cancel a session and that day drops off.</p>
          <p className="text-[11px]">Your tracker appears here on {starts}. Good luck! 🎁</p>
        </div>
      </div>
    );
  }

  const done = new Set(c.days);
  const pct = Math.min(100, Math.round((c.count / c.target) * 100));
  const all = challengeDays(c.start, c.end);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-emerald-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <div className="font-bold text-sm">{c.title}</div>
            <div className="text-[11px] text-muted-foreground">12 active days → win a {c.prize}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold tabular-nums">{c.count}<span className="text-sm font-medium text-muted-foreground">/{c.target}</span></div>
          <div className="text-[10px] text-muted-foreground">days done</div>
        </div>
      </div>

      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {c.qualified ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" /> You've hit 12 — you're in the raffle! 🎄
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          {c.target - c.count} more {c.target - c.count === 1 ? "day" : "days"} — any gym scan, 24hr visit or class/PT counts (one a day).
        </div>
      )}

      {c.winnerAnnounced && (
        <div className="text-xs font-medium text-red-700 dark:text-red-400">🎁 Raffle winner: {c.winnerAnnounced}</div>
      )}

      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline">
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} {open ? "Hide" : "Show"} my days
      </button>

      {open && (
        <div className="grid grid-cols-8 gap-1.5">
          {all.map((d) => {
            const isDone = done.has(d);
            const isToday = d === today;
            const dayNum = Number(d.slice(8, 10));
            return (
              <div key={d} title={d}
                className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-semibold border ${
                  isDone ? "bg-emerald-500 text-white border-emerald-500"
                  : isToday ? "border-red-500 text-red-600 dark:text-red-400"
                  : "border-border text-muted-foreground"}`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : dayNum}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default XmasChallengeCard;
