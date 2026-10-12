import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, ChevronLeft, Shield, Trophy } from "lucide-react";
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
  logErgMetresForMember,
  getErgLeaderboard,
  daysLeft,
  type ErgRow,
  type MyErgLog,
  type ErgLeaderRow,
  type ErgMachine,
} from "@/lib/ergChallenge";
import { isStaff } from "@/lib/communityWall";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ErgLogDialog from "@/components/ErgLogDialog";

const MAX = 100000;

export default function ErgChallengePage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ErgRow[]>([]);
  const [logs, setLogs] = useState<MyErgLog[]>([]);
  const [leader, setLeader] = useState<ErgLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Staff: log-for-member form state
  const [members, setMembers] = useState<
    { id: string; full_name: string; email: string }[]
  >([]);
  const [memberQ, setMemberQ] = useState("");
  const [memberId, setMemberId] = useState("");
  const [machine, setMachine] = useState<ErgMachine>("bike");
  const [metres, setMetres] = useState("");
  const [staffSaving, setStaffSaving] = useState(false);

  const staff = isStaff();

  const load = useCallback(async () => {
    const [r, l] = await Promise.all([getErgSummary(), getMyErgLogs()]);
    setRows(r);
    setLogs(l);
    if (staff) {
      const [lb, mem] = await Promise.all([
        getErgLeaderboard(),
        supabase
          .from("members")
          .select("id, full_name, email")
          .order("full_name", { ascending: true })
          .limit(500),
      ]);
      setLeader(lb);
      setMembers((mem.data ?? []) as any[]);
    }
    setLoading(false);
  }, [staff]);

  useEffect(() => {
    load();
  }, [load]);

  const left = daysLeft();
  const ended = left === 0;
  const map = ergSummaryMap(rows);

  const filteredMembers = useMemo(() => {
    const q = memberQ.trim().toLowerCase();
    if (!q) return members.slice(0, 50);
    return members
      .filter((m) =>
        `${m.full_name || ""} ${m.email || ""}`.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [members, memberQ]);

  const grandTotal = leader.reduce((s, r) => s + (r.total_metres || 0), 0);

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

  const submitStaffLog = async () => {
    if (!memberId) {
      toast.error("Pick a member first.");
      return;
    }
    const n = Math.floor(Number(metres));
    if (!metres || Number.isNaN(n) || n <= 0) {
      toast.error("Enter a whole number of metres (1+).");
      return;
    }
    if (n > MAX) {
      toast.error(`Max ${MAX.toLocaleString()} m per entry.`);
      return;
    }
    setStaffSaving(true);
    const { error } = await logErgMetresForMember(memberId, machine, n);
    setStaffSaving(false);
    if (error) {
      toast.error("Couldn't save — try again.");
      return;
    }
    const mem = members.find((m) => m.id === memberId);
    toast.success(
      `Added ${n.toLocaleString()} m for ${mem?.full_name || mem?.email || "member"}`,
    );
    setMetres("");
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
              const byStaff = log.source === "staff";
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
                      {byStaff && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          (logged by staff)
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

      {staff && (
        <>
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-xl tracking-wide">
                Staff tools
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Staff only — not shown to members.
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading tracking-wide">
                Log metres for a member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Member
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={memberQ}
                  onChange={(e) => setMemberQ(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 divide-y divide-border">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">
                      No members found.
                    </p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMemberId(m.id);
                          setMemberQ(`${m.full_name || m.email}`.trim());
                        }}
                        className={
                          "w-full text-left px-3 py-2 text-sm transition " +
                          (memberId === m.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted")
                        }
                      >
                        {m.full_name || m.email}
                        {m.full_name && m.email && (
                          <span className="ml-1.5 text-[11px] text-muted-foreground">
                            · {m.email}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Machine
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ERG_MACHINES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMachine(m.key)}
                      className={
                        "rounded-lg border px-3 py-2 text-sm font-medium transition " +
                        (machine === m.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground")
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Metres
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX}
                  placeholder="e.g. 5000"
                  value={metres}
                  onChange={(e) => setMetres(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  {ERG_MACHINES.find((m) => m.key === machine)?.label} · whole
                  metres, up to {MAX.toLocaleString()} per entry.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={submitStaffLog}
                disabled={staffSaving}
              >
                {staffSaving ? "Saving…" : "Add metres"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-heading tracking-wide">
                  Everyone's totals
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Staff only · ranked by total metres.
              </p>
            </CardHeader>
            <CardContent>
              {leader.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one has logged metres yet.
                </p>
              ) : (
                <>
                  <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
                    {leader.map((row, i) => (
                      <div
                        key={row.member_id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground tabular-nums w-5">
                            {i + 1}
                          </span>
                          <span className="truncate font-medium">
                            {row.name}
                          </span>
                        </span>
                        <span className="tabular-nums font-semibold">
                          {row.total_metres.toLocaleString()} m
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">
                      Grand total
                    </span>
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {grandTotal.toLocaleString()} m
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

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
