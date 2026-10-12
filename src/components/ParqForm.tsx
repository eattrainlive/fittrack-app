import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PARQ_QUESTIONS, saveParq } from "@/lib/parq";

interface ParqFormProps {
  /** Called after a successful save — the gate re-checks status. */
  onDone?: () => void;
  /** When true, a network error already occurred; show a soft "skip for now". */
  softFail?: boolean;
}

export function ParqForm({ onDone, softFail }: ParqFormProps) {
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>(
    {},
  );
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [netError, setNetError] = useState(softFail ?? false);

  const allAnswered = PARQ_QUESTIONS.every((q) => answers[q.key] != null);
  const anyYes = PARQ_QUESTIONS.some((q) => answers[q.key] === true);
  const canSubmit = allAnswered && agreed && name.trim().length > 0 && !saving;

  const submit = async () => {
    setSaving(true);
    setNetError(false);
    try {
      const mapped: Record<string, boolean> = {};
      for (const q of PARQ_QUESTIONS) mapped[q.key] = answers[q.key] === true;
      const { error } = await saveParq({
        answers: mapped,
        details: details.trim() || undefined,
        declarationName: name.trim(),
      });
      if (error) {
        // Offline / network — don't lock them out.
        setNetError(true);
        toast.error(
          "Couldn't save — check your connection. You can skip for now and we'll ask again next time.",
        );
        return;
      }
      toast.success("Thanks — you're all set!");
      onDone?.();
    } catch {
      setNetError(true);
      toast.error("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl space-y-6 py-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Health Check
              </span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl tracking-wide">
              PAR-Q Questionnaire
            </h1>
            <p className="text-sm text-muted-foreground">
              Before you get started, please complete this quick health
              questionnaire (PAR-Q). It takes a minute and keeps you training
              safely.
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {PARQ_QUESTIONS.map((q, i) => {
              const val = answers[q.key];
              return (
                <Card key={q.key} className="bg-muted/30 border-border">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium leading-snug">
                      <span className="text-muted-foreground mr-1.5">
                        {i + 1}.
                      </span>
                      {q.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAnswers((a) => ({ ...a, [q.key]: true }))
                        }
                        className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          val === true
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card hover:bg-muted/60"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAnswers((a) => ({ ...a, [q.key]: false }))
                        }
                        className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          val === false
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card hover:bg-muted/60"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Amber notice when any Yes */}
          {anyYes && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You answered yes to one or more questions. We strongly
                  recommend you speak to your doctor before starting or
                  increasing physical activity. Our team has been notified and
                  may check in with you.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-amber-800 dark:text-amber-200">
                  Anything you'd like us to know? (optional)
                </Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Add any context for your coach…"
                  className="bg-card border-amber-500/30 text-sm"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Declaration */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Declaration
              </p>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="parq-agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="parq-agree"
                  className="text-sm leading-snug cursor-pointer"
                >
                  I confirm the answers above are accurate to the best of my
                  knowledge.
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full name (signature)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Type your full name"
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2 pb-8">
            <Button
              onClick={submit}
              disabled={!canSubmit}
              size="lg"
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Complete & continue"
              )}
            </Button>
            {netError && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDone?.();
                }}
                className="text-muted-foreground"
              >
                Skip for now — we'll ask again next time
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
