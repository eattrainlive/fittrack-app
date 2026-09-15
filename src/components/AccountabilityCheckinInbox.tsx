import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flag, Check, Clock, MessageSquare } from "lucide-react";
import {
  getCohortCheckins,
  type AccCheckin,
} from "@/lib/accountabilityCheckins";
import {
  getActiveCohort,
  getCohortClients,
  currentWeekOf,
  type AccCohort,
  type AccClient,
} from "@/lib/accountabilityProgramme";
import { supabase } from "@/lib/supabase";
import { AccountabilityClientConsole } from "./AccountabilityClientConsole";

interface InboxRow {
  client: AccClient;
  checkin: AccCheckin | null;
  name: string;
  status: "due" | "waiting" | "done";
}

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";

export function AccountabilityCheckinInbox() {
  const [cohort, setCohort] = useState<AccCohort | null>(null);
  const [clients, setClients] = useState<AccClient[]>([]);
  const [checkins, setCheckins] = useState<AccCheckin[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [myUid, setMyUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [openClient, setOpenClient] = useState<AccClient | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const c = await getActiveCohort();
    setCohort(c);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyUid(user?.id ?? null);
    if (c) {
      const [cs, cks] = await Promise.all([
        getCohortClients(c.id),
        getCohortCheckins(c.id),
      ]);
      setClients(cs);
      setCheckins(cks);
      const ids = cs.map((x) => x.user_id);
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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No active cohort found.
        </CardContent>
      </Card>
    );
  }

  if (openClient) {
    return (
      <AccountabilityClientConsole
        client={openClient}
        cohort={cohort}
        onBack={() => {
          setOpenClient(null);
          load();
        }}
      />
    );
  }

  const week = currentWeekOf(cohort.start_date, cohort.weeks);
  // Check-ins due Sunday; Mon onward (day 1-3 of the week) treat as overdue.
  const today = new Date().getDay(); // 0 Sun .. 6 Sat
  const overdue = today >= 1 && today <= 3;

  const scoped =
    scope === "mine" && myUid
      ? clients.filter((c) => c.coach_user_id === myUid)
      : clients;

  const rows: InboxRow[] = scoped.map((client) => {
    const checkin =
      checkins.find(
        (c) => c.client_id === client.id && c.week_number === week,
      ) || null;
    let status: InboxRow["status"] = "waiting";
    if (checkin && checkin.submitted_at && !checkin.coach_replied_at) {
      status = "due";
    } else if (checkin && checkin.coach_replied_at) {
      status = "done";
    } else {
      status = overdue ? "waiting" : "waiting";
    }
    return {
      client,
      checkin,
      name: names[client.user_id] || "Client",
      status,
    };
  });

  // Flagged items surface first regardless of week.
  const flagged = rows.filter((r) => r.checkin?.flagged);
  const due = rows.filter((r) => r.status === "due" && !r.checkin?.flagged);
  const waiting = rows.filter(
    (r) => r.status === "waiting" && !r.checkin?.flagged,
  );
  const done = rows.filter((r) => r.status === "done" && !r.checkin?.flagged);

  const RowCard = ({ row }: { row: InboxRow }) => {
    const r = row.checkin?.responses || {};
    return (
      <button
        onClick={() => setOpenClient(row.client)}
        className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{row.name}</p>
            {row.checkin && r.q3 && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Win: {r.q3}
              </p>
            )}
            {row.checkin && r.q7 && (
              <p className="text-xs text-muted-foreground truncate">
                In the way: {r.q7}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {row.checkin?.flagged && (
              <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">
                <Flag className="w-3 h-3 mr-1" /> Flagged
              </Badge>
            )}
            {row.status === "due" && (
              <Badge className="bg-primary/15 text-primary border-0 text-xs">
                Reply due
              </Badge>
            )}
            {row.status === "waiting" && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                <Clock className="w-3 h-3 mr-1" /> Waiting
              </Badge>
            )}
            {row.status === "done" && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">
                <Check className="w-3 h-3 mr-1" /> Done
              </Badge>
            )}
          </div>
        </div>
      </button>
    );
  };

  const Group = ({
    title,
    rows,
    icon: Icon,
  }: {
    title: string;
    rows: InboxRow[];
    icon: any;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-heading text-sm tracking-wide">
          {title} ({rows.length})
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">None</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <RowCard key={row.client.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl tracking-wide">
            Check-in inbox
          </h2>
          <p className="text-xs text-muted-foreground">
            Week {week} · {due.length} replies due · {waiting.length} waiting
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={scope === "mine" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("mine")}
          >
            My clients
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

      {flagged.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/40 border-l-4 border-l-amber-500">
          <CardContent className="py-3 space-y-2">
            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" /> Flagged — handle personally
            </p>
            <div className="space-y-2">
              {flagged.map((row) => (
                <RowCard key={row.client.id} row={row} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Group title="Reply due" rows={due} icon={MessageSquare} />
      <Group title="Waiting on client" rows={waiting} icon={Clock} />
      <Group title="Done this week" rows={done} icon={Check} />
    </div>
  );
}

export default AccountabilityCheckinInbox;
