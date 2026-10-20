import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  Plus,
  User,
} from "lucide-react";
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
} from "@/components/staffHubShared";
import {
  getNurtureBoard,
  sendStep,
  renderTemplate,
  renderFullMessage,
  stepsForType,
  type NurtureTrialist,
  type NurtureStep,
  type NurtureBoard,
} from "@/lib/trialNurture";

export function TrialNurtureCockpit({ staffSecret }: { staffSecret: string }) {
  const [board, setBoard] = useState<NurtureBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"dueNow" | "upcoming" | "joined">(
    "dueNow",
  );

  const load = async () => {
    setLoading(true);
    try {
      const b = await getNurtureBoard();
      setBoard(b);
    } catch (e) {
      console.error("[trialNurture] getNurtureBoard failed", e);
      setBoard({ dueNow: [], upcoming: [], joined: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dueNow = board?.dueNow ?? [];
  const upcoming = board?.upcoming ?? [];
  const joined = board?.joined ?? [];
  const bothEmpty =
    dueNow.length === 0 && upcoming.length === 0 && joined.length === 0;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the nurture
          board…
        </div>
      ) : bothEmpty ? (
        <EmptyState text="No trialists in the nurture sequence right now." />
      ) : (
        <>
          {/* section switch */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSection("dueNow")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                section === "dueNow"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Due now {dueNow.length}
            </button>
            <button
              onClick={() => setSection("upcoming")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                section === "upcoming"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              In the drip {upcoming.length}
            </button>
            {joined.length > 0 && (
              <button
                onClick={() => setSection("joined")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  section === "joined"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Joined ✅ {joined.length}
              </button>
            )}
          </div>

          {section === "dueNow" ? (
            dueNow.length === 0 ? (
              <EmptyState text="Nothing due right now ✅" />
            ) : (
              <div className="space-y-3">
                {dueNow.map((t) => (
                  <NurtureCard
                    key={t.email}
                    t={t}
                    staffSecret={staffSecret}
                    onSent={load}
                  />
                ))}
              </div>
            )
          ) : section === "upcoming" ? (
            upcoming.length === 0 ? (
              <EmptyState text="Nobody waiting in the drip." />
            ) : (
              <div className="space-y-2">
                {upcoming.map((t) => (
                  <UpcomingRow key={t.email} t={t} staffSecret={staffSecret} />
                ))}
              </div>
            )
          ) : joined.length === 0 ? (
            <EmptyState text="No sign-ups yet." />
          ) : (
            <div className="space-y-2">
              {joined.map((t) => (
                <JoinedRow key={t.email} t={t} staffSecret={staffSecret} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Due-now card (full send area) ────────────────────────────────────────────

function NurtureCard({
  t,
  staffSecret,
  onSent,
}: {
  t: NurtureTrialist;
  staffSecret: string;
  onSent: () => void;
}) {
  // Steps for THIS trialist's trial type (coached30 vs kickstart21).
  const schedule = stepsForType(t.trialType);
  const [selKey, setSelKey] = useState<string>(
    t.nextStep?.step?.key ?? schedule[1]?.key ?? schedule[0].key,
  );
  const [note, setNote] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [showSeq, setShowSeq] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityMember, setActivityMember] = useState<any | null>(null);
  const [removed, setRemoved] = useState(false);

  // Keep the note when switching template — don't reset.
  // (selKey + note are independent state; note persists across template change)

  const step: NurtureStep =
    schedule.find((s) => s.key === selKey) ??
    t.nextStep?.step ??
    schedule[1] ??
    schedule[0];
  const tpl = useMemo(() => renderTemplate(step, t.name), [step, t.name]);
  const full = useMemo(
    () => renderFullMessage(step, t.name, note),
    [step, t.name, note],
  );
  const noteSnippet = note.trim();

  const openActivity = () => {
    setActivityMember({
      id: null,
      email: t.email,
      full_name: t.name,
      membership: null,
      online_client: false,
    });
    setActivityOpen(true);
  };

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
        setRemoved(true);
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

  if (removed) {
    return (
      <Card className="opacity-50">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Sent — loading the next one…
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-4">
          {/* header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{t.name}</p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  Day {t.trialDay} of {t.trialLength}
                </span>
              </div>
              {t.trialProduct && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {t.trialProduct}
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {t.flags.hotLead && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    🟢 Hot lead
                  </span>
                )}
                {t.flags.noShow && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    🟠 No-show{" "}
                    {t.daysSinceVisit != null ? `${t.daysSinceVisit}d` : ""}
                  </span>
                )}
                {t.flags.neverAttended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    🔴 Not been in yet
                  </span>
                )}
                {t.flags.noSessionBooked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    📅 No session booked
                  </span>
                )}
                {t.flags.firstSessionDone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    ✅ 1st session done
                  </span>
                )}
                {t.flags.goneQuiet && !t.flags.noShow && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    🟠 Gone quiet
                    {t.daysSinceVisit != null ? ` ${t.daysSinceVisit}d` : ""}
                  </span>
                )}
                {t.flags.frequencyDrop && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    📉 Under 2/wk
                  </span>
                )}
                {t.flags.reviewNotBooked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-400">
                    📋 Review not booked
                  </span>
                )}
              </div>
              {/* activity breakdown */}
              <p className="mt-1 text-[11px] text-muted-foreground">
                🏋 {t.activity.classes} class
                {t.activity.classes === 1 ? "" : "es"} · {t.activity.scans} scan
                {t.activity.scans === 1 ? "" : "s"} · {t.activity.workouts}{" "}
                workout{t.activity.workouts === 1 ? "" : "s"}
                {t.firstSessionAt
                  ? ` · 1st session ${new Date(t.firstSessionAt).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" },
                    )}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ActivityButton onClick={openActivity} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* send area */}
          <div className="space-y-3">
            {/* 1. state badge */}
            <div className="flex items-center gap-2">
              {t.nextStep?.state === "overdue" ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-400">
                  Overdue
                </span>
              ) : (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  Due
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {t.nextStep?.step?.label}
                {t.nextStep?.step?.day != null
                  ? ` · Day ${t.nextStep.step.day}`
                  : ""}
              </span>
            </div>

            {/* 2. template dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Template
              </label>
              <Select value={selKey} onValueChange={setSelKey}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schedule.map((s) => (
                    <SelectItem key={s.key} value={s.key} disabled={s.auto}>
                      {s.label}
                      {s.auto ? " · auto" : ""}
                      {s.key === t.nextStep?.step?.key ? " · suggested" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. template message (read-only) */}
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

            {/* 4. coach note */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Coach note · optional — the personal bit you add
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value.replace(/[\r\n]+/g, " "))}
                onKeyDown={(e) => {
                  // No paragraphs in the coach note — a line break breaks the send.
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder={step.defaultNote || "Add a personal note…"}
                rows={2}
              />
            </div>

            {/* 5. sends as (live preview) */}
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

            {/* 6. actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1"
              >
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSeq((v) => !v)}
              >
                View sequence{" "}
                {showSeq ? (
                  <ChevronUp className="ml-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </Button>
            </div>

            {/* sequence expander */}
            {showSeq && <SequenceList t={t} />}
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

// ── Sequence expander (per-step dots) ───────────────────────────────────────

function SequenceList({ t }: { t: NurtureTrialist }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Sequence
      </p>
      <div className="space-y-1.5">
        {t.steps.map((s) => {
          const sent = s.status === "sent";
          const due = s.status === "due" || s.status === "overdue";
          return (
            <div
              key={s.step.key}
              className={`flex items-center gap-2 text-xs ${
                !sent && !due ? "text-muted-foreground/70" : ""
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  sent
                    ? "bg-emerald-500 text-white"
                    : due
                      ? s.status === "overdue"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : "bg-primary/20 text-primary"
                      : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {sent ? "✓" : due ? "!" : ""}
              </span>
              <span className="flex-1 truncate">
                {s.step.label}
                {s.step.auto && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    auto
                  </span>
                )}
              </span>
              {sent ? (
                <span className="text-[10px] text-muted-foreground">
                  {s.sentBy ?? "auto"}
                  {s.sentAt
                    ? ` · ${new Date(s.sentAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}`
                    : ""}
                </span>
              ) : due ? (
                <span
                  className={`text-[10px] font-medium ${
                    s.status === "overdue"
                      ? "text-red-600 dark:text-red-400"
                      : "text-primary"
                  }`}
                >
                  {s.status === "overdue" ? "overdue" : "due now"}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/70">
                  Day {s.step.day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Upcoming row (in the drip, nothing due) ──────────────────────────────────

function UpcomingRow({
  t,
  staffSecret,
}: {
  t: NurtureTrialist;
  staffSecret: string;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityMember, setActivityMember] = useState<any | null>(null);

  const nextLabel = t.steps.find((s) => s.status === "upcoming" && !s.step.auto)
    ?.step?.label;

  const openActivity = () => {
    setActivityMember({
      id: null,
      email: t.email,
      full_name: t.name,
      membership: null,
      online_client: false,
    });
    setActivityOpen(true);
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Day {t.trialDay}
                </span>
                {t.trialProduct && (
                  <span className="text-xs text-muted-foreground">
                    · {t.trialProduct}
                  </span>
                )}
                {nextLabel && (
                  <span className="text-xs text-muted-foreground">
                    · next: {nextLabel}
                  </span>
                )}
                {t.flags.hotLead && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    🟢 Hot lead
                  </span>
                )}
                {t.flags.neverAttended && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                    🔴 Not been in yet
                  </span>
                )}
                {t.flags.noShow && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    🟠 No-show
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ActivityButton onClick={openActivity} />
            </div>
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

// ── Joined row (signed up — the wins) ────────────────────────────────────────

function JoinedRow({
  t,
  staffSecret,
}: {
  t: NurtureTrialist;
  staffSecret: string;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityMember, setActivityMember] = useState<any | null>(null);

  const openActivity = () => {
    setActivityMember({
      id: null,
      email: t.email,
      full_name: t.name,
      membership: t.convertedProduct,
      online_client: false,
    });
    setActivityOpen(true);
  };

  return (
    <>
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
        <CardContent className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{t.name}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  ✅ Joined
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {t.convertedProduct
                  ? `Signed up: ${t.convertedProduct}`
                  : "Signed up"}
                {t.trialProduct ? ` · from ${t.trialProduct}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ActivityButton onClick={openActivity} />
            </div>
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

// Re-export User icon for the ActivityButton (keeps the import tree clean).
export { User };
