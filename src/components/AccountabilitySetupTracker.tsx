import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Check, Minus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  SETUP_COLUMNS,
  SETUP_WEEKS,
  autoSetupState,
  setSetupTracker,
  type AccClient,
  type AccCohort,
} from "@/lib/accountabilityProgramme";
import {
  getCohortCheckins,
  type AccCheckin,
} from "@/lib/accountabilityCheckins";

/**
 * Coach-side setup tracker — a per-client grid of onboarding/admin milestones,
 * styled like the "6 Week Nutrition Members" sheet. AUTO columns (onboarding
 * form, MFP, Week 1–6 check-ins) tick themselves from app data; MANUAL columns
 * (set up on FitTrack, sent onboarding, paid, initial call) are coach ticks.
 */
export function AccountabilitySetupTracker({
  cohort,
  clients,
  staff = [],
  reload,
}: {
  cohort: AccCohort;
  clients: AccClient[];
  staff?: { user_id: string; name: string }[];
  reload?: () => void;
}) {
  const [checkins, setCheckins] = useState<AccCheckin[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [myUid, setMyUid] = useState<string | null>(null);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  // Local optimistic copy of each client's manual ticks, keyed by client id.
  const [trackers, setTrackers] = useState<Record<string, Record<string, boolean>>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyUid(user?.id ?? null);
    const cks = await getCohortCheckins(cohort.id);
    setCheckins(cks);
    const ids = clients.map((c) => c.user_id);
    if (ids.length) {
      const { data: memberRows } = await supabase
        .from("members")
        .select("id, full_name, email")
        .in("id", ids);
      const map: Record<string, string> = {};
      (memberRows ?? []).forEach((m: any) => {
        map[m.id] = m.full_name || m.email?.split("@")[0] || "Client";
      });
      setNames(map);
    }
    setLoading(false);
  }, [cohort.id, clients]);

  useEffect(() => {
    load();
  }, [load]);

  // Seed/refresh the local manual-tick copy whenever the client list changes.
  useEffect(() => {
    const seed: Record<string, Record<string, boolean>> = {};
    for (const c of clients) seed[c.id] = { ...(c.setup_tracker || {}) };
    setTrackers(seed);
  }, [clients]);

  const coachName = useCallback(
    (uid: string | null) =>
      uid ? staff.find((s) => s.user_id === uid)?.name || "Coach" : "Unassigned",
    [staff],
  );

  const scoped = useMemo(
    () =>
      scope === "mine" && myUid
        ? clients.filter((c) => c.coach_user_id === myUid)
        : clients,
    [clients, scope, myUid],
  );

  const sortedClients = useMemo(
    () =>
      [...scoped].sort((a, b) =>
        (names[a.user_id] || "").localeCompare(names[b.user_id] || ""),
      ),
    [scoped, names],
  );

  const toggleManual = async (client: AccClient, key: string) => {
    const current = trackers[client.id] || {};
    const next = { ...current, [key]: !current[key] };
    setTrackers((t) => ({ ...t, [client.id]: next })); // optimistic
    setSaving(client.id + ":" + key);
    const { error } = await setSetupTracker(client.id, next);
    setSaving(null);
    if (error) {
      setTrackers((t) => ({ ...t, [client.id]: current })); // revert
      toast.error("Couldn't save — try again");
    }
  };

  // A single cell. Manual cells are tappable; auto cells are read-only.
  const Cell = ({
    on,
    mode,
    busy,
    onClick,
  }: {
    on: boolean;
    mode: "manual" | "auto";
    busy?: boolean;
    onClick?: () => void;
  }) => {
    const base =
      "flex h-7 w-7 items-center justify-center rounded-md border mx-auto transition";
    if (busy) {
      return (
        <span className={base + " border-border bg-muted/40"}>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </span>
      );
    }
    const filled = on
      ? "border-primary bg-primary/15 text-primary"
      : "border-border bg-transparent text-muted-foreground/40";
    if (mode === "auto") {
      return (
        <span
          className={base + " " + filled + " cursor-default"}
          title={on ? "Auto · done" : "Auto · not yet"}
        >
          {on ? <Check className="h-4 w-4" /> : <Minus className="h-3.5 w-3.5" />}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={base + " " + filled + " hover:border-primary active:scale-95"}
        title={on ? "Done — tap to undo" : "Tap to mark done"}
      >
        {on ? <Check className="h-4 w-4" /> : <Minus className="h-3.5 w-3.5" />}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalCols = SETUP_COLUMNS.length + SETUP_WEEKS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl tracking-wide">Setup tracker</h2>
          <p className="text-xs text-muted-foreground">
            Onboarding &amp; admin at a glance. Grey ticks fill in automatically;
            tap the others as you go.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={scope === "mine" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("mine")}
            className="gap-1.5"
          >
            <Users className="w-4 h-4" /> My clients
          </Button>
          <Button
            variant={scope === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("all")}
          >
            All coaches
          </Button>
        </div>
      </div>

      {sortedClients.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          {scope === "mine"
            ? "No clients assigned to you yet."
            : "No clients in this cohort yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-max text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-left font-semibold min-w-[140px]">
                  Member
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap min-w-[90px]">
                  Coach
                </th>
                {SETUP_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-center font-semibold whitespace-nowrap"
                    title={col.label}
                  >
                    {col.short}
                  </th>
                ))}
                {SETUP_WEEKS.map((w) => (
                  <th
                    key={w}
                    className="px-2 py-2 text-center font-semibold"
                    title={`Week ${w} check-in`}
                  >
                    W{w}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold">Done</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((c) => {
                const auto = autoSetupState(c, checkins);
                const manual = trackers[c.id] || {};
                let done = 0;
                SETUP_COLUMNS.forEach((col) => {
                  if (col.mode === "auto" ? auto[col.key] : manual[col.key])
                    done++;
                });
                SETUP_WEEKS.forEach((w) => {
                  if (auto["w" + w]) done++;
                });
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                      {names[c.user_id] || "Client"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={
                          "text-xs " +
                          (c.coach_user_id
                            ? "text-muted-foreground"
                            : "text-amber-600")
                        }
                      >
                        {coachName(c.coach_user_id)}
                      </span>
                    </td>
                    {SETUP_COLUMNS.map((col) => (
                      <td key={col.key} className="px-2 py-2">
                        <Cell
                          mode={col.mode}
                          on={
                            col.mode === "auto"
                              ? !!auto[col.key]
                              : !!manual[col.key]
                          }
                          busy={saving === c.id + ":" + col.key}
                          onClick={
                            col.mode === "manual"
                              ? () => toggleManual(c, col.key)
                              : undefined
                          }
                        />
                      </td>
                    ))}
                    {SETUP_WEEKS.map((w) => (
                      <td key={w} className="px-2 py-2">
                        <Cell mode="auto" on={!!auto["w" + w]} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <span
                        className={
                          "text-xs font-semibold tabular-nums " +
                          (done === totalCols
                            ? "text-primary"
                            : "text-muted-foreground")
                        }
                      >
                        {done}/{totalCols}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Auto (grey, locked): onboarding form, MFP diary, Week 1–6 check-ins ·
        Manual (tap): set up on FitTrack, sent onboarding, paid, initial call.
      </p>
    </div>
  );
}

export default AccountabilitySetupTracker;
