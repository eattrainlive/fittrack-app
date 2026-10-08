import { useState } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type StaffHubResponse,
  type Trialist,
  type ReachoutMember,
  type LapsedMember,
} from "@/lib/staffHubMetrics";
import { TrialistPipeline } from "@/components/TrialistPipeline";
import {
  OutcomeSheet,
  EmptyState,
  CardShell,
  useOutcomeSheet,
  fmtMonthYear,
} from "@/components/staffHubShared";

type TabKey = "trialists" | "reachout" | "lapsed";

export function StaffHubCallLists({
  data,
  loading,
  error,
}: {
  data: StaffHubResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const [tab, setTab] = useState<TabKey>("trialists");
  const [logged, setLogged] = useState<Record<string, string>>({}); // email -> outcome

  const trialists = data?.trialists;
  const reachout = data?.reachout;
  const lapsed = data?.lapsed;
  const staffOnly =
    trialists === undefined && reachout === undefined && lapsed === undefined;

  const tabs: { key: TabKey; label: string; count: number | undefined }[] = [
    { key: "trialists", label: "Trialists", count: trialists?.length },
    { key: "reachout", label: "Reach out", count: reachout?.length },
    { key: "lapsed", label: "Win back", count: lapsed?.length },
  ];

  return (
    <div className="space-y-4">
      {/* segmented tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] tabular-nums text-primary">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {staffOnly ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            Visible to staff only
          </CardContent>
        </Card>
      ) : error && !data ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Reconnect to load the call lists.
          </CardContent>
        </Card>
      ) : tab === "trialists" ? (
        <TrialistPipeline
          list={trialists ?? []}
          logged={logged}
          onLogged={(email, outcome) =>
            setLogged((s) => ({ ...s, [email]: outcome }))
          }
        />
      ) : tab === "reachout" ? (
        <ReachoutList
          list={reachout ?? []}
          logged={logged}
          onLogged={(email, outcome) =>
            setLogged((s) => ({ ...s, [email]: outcome }))
          }
        />
      ) : (
        <LapsedList
          list={lapsed ?? []}
          logged={logged}
          onLogged={(email, outcome) =>
            setLogged((s) => ({ ...s, [email]: outcome }))
          }
        />
      )}
    </div>
  );
}

function ReachoutList({
  list,
  logged,
  onLogged,
}: {
  list: ReachoutMember[];
  logged: Record<string, string>;
  onLogged: (email: string, outcome: string) => void;
}) {
  const sheet = useOutcomeSheet();
  if (!list.length) return <EmptyState text="No milestone check-ins due ✅" />;
  return (
    <div className="space-y-2">
      {list.map((m, i) => {
        const name = `${m.first} ${m.last}`.trim();
        return (
          <CardShell
            key={`${m.email}-${i}`}
            name={name}
            email={m.email}
            logged={logged[m.email]}
            onLog={() => sheet.openFor(name, m.email)}
          >
            <p className="text-xs text-muted-foreground">
              {m.membership}
              {m.category ? ` · ${m.category}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {m.milestone}-month check-in
              </span>
              <span className="text-[11px] text-muted-foreground">
                Joined {fmtMonthYear(m.joined)}
              </span>
            </div>
          </CardShell>
        );
      })}
      {sheet.target && (
        <OutcomeSheet
          open={sheet.open}
          onOpenChange={sheet.setOpen}
          tab="reachout"
          who={sheet.target.who}
          email={sheet.target.email}
          onLogged={onLogged}
        />
      )}
    </div>
  );
}

function LapsedList({
  list,
  logged,
  onLogged,
}: {
  list: LapsedMember[];
  logged: Record<string, string>;
  onLogged: (email: string, outcome: string) => void;
}) {
  const sheet = useOutcomeSheet();
  if (!list.length)
    return <EmptyState text="No lapsed members to win back ✅" />;
  return (
    <div className="space-y-2">
      {list.map((m, i) => {
        const name = `${m.first} ${m.last}`.trim();
        return (
          <CardShell
            key={`${m.email}-${i}`}
            name={name}
            email={m.email}
            logged={logged[m.email]}
            onLog={() => sheet.openFor(name, m.email)}
          >
            <p className="text-xs text-muted-foreground">
              {m.membership}
              {m.category ? ` · ${m.category}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {m.window}
              </span>
              <span className="text-[11px] font-medium tabular-nums">
                £{Math.round(m.value)}/mo
              </span>
              <span className="text-[11px] text-muted-foreground">
                Cancelled {fmtMonthYear(m.cancelled)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {m.stage}
              {m.owner ? ` · Owner: ${m.owner}` : ""}
            </p>
          </CardShell>
        );
      })}
      {sheet.target && (
        <OutcomeSheet
          open={sheet.open}
          onOpenChange={sheet.setOpen}
          tab="lapsed"
          who={sheet.target.who}
          email={sheet.target.email}
          onLogged={onLogged}
        />
      )}
    </div>
  );
}
