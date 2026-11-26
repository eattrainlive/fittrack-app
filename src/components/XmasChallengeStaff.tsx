// Staff view of the Christmas challenge: who's qualified + draw the hoodie winner.
import { useCallback, useEffect, useState } from "react";
import { Gift, Trophy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getStaffChallenge, drawRaffle, type StaffChallenge } from "@/lib/xmasChallenge";

export function XmasChallengeStaff({ staffSecret }: { staffSecret: string }) {
  const [c, setC] = useState<StaffChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setC(await getStaffChallenge(staffSecret)); }
    catch (e: any) { toast.error(e.message || "Couldn't load challenge — did the SQL run / fn deploy?"); }
    finally { setLoading(false); }
  }, [staffSecret]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading challenge…</div>;
  if (!c || !c.enabled) return null;

  const draw = async () => {
    if (!confirm(`Draw the ${c.prize} winner from ${c.qualified} qualifier${c.qualified === 1 ? "" : "s"}?`)) return;
    setDrawing(true);
    try {
      const { winner } = await drawRaffle(staffSecret, localStorage.getItem("fittrack_staff_name") || "Staff");
      toast.success(`🎉 Winner: ${winner.winner_name}`);
      load();
    } catch (e: any) { toast.error(e.message || "Draw failed"); }
    finally { setDrawing(false); }
  };

  const rows = showAll ? c.board : c.board.slice(0, 15);
  return (
    <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/5 to-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <div className="font-bold text-sm">{c.title}</div>
            <div className="text-[11px] text-muted-foreground">{c.start} → {c.end} · {c.target} active days → {c.prize}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{c.qualified}</div>
            <div className="text-[10px] text-muted-foreground">qualified</div>
          </div>
          <Button size="sm" onClick={draw} disabled={drawing || c.qualified === 0} className="gap-1">
            {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Draw winner
          </Button>
        </div>
      </div>

      {c.lastDraw?.winner_name && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Sparkles className="h-4 w-4" /> Winner: {c.lastDraw.winner_name} · drawn {new Date(c.lastDraw.drawn_at).toLocaleDateString("en-GB")} (from {c.lastDraw.entrants})
        </div>
      )}

      <div className="space-y-1 max-h-[420px] overflow-auto">
        {rows.map((m, i) => (
          <div key={m.email} className="flex items-center gap-2 text-sm border-b border-border/40 py-1">
            <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="flex-1 truncate">{m.name}</span>
            {m.qualified && <span className="text-[10px] rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5">in</span>}
            <span className={`w-14 text-right tabular-nums font-semibold ${m.qualified ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{m.count}/{c.target}</span>
          </div>
        ))}
        {c.board.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No activity in the window yet.</p>}
      </div>
      {c.board.length > 15 && (
        <button onClick={() => setShowAll((s) => !s)} className="text-xs text-muted-foreground hover:underline">
          {showAll ? "Show top 15" : `Show all ${c.board.length}`}
        </button>
      )}
    </div>
  );
}

export default XmasChallengeStaff;
