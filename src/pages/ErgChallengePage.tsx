import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ChevronLeft } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import {
  ERG_MACHINES,
  getErgSummary,
  ergSummaryMap,
  getMyErgLogs,
  deleteErgLog,
  daysLeft,
  type ErgRow,
  type MyErgLog,
} from "@/lib/ergChallenge";
import ErgLogDialog from "@/components/ErgLogDialog";

export default function ErgChallengePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ErgRow[]>([]);
  const [logs, setLogs] = useState<MyErgLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [r, l] = await Promise.all([getErgSummary(), getMyErgLogs()]);
    setRows(r);
    setLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const left = daysLeft();
  const ended = left === 0;
  const map = ergSummaryMap(rows);

  const confirmDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    const { error } = await deleteErgLog(delId);
    setDeleting(false);
    if (error) {
      // not yours / already gone — refresh and close
    }
    setDelId(null);
    load();
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-3xl font-heading tracking-wide uppercase">
          Million Metre Challenge
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {ended
            ? "The challenge is over — here's how we did."
            : `Rack up metres across the three ergs by Christmas — ${left} days left.`}
        </p>
      </div>

      <div className="space-y-4">
        {ERG_MACHINES.map((m) => {
          const r = map[m.key];
          const total = r?.total_metres ?? 0;
          const mine = r?.my_metres ?? 0;
          const remaining = Math.max(0, m.target - total);
          const pct = Math.min(100, (total / m.target) * 100);
          const smashed = total >= m.target;
          return (
            <Card key={m.key} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-xl tracking-wide">
                    {m.label}
                  </CardTitle>
                  <span className="text-xs font-semibold text-muted-foreground">
                    target {m.target.toLocaleString()} m
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${smashed ? 100 : pct}%` }}
                  />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {total.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {m.target.toLocaleString()} m
                      </span>
                    </p>
                    {smashed ? (
                      <p className="text-xs font-semibold text-primary">
                        Smashed it 🎉
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {remaining.toLocaleString()} m to go
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    you: {mine.toLocaleString()} m
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!ended && (
        <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
          Log metres
        </Button>
      )}

      <div>
        <h2 className="font-heading text-xl tracking-wide mb-3">
          Your recent logs
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No logs yet — log your first metres above.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const auto = log.source === "workout";
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {log.metres.toLocaleString()} m · {log.machine}
                      {auto && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          (from workout)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setDelId(log.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ErgLogDialog open={open} onOpenChange={setOpen} onSaved={load} />

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes these metres from your total. You can't undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
