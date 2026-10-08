import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  CheckCircle2,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { type Trialist } from "@/lib/staffHubMetrics";
import {
  useTrialStages,
  TRIAL_STAGE_ORDER,
  TRIAL_STAGE_LABELS,
  type TrialStage,
  type EnrichedTrialist,
} from "@/lib/trialStages";
import {
  OutcomeSheet,
  EmailButton,
  LoggedBadge,
  EmptyState,
  useOutcomeSheet,
  staffName,
  fmtDate,
  fmtDateTime,
  finishChip,
} from "./staffHubShared";

export function TrialistPipeline({
  list,
  logged,
  onLogged,
}: {
  list: Trialist[];
  logged: Record<string, string>;
  onLogged: (email: string, outcome: string) => void;
}) {
  const { byStage, loading, setStage } = useTrialStages(list, staffName());
  const [stage, setStageView] = useState<TrialStage>("to_contact");
  const sheet = useOutcomeSheet();

  const cards = byStage[stage] ?? [];

  return (
    <div className="space-y-3">
      {loading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading pipeline…
        </p>
      )}

      {/* stage pills */}
      <div className="flex flex-wrap gap-1.5">
        {TRIAL_STAGE_ORDER.map((s) => {
          const count = byStage[s]?.length ?? 0;
          const active = stage === s;
          return (
            <button
              key={s}
              onClick={() => setStageView(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {TRIAL_STAGE_LABELS[s]} {count}
            </button>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <EmptyState text="Nobody here yet" />
      ) : (
        <div className="space-y-2">
          {cards.map((t) => (
            <TrialistStageCard
              key={t.key}
              t={t}
              logged={logged[t.email]}
              onLog={() => sheet.openFor(t.name, t.email)}
              onMove={(s) => setStage(t, s)}
            />
          ))}
        </div>
      )}

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

function TrialistStageCard({
  t,
  logged,
  onLog,
  onMove,
}: {
  t: EnrichedTrialist;
  logged?: string;
  onLog: () => void;
  onMove: (stage: TrialStage) => Promise<boolean | void>;
}) {
  const [moving, setMoving] = useState(false);
  const chip = finishChip(t.finishes);

  const handleMove = async (s: TrialStage) => {
    setMoving(true);
    try {
      const ok = await onMove(s);
      if (ok === false) toast.error("Couldn't move — try again");
      else toast.success(`Moved to ${TRIAL_STAGE_LABELS[s]}`);
    } catch {
      toast.error("Couldn't move — try again");
    } finally {
      setMoving(false);
    }
  };

  return (
    <Card className={logged ? "opacity-70" : ""}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{t.name}</p>
            <p className="text-xs text-muted-foreground">
              {t.trial}
              {t.category ? ` · ${t.category}` : ""}
            </p>

            {/* stage-appropriate hint */}
            {t.effectiveStage === "joined" ? (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.convertedProduct
                  ? `→ ${t.convertedProduct}`
                  : "Membership bought"}
              </p>
            ) : t.effectiveStage === "booked_review" && t.reviewAt ? (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <Calendar className="h-3.5 w-3.5" />
                Review {fmtDateTime(t.reviewAt)}
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Finishes {fmtDate(t.finishes)}
                </p>
                {chip && (
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <EmailButton email={t.email} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={t.stageLocked || moving}
                  aria-label="Move stage"
                >
                  {moving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Move to stage
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TRIAL_STAGE_ORDER.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleMove(s)}
                    className={`justify-between ${
                      s === t.effectiveStage ? "font-semibold" : ""
                    }`}
                  >
                    {TRIAL_STAGE_LABELS[s]}
                    {s === t.effectiveStage && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {t.stageLocked && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Membership confirmed
          </p>
        )}

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
