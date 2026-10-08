import { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  logStaffActions,
  type StaffHubResponse,
  type Trialist,
  type ReachoutMember,
  type LapsedMember,
} from "@/lib/staffHubMetrics";

type TabKey = "trialists" | "reachout" | "lapsed";

const OUTCOMES: Record<TabKey, string[]> = {
  trialists: ["Converting", "Thinking about it", "No answer", "Not continuing"],
  reachout: ["Spoke – all good", "Needs attention", "No answer"],
  lapsed: ["Interested", "Maybe later", "No answer", "Not coming back"],
};

/** Resolve the signed-in staff member's name from the cached profile. */
function staffName(): string {
  try {
    const raw = localStorage.getItem("fittrack_profile");
    if (raw) {
      const p = JSON.parse(raw);
      return p?.full_name || p?.name || "Staff";
    }
  } catch {
    /* ignore */
  }
  return "Staff";
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
}

function fmtMonthYear(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function finishChip(finishes: string | null): {
  label: string;
  cls: string;
} | null {
  if (!finishes) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const f = new Date(finishes);
  f.setHours(0, 0, 0, 0);
  const days = Math.round((f.getTime() - today.getTime()) / 86400000);
  if (days <= 0)
    return {
      label: "Finishing / overdue",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    };
  if (days <= 3)
    return {
      label: "Soon",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    };
  return null;
}

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
        <TrialistList
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

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

function EmailButton({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted"
      aria-label={`Email ${email}`}
    >
      <Mail className="h-4 w-4" />
    </a>
  );
}

function LoggedBadge({ outcome }: { outcome: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Logged: {outcome}
    </span>
  );
}

function OutcomeSheet({
  open,
  onOpenChange,
  tab,
  who,
  email,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tab: TabKey;
  who: string;
  email: string;
  onLogged: (email: string, outcome: string) => void;
}) {
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const presets = OUTCOMES[tab];

  const submit = async () => {
    const chosen = outcome || presets[0];
    setSaving(true);
    try {
      await logStaffActions([
        {
          type: tab === "trialists" ? "trialist" : tab,
          who,
          email,
          outcome: chosen,
          note: note.trim() || undefined,
          by: staffName(),
        },
      ]);
      onLogged(email, chosen);
      toast.success("Logged ✓");
      onOpenChange(false);
      setOutcome("");
      setNote("");
    } catch {
      toast.error("Couldn't log — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">Log outcome — {who}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-2 pt-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setOutcome(p)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  outcome === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note…"
              rows={3}
            />
          </div>
        </div>
        <SheetFooter className="shrink-0 border-t pt-3">
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Log outcome"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CardShell({
  name,
  email,
  logged,
  onLog,
  children,
}: {
  name: string;
  email: string;
  logged?: string;
  onLog: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={logged ? "opacity-70" : ""}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            {children}
          </div>
          <EmailButton email={email} />
        </div>
        <div className="flex items-center justify-between gap-2">
          {logged ? (
            <LoggedBadge outcome={logged} />
          ) : (
            <Button size="sm" variant="outline" onClick={onLog}>
              Log outcome
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function useOutcomeSheet() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{
    who: string;
    email: string;
  } | null>(null);
  const openFor = (who: string, email: string) => {
    setTarget({ who, email });
    setOpen(true);
  };
  return { open, setOpen, target, openFor };
}

function TrialistList({
  list,
  logged,
  onLogged,
}: {
  list: Trialist[];
  logged: Record<string, string>;
  onLogged: (email: string, outcome: string) => void;
}) {
  const sheet = useOutcomeSheet();
  if (!list.length)
    return <EmptyState text="No trials to convert right now ✅" />;
  return (
    <div className="space-y-2">
      {list.map((t, i) => {
        const name = `${t.first} ${t.last}`.trim();
        const chip = finishChip(t.finishes);
        return (
          <CardShell
            key={`${t.email}-${i}`}
            name={name}
            email={t.email}
            logged={logged[t.email]}
            onLog={() => sheet.openFor(name, t.email)}
          >
            <p className="text-xs text-muted-foreground">
              {t.trial}
              {t.category ? ` · ${t.category}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Finishes {fmtDate(t.finishes)}
            </p>
            {chip && (
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.cls}`}
              >
                {chip.label}
              </span>
            )}
          </CardShell>
        );
      })}
      {sheet.target && (
        <OutcomeSheet
          open={sheet.open}
          onOpenChange={sheet.setOpen}
          tab="trialists"
          who={sheet.target.who}
          email={sheet.target.email}
          onLogged={onLogged}
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
