import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
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
  type StaffHubResponse,
  type ReachoutMember,
  type LapsedMember,
} from "@/lib/staffHubMetrics";
import { TrialistPipeline } from "@/components/TrialistPipeline";
import {
  EmptyState,
  EmailButton,
  staffName,
  fmtMonthYear,
  fmtDateTime,
} from "@/components/staffHubShared";
import {
  useContactProgress,
  STATUS_LABELS,
  ANSWER_OUTCOMES,
  type ListType,
  type ContactStatus,
  type ContactMember,
  type EnrichedContact,
  type LogContactArgs,
  type NextStep,
} from "@/lib/contactProgress";

type TabKey = "trialists" | "reachout" | "lapsed";

const TERMINAL: Record<ListType, ContactStatus[]> = {
  reachout: ["done"],
  lapsed: ["joined", "not_interested"],
};

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
  const [logged, setLogged] = useState<Record<string, string>>({});

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
        <ReachoutList list={reachout ?? []} />
      ) : (
        <LapsedList list={lapsed ?? []} />
      )}
    </div>
  );
}

function ReachoutList({ list }: { list: ReachoutMember[] }) {
  return (
    <ContactCadenceList
      list={list}
      listType="reachout"
      emptyText="No milestone check-ins due ✅"
      renderInfo={(m) => (
        <>
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
        </>
      )}
    />
  );
}

function LapsedList({ list }: { list: LapsedMember[] }) {
  return (
    <ContactCadenceList
      list={list}
      listType="lapsed"
      emptyText="No lapsed members to win back ✅"
      renderInfo={(m) => (
        <>
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
        </>
      )}
    />
  );
}

function ContactCadenceList<M extends ContactMember>({
  list,
  listType,
  emptyText,
  renderInfo,
}: {
  list: M[];
  listType: ListType;
  emptyText: string;
  renderInfo: (m: M) => ReactNode;
}) {
  const { byBucket, buckets, loading, logContact } = useContactProgress(
    list,
    listType,
    staffName(),
  );
  const [bucket, setBucket] = useState<ContactStatus>(buckets[0] ?? "todo");
  const [sheet, setSheet] = useState<{
    card: EnrichedContact<M>;
    kind: LogContactArgs["kind"];
  } | null>(null);

  if (!list.length) return <EmptyState text={emptyText} />;

  const cards = byBucket[bucket] ?? [];

  return (
    <div className="space-y-3">
      {loading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </p>
      )}

      {/* status pills */}
      <div className="flex flex-wrap gap-1.5">
        {buckets.map((s) => {
          const count = byBucket[s]?.length ?? 0;
          const active = bucket === s;
          return (
            <button
              key={s}
              onClick={() => setBucket(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {STATUS_LABELS[s]} {count}
            </button>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <EmptyState text="Nobody here yet" />
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <ContactCadenceCard
              key={c.key}
              c={c}
              listType={listType}
              renderInfo={renderInfo}
              onLog={(kind) => setSheet({ card: c, kind })}
            />
          ))}
        </div>
      )}

      {sheet && (
        <ContactLogSheet
          key={sheet.card.key + sheet.kind}
          card={sheet.card}
          kind={sheet.kind}
          listType={listType}
          onClose={() => setSheet(null)}
          onSave={async (args) => {
            const ok = await logContact(sheet.card, args);
            if (ok) toast.success("Saved ✓");
            else toast.error("Couldn't save — try again");
            return ok;
          }}
        />
      )}
    </div>
  );
}

function ContactCadenceCard<M extends ContactMember>({
  c,
  listType,
  renderInfo,
  onLog,
}: {
  c: EnrichedContact<M>;
  listType: ListType;
  renderInfo: (m: M) => ReactNode;
  onLog: (kind: LogContactArgs["kind"]) => void;
}) {
  const terminal = TERMINAL[listType].includes(c.status);

  return (
    <Card className={terminal ? "opacity-70" : ""}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{c.name}</p>
            {renderInfo(c.member)}
          </div>
          <EmailButton email={c.member.email} />
        </div>

        <CadenceTracker
          attempts={c.attempts}
          whatsappSent={c.whatsappSent}
          next={c.next}
        />

        {c.lastOutcome && (
          <p className="text-[11px] text-muted-foreground">
            {c.lastOutcome} · {c.lastNote || "—"} · {fmtDateTime(c.updatedAt)}
          </p>
        )}

        {terminal ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" /> {STATUS_LABELS[c.status]}
          </span>
        ) : (
          <ContactActions next={c.next} onLog={onLog} />
        )}
      </CardContent>
    </Card>
  );
}

function CadenceTracker({
  attempts,
  whatsappSent,
  next,
}: {
  attempts: number;
  whatsappSent: boolean;
  next: NextStep;
}) {
  const segments = [
    {
      label: "Call 1",
      filled: attempts >= 1,
      highlight: next === "call" && attempts === 0,
    },
    {
      label: "Call 2",
      filled: attempts >= 2,
      highlight: next === "call" && attempts === 1,
    },
    {
      label: "Call 3",
      filled: attempts >= 3,
      highlight: next === "call" && attempts === 2,
    },
    { label: "WhatsApp", filled: whatsappSent, highlight: next === "whatsapp" },
  ];
  return (
    <div className="flex items-end gap-1.5">
      {segments.map((s) => (
        <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`h-2 w-full rounded-full ${
              s.filled
                ? "bg-emerald-500"
                : s.highlight
                  ? "bg-primary/30 ring-2 ring-primary ring-offset-1"
                  : "bg-muted"
            }`}
          />
          <span className="text-[10px] text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function ContactActions({
  next,
  onLog,
}: {
  next: NextStep;
  onLog: (kind: LogContactArgs["kind"]) => void;
}) {
  if (next === "call") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onLog("no_answer")}>
          No answer
        </Button>
        <Button size="sm" onClick={() => onLog("answered")}>
          Answered
        </Button>
      </div>
    );
  }
  if (next === "whatsapp") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onLog("whatsapp")}>
          Send WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => onLog("answered")}>
          Answered
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => onLog("answered")}>
        Answered
      </Button>
    </div>
  );
}

function ContactLogSheet<M extends ContactMember>({
  card,
  kind,
  listType,
  onClose,
  onSave,
}: {
  card: EnrichedContact<M>;
  kind: LogContactArgs["kind"];
  listType: ListType;
  onClose: () => void;
  onSave: (args: LogContactArgs) => Promise<boolean>;
}) {
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const title =
    kind === "no_answer"
      ? "No answer"
      : kind === "whatsapp"
        ? "WhatsApp"
        : "Answered";
  const presets = kind === "answered" ? ANSWER_OUTCOMES[listType] : [];

  const submit = async () => {
    if (kind === "answered" && !outcome) {
      toast.error("Pick an outcome");
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave({
        kind,
        outcome: outcome || undefined,
        note: note.trim() || undefined,
      });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">
            {card.name} — {title}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setOutcome(p.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    outcome === p.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
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
              "Save"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
