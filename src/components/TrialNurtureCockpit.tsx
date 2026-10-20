import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight, Send, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberActivityModal } from "@/components/MemberActivityModal";
import {
  EmptyState,
  ActivityButton,
  staffName,
  fmtDate,
} from "@/components/staffHubShared";
import {
  getNurtureBoard,
  sendStep,
  renderTemplate,
  renderFullMessage,
  stepsForType as libStepsForType,
  type NurtureTrialist,
  type NurtureStep,
  type NurtureBoard,
} from "@/lib/trialNurture";

// ── Defensive accessors for fields the protected repo lib adds ──────────────
// The builder copy of trialNurture.ts predates trialType / activity / the
// situational flags; the repo version (protected) carries them. Access via
// casts + fallbacks so this compiles now and lights up after the merge.
type AnyT = NurtureTrialist & {
  trialType?: string;
  trialLength?: number;
  activity?: { classes?: number; scans?: number; workouts?: number };
  firstSessionAt?: string | null;
  flags?: NurtureTrialist["flags"] & {
    noSessionBooked?: boolean;
    firstSessionDone?: boolean;
    goneQuiet?: boolean;
    frequencyDrop?: boolean;
    reviewNotBooked?: boolean;
  };
};

/** Hand-sendable steps for a trial type (coached30 vs kickstart21). */
function stepsForType(trialType?: string): NurtureStep[] {
  const type = trialType === "kickstart21" ? "kickstart21" : "coached30";
  return libStepsForType(type).filter((s) => !s.auto);
}

function trialLen(t: NurtureTrialist): number {
  return (t as AnyT).trialLength ?? 30;
}

// ── Impact scoring (conversion impact, highest first) ────────────────────────
function impactScore(t: NurtureTrialist): number {
  const f = (t as AnyT).flags ?? ({} as AnyT["flags"]);
  const key = t.nextStep?.step?.key ?? "";
  let s = 0;
  if (/decision/.test(key)) s += 100;
  if (
    /(ending_soon|k21_ending|results_nudge|k21_review|halfway|k21_mid|k21_pt_offer)/.test(
      key,
    )
  )
    s += 80;
  if (f.hotLead) s += 60;
  if (f.reviewNotBooked) s += 50;
  if (f.noSessionBooked || f.neverAttended) s += 40;
  if (f.goneQuiet || f.noShow || f.frequencyDrop) s += 30;
  return s;
}

function borderTier(score: number): string {
  if (score >= 80) return "border-l-[#A32D2D]";
  if (score >= 40) return "border-l-[#BA7517]";
  return "border-l-muted-foreground/30";
}

// ── Flag chips (priority order; show top 1–2) ───────────────────────────────
interface FlagChip {
  label: string;
  cls: string;
}
function flagChips(t: NurtureTrialist): FlagChip[] {
  const f = (t as AnyT).flags ?? ({} as AnyT["flags"]);
  const chips: FlagChip[] = [];
  const push = (cond: any, label: string, cls: string) => {
    if (cond) chips.push({ label, cls });
  };
  push(
    f.hotLead,
    "🟢 Hot lead",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  );
  push(
    f.reviewNotBooked,
    "Review not booked",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  );
  push(
    f.noSessionBooked,
    "No session booked",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  );
  push(
    f.neverAttended,
    "🔴 Not been in yet",
    "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  );
  push(
    f.goneQuiet,
    `Gone quiet${t.daysSinceVisit != null ? ` ${t.daysSinceVisit}d` : ""}`,
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  );
  push(
    f.noShow,
    `🟠 No-show${t.daysSinceVisit != null ? ` ${t.daysSinceVisit}d` : ""}`,
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  );
  push(
    f.frequencyDrop,
    "Under 2/wk",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  );
  push(
    f.firstSessionDone,
    "1st session done",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  );
  return chips;
}

function activityLine(t: NurtureTrialist): string | null {
  const a = (t as AnyT).activity;
  if (!a) return null;
  const parts: string[] = [];
  if (a.classes != null) parts.push(`${a.classes} classes`);
  if (a.scans != null) parts.push(`${a.scans} scans`);
  if (a.workouts != null) parts.push(`${a.workouts} workouts`);
  const first = (t as AnyT).firstSessionAt;
  if (first) parts.push(`· 1st session ${fmtDate(first)}`);
  return parts.length ? parts.join(" · ") : null;
}

// ── Cockpit ─────────────────────────────────────────────────────────────────

type Section = "dueNow" | "upcoming" | "joined";

export function TrialNurtureCockpit({ staffSecret }: { staffSecret: string }) {
  const [board, setBoard] = useState<NurtureBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("dueNow");

  const load = async () => {
    setLoading(true);
    try {
      const b = await getNurtureBoard();
      setBoard(b);
    } catch (e) {
      console.error("[trialNurture] getNurtureBoard failed", e);
      setBoard({ dueNow: [], upcoming: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dueNow = board?.dueNow ?? [];
  const upcoming = board?.upcoming ?? [];
  const joined =
    ((board as any)?.joined as NurtureTrialist[] | undefined) ?? [];
  const allEmpty =
    dueNow.length === 0 && upcoming.length === 0 && joined.length === 0;

  // Group due-now by urgency.
  const overdue = dueNow
    .filter((t) => t.nextStep?.state === "overdue")
    .sort((a, b) => impactScore(b) - impactScore(a));
  const dueToday = dueNow
    .filter((t) => t.nextStep?.state !== "overdue")
    .sort((a, b) => impactScore(b) - impactScore(a));

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the nurture
          board…
        </div>
      ) : allEmpty ? (
        <EmptyState text="No trialists in the nurture sequence right now." />
      ) : (
        <>
          {/* section switch */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["dueNow", `Due now ${dueNow.length}`],
                ["upcoming", `In the drip ${upcoming.length}`],
                ["joined", `Joined ${joined.length}`],
              ] as [Section, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  section === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {section === "dueNow" ? (
            dueNow.length === 0 ? (
              <EmptyState text="Nothing due right now ✅" />
            ) : (
              <div className="space-y-4">
                <NurtureGroup
                  title="Overdue"
                  rows={overdue}
                  staffSecret={staffSecret}
                  onSent={load}
                />
                <NurtureGroup
                  title="Due today"
                  rows={dueToday}
                  staffSecret={staffSecret}
                  onSent={load}
                />
              </div>
            )
          ) : section === "upcoming" ? (
            upcoming.length === 0 ? (
              <EmptyState text="Nobody waiting in the drip." />
            ) : (
              <div className="space-y-2">
                {upcoming
                  .sort((a, b) => impactScore(b) - impactScore(a))
                  .map((t) => (
                    <UpcomingRow
                      key={t.email}
                      t={t}
                      staffSecret={staffSecret}
                    />
                  ))}
              </div>
            )
          ) : joined.length === 0 ? (
            <EmptyState text="No converted trialists to show." />
          ) : (
            <div className="space-y-2">
              {joined.map((t) => (
                <UpcomingRow key={t.email} t={t} staffSecret={staffSecret} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Urgency group (Overdue / Due today) ──────────────────────────────────────

function NurtureGroup({
  title,
  rows,
  staffSecret,
  onSent,
}: {
  title: string;
  rows: NurtureTrialist[];
  staffSecret: string;
  onSent: () => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title} {rows.length}
      </p>
      <div className="space-y-2">
        {rows.map((t) => (
          <NurtureRow
            key={t.email}
            t={t}
            staffSecret={staffSecret}
            onSent={onSent}
          />
        ))}
      </div>
    </div>
  );
}

// ── Compact ranked row (collapsed → expandable send area) ───────────────────

function NurtureRow({
  t,
  staffSecret,
  onSent,
}: {
  t: NurtureTrialist;
  staffSecret: string;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const score = impactScore(t);
  const chips = flagChips(t).slice(0, 2);
  const act = activityLine(t);
  const overdue = t.nextStep?.state === "overdue";

  return (
    <Card className={`border-l-4 ${borderTier(score)}`}>
      <CardContent className="p-0">
        {/* collapsed header — tap to toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full space-y-1.5 p-3 text-left"
        >
          {/* line 1: name · day */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <p className="truncate font-semibold">{t.name}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              D{t.trialDay}/{trialLen(t)}
            </span>
          </div>

          {/* line 2: next step + state chip + top flags */}
          <div className="flex flex-wrap items-center gap-1.5 pl-5">
            <span className="truncate text-xs text-muted-foreground">
              {t.nextStep?.step?.label}
            </span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                overdue
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
              }`}
            >
              {overdue ? "Overdue" : "Due"}
            </span>
            {chips.map((c) => (
              <span
                key={c.label}
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.cls}`}
              >
                {c.label}
              </span>
            ))}
          </div>

          {/* line 3: activity one-liner */}
          {act && (
            <p className="pl-5 text-[11px] text-muted-foreground">{act}</p>
          )}
        </button>

        {/* expanded send area */}
        {open && <SendArea t={t} staffSecret={staffSecret} onSent={onSent} />}
      </CardContent>
    </Card>
  );
}

// ── Send area (revealed on expand) ───────────────────────────────────────────

function SendArea({
  t,
  staffSecret,
  onSent,
}: {
  t: NurtureTrialist;
  staffSecret: string;
  onSent: () => void;
}) {
  const steps = stepsForType((t as AnyT).trialType);
  const [selKey, setSelKey] = useState<string>(
    t.nextStep?.step?.key ?? steps[0]?.key ?? "",
  );
  const [note, setNote] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const step: NurtureStep =
    steps.find((s) => s.key === selKey) ?? t.nextStep?.step ?? steps[0];
  const tpl = useMemo(() => renderTemplate(step, t.name), [step, t.name]);
  const noteSnippet = note.trim();

  const handleSend = async () => {
    setSending(true);
    try {
      const r = await sendStep({
        trialist: { email: t.email, name: t.name },
        step,
        note,
        by: staffName(),
      });
      if (r.ok) {
        toast.success("Sent ✓");
        onSent();
      } else {
        toast.error(r.error || "Couldn't send — try again");
      }
    } catch {
      toast.error("Couldn't send — try again");
    } finally {
      setSending(false);
    }
  };

  const activityMember = {
    id: null,
    email: t.email,
    full_name: t.name,
    membership: null,
    online_client: false,
  };

  return (
    <div className="space-y-3 border-t bg-muted/20 p-3">
      {/* template dropdown */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          Template
        </label>
        <Select value={selKey} onValueChange={setSelKey}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {steps.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
                {s.key === t.nextStep?.step?.key ? " · suggested" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* template message (read-only) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">
            Template message · approved copy — fixed
          </label>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {step.templateKey}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
          <p>{tpl.before}</p>
          <p className="my-2 inline-flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            <Plus className="h-3 w-3" /> coach note
          </p>
          <p>{tpl.after}</p>
        </div>
      </div>

      {/* coach note */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          Coach note · optional — the personal bit you add
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={step.defaultNote || "Add a personal note…"}
          rows={2}
        />
      </div>

      {/* sends as (live preview) */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-muted-foreground">
          Sends as
        </label>
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm leading-relaxed whitespace-pre-wrap">
          {tpl.before}
          {noteSnippet && (
            <span className="mx-1 rounded bg-emerald-500/20 px-1 font-medium text-emerald-800 dark:text-emerald-300">
              — {noteSnippet}
            </span>
          )}
          {tpl.after}
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button onClick={handleSend} disabled={sending} className="flex-1">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" /> Send WhatsApp
            </>
          )}
        </Button>
        <ActivityButton
          onClick={() => {
            setActivityOpen(true);
          }}
        />
      </div>

      <MemberActivityModal
        member={activityMember}
        staffSecret={staffSecret}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
}

// ── Upcoming / joined row (compact, no send) ─────────────────────────────────

function UpcomingRow({
  t,
  staffSecret,
}: {
  t: NurtureTrialist;
  staffSecret: string;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const chips = flagChips(t).slice(0, 2);
  const act = activityLine(t);
  const nextLabel = t.steps.find((s) => s.status === "upcoming" && !s.step.auto)
    ?.step?.label;

  const activityMember = {
    id: null,
    email: t.email,
    full_name: t.name,
    membership: null,
    online_client: false,
  };

  return (
    <>
      <Card className={`border-l-4 ${borderTier(impactScore(t))}`}>
        <CardContent className="space-y-1.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{t.name}</p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              D{t.trialDay}/{trialLen(t)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {nextLabel ? `next: ${nextLabel}` : `Day ${t.trialDay}`}
            </span>
            {chips.map((c) => (
              <span
                key={c.label}
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${c.cls}`}
              >
                {c.label}
              </span>
            ))}
          </div>
          {act && <p className="text-[11px] text-muted-foreground">{act}</p>}
          <div className="flex justify-end pt-0.5">
            <ActivityButton
              onClick={() => {
                setActivityOpen(true);
              }}
            />
          </div>
        </CardContent>
      </Card>
      <MemberActivityModal
        member={activityMember}
        staffSecret={staffSecret}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </>
  );
}
