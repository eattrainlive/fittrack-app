import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Check, ClipboardList, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { saveCheckin, getMyCheckin } from "@/lib/accountabilityCheckins";
import { TrackingBlock } from "./TrackingBlock";
import {
  ShortText,
  LongText,
  Scale05,
  NumberField,
  QLabel,
} from "./onboardingFields";
import { getWeekContent } from "@/lib/accWeekContent";
import { getAccWeekHabits } from "@/lib/accWeekHabits";
import { saveMySosPlan } from "@/lib/accountabilityProgramme";
import type { AccClient, AccCohort } from "@/lib/accountabilityProgramme";

/** Parse the stored 3-line SOS plan block back into its fields. */
const parseSosPlan = (plan?: string | null) => {
  if (!plan) return { sos_on: "", sos_sign: "", sos_action: "" };
  const onIt = plan.match(/When I'm on it:\s*(.*)/)?.[1]?.trim() || "";
  const sign = plan.match(/First sign I'm slipping:\s*(.*)/)?.[1]?.trim() || "";
  const action = plan.match(/What I'll do:\s*(.*)/)?.[1]?.trim() || "";
  return { sos_on: onIt, sos_sign: sign, sos_action: action };
};

const buildSosPlan = (onIt: string, sign: string, action: string) =>
  `When I'm on it: ${onIt}\nFirst sign I'm slipping: ${sign}\nWhat I'll do: ${action}`;

export function WeeklyCheckin({
  client,
  cohort,
  week,
  onDone,
}: {
  client: AccClient;
  cohort: AccCohort;
  week: number;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [trackShot, setTrackShot] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, any>>({});
  const [weekContent, setWeekContent] = useState<any>(null);
  const [unlockedHabits, setUnlockedHabits] = useState<string[]>([]);

  const set = (k: string, v: any) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) return;
    (async () => {
      const existing = await getMyCheckin(client.id, week);
      if (existing) {
        setF({ ...existing.responses });
        setSubmitted(true);
        setPhotoUrl(existing.responses.q10photo || null);
        setTrackShot(existing.responses.trackShot || null);
      } else {
        // Prefill Week-3 SOS fields from the saved plan / responses.
        if (week === 3) {
          const parsed = parseSosPlan(client.sos_plan);
          const stepBase =
            client.step_target ??
            ((client.baseline?.avg_steps_baseline ?? client.baseline?.steps)
              ? Math.round(
                  (Number(
                    client.baseline.avg_steps_baseline ?? client.baseline.steps,
                  ) +
                    1500) /
                    500,
                ) * 500
              : null);
          setF({
            sos_on: parsed.sos_on || existing?.responses?.sos_on || "",
            sos_sign: parsed.sos_sign || existing?.responses?.sos_sign || "",
            sos_action:
              parsed.sos_action || existing?.responses?.sos_action || "",
            stepTargetInput: stepBase ?? "",
          });
        } else {
          setF({});
        }
        setSubmitted(false);
        setPhotoUrl(null);
        setTrackShot(null);
      }
      const wc = await getWeekContent(week);
      setWeekContent(wc);
      const stack = await getAccWeekHabits(week);
      setUnlockedHabits(stack.map((h) => h.name));
    })();
  }, [
    open,
    client.id,
    client.sos_plan,
    client.step_target,
    client.baseline,
    week,
  ]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const ext = file.name.split(".").pop();
      const path = `nutrition-photos/${user.id}/acc-week${week}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      toast.success("Photo added");
    } catch (err: any) {
      toast.error("Photo upload failed: " + err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Compute this programme week's average bodyweight from history.
      const start = new Date(cohort.start_date + "T00:00:00");
      start.setDate(start.getDate() + (week - 1) * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const { data: bw } = await supabase
        .from("bodyweight_history")
        .select("date, weight")
        .eq("user_id", user.id);
      const inWindow = (bw ?? []).filter((b: any) => {
        const d = new Date(b.date + "T00:00:00");
        return d >= start && d < end;
      });
      const avgWeight = inWindow.length
        ? Number(
            (
              inWindow.reduce((s: number, b: any) => s + Number(b.weight), 0) /
              inWindow.length
            ).toFixed(1),
          )
        : null;

      const responses: Record<string, any> = {
        ...f,
        q10photo: photoUrl,
        trackShot,
      };
      // Week 3: keep the SOS fields + chosen step target in the responses
      // so the coach console can see them in that week's row.
      if (week === 3) {
        if (f.sos_on) responses.sos_on = f.sos_on;
        if (f.sos_sign) responses.sos_sign = f.sos_sign;
        if (f.sos_action) responses.sos_action = f.sos_action;
        if (f.stepTargetInput)
          responses.step_target = Number(f.stepTargetInput);
      }
      if (weekContent?.checkin_addon) {
        responses.weekQ = weekContent.checkin_addon;
        responses.weekA = f.weekA ?? "";
      }

      const { error } = await saveCheckin({
        clientId: client.id,
        userId: user.id,
        cohortId: cohort.id,
        weekNumber: week,
        responses,
        avgSteps: Number(f.avgSteps) || null,
        avgWeight,
      });
      if (error) throw error;
      toast.success("Check-in submitted — great work 🎉");

      // Week 3: save the SOS plan + step target (best-effort, don't block).
      if (week === 3 && (f.sos_on || f.sos_sign || f.sos_action)) {
        const planBlock = buildSosPlan(
          f.sos_on || "",
          f.sos_sign || "",
          f.sos_action || "",
        );
        const stepT = f.stepTargetInput ? Number(f.stepTargetInput) : null;
        const { error: sosErr } = await saveMySosPlan(
          client.id,
          planBlock,
          stepT,
        );
        if (sosErr)
          toast.warning(
            "Check-in saved, but SOS plan didn't save — try editing it on your dashboard.",
          );
      }

      setSubmitted(true);
      setOpen(false);
      onDone?.();
    } catch (err: any) {
      toast.error("Couldn't save: " + (err?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={submitted ? "outline" : "default"}
        className="gap-2 w-full"
      >
        <ClipboardList className="h-4 w-4" />
        {submitted
          ? `Week ${week} check-in done ✓`
          : `Complete Week ${week} check-in`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Week {week} check-in
            </DialogTitle>
            <DialogDescription>
              A quick reflection on your week — two minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-5 py-2">
            {week === 3 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div>
                  <Label className="block text-sm font-semibold text-primary">
                    Your SOS plan
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A pre-decided response for when willpower dips — so you
                    don't have to think in the moment.
                  </p>
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">
                    When I'm on it, I…
                  </Label>
                  <ShortText
                    value={f.sos_on || ""}
                    onChange={(v) => set("sos_on", v)}
                    placeholder="e.g. prep lunches Sunday, walk at lunch"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">
                    The first sign I'm slipping is…
                  </Label>
                  <ShortText
                    value={f.sos_sign || ""}
                    onChange={(v) => set("sos_sign", v)}
                    placeholder="e.g. skip the food shop, hit snooze twice"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">
                    When I spot it, the first thing I'll do is…
                  </Label>
                  <ShortText
                    value={f.sos_action || ""}
                    onChange={(v) => set("sos_action", v)}
                    placeholder="e.g. book the food shop, 10-min walk"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1.5">
                    Your daily step target from now on
                  </Label>
                  <NumberField
                    value={f.stepTargetInput || ""}
                    onChange={(v) => set("stepTargetInput", v)}
                    placeholder="e.g. 7000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your recent average plus 1,500–2,000. A bump, not a leap to
                    10k.
                  </p>
                </div>
              </div>
            )}

            <div>
              <QLabel n={1}>Overall, how did this week go?</QLabel>
              <Scale05 value={f.q1 || ""} onChange={(v) => set("q1", v)} />
              <p className="text-xs text-muted-foreground mt-1">
                0 = rough, 5 = brilliant
              </p>
            </div>

            <div>
              <QLabel n={2}>
                How consistently did you hit your habits this week?
              </QLabel>
              {unlockedHabits.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {unlockedHabits.join(" · ")}
                </p>
              )}
              <Scale05 value={f.q2 || ""} onChange={(v) => set("q2", v)} />
              <p className="text-xs text-muted-foreground mt-1">
                0 = not at all, 5 = nailed it
              </p>
            </div>

            <div>
              <QLabel n={3}>Your win of the week (scale or non-scale)</QLabel>
              <ShortText
                value={f.q3 || ""}
                onChange={(v) => set("q3", v)}
                placeholder="e.g. first proper home-cooked week, down a notch on the belt…"
              />
            </div>

            <div>
              <QLabel n={4}>Energy levels this week</QLabel>
              <Scale05 value={f.q4 || ""} onChange={(v) => set("q4", v)} />
            </div>

            <div>
              <QLabel n={5}>Sleep quality this week</QLabel>
              <Scale05 value={f.q5 || ""} onChange={(v) => set("q5", v)} />
            </div>

            <div>
              <QLabel n={6}>General mood around food & training</QLabel>
              <Scale05 value={f.q6 || ""} onChange={(v) => set("q6", v)} />
            </div>

            <div>
              <QLabel n={7}>What got in the way this week, if anything?</QLabel>
              <LongText
                value={f.q7 || ""}
                onChange={(v) => set("q7", v)}
                placeholder="Work, stress, social…"
              />
            </div>

            <div>
              <QLabel n={8}>
                {week <= 2
                  ? "What might trip you up next week, and what will you do about it?"
                  : "Did any 'slip' triggers show up (from your SOS plan) — and what will you do next week?"}
              </QLabel>
              <LongText value={f.q8 || ""} onChange={(v) => set("q8", v)} />
            </div>

            <div>
              <QLabel n={9}>One thing you'll focus on next week</QLabel>
              <ShortText
                value={f.q9 || ""}
                onChange={(v) => set("q9", v)}
                placeholder="e.g. hit my protein at breakfast…"
              />
            </div>

            <div>
              <QLabel n={10}>How are you feeling about progress?</QLabel>
              <div className="mb-2">
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 cursor-pointer hover:bg-muted/60 transition">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="progress"
                      className="h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-primary" />
                      <span className="text-xs font-medium">
                        {week === 3
                          ? "Add your midpoint photo"
                          : "Add progress photo (optional)"}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                    disabled={busy}
                  />
                </label>
                {week === 3 && !photoUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Same spot and pose as day 0 — private, just for you.
                  </p>
                )}
              </div>
              <LongText
                value={f.q10 || ""}
                onChange={(v) => set("q10", v)}
                placeholder="How you're feeling about progress…"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">
                Your average daily steps this week
              </Label>
              <NumberField
                value={f.avgSteps || ""}
                onChange={(v) => set("avgSteps", v)}
                placeholder="e.g. 7500"
              />
            </div>

            <TrackingBlock
              approach={client.nutrition_approach}
              f={f}
              set={set}
              trackShot={trackShot}
              setTrackShot={setTrackShot}
              busy={busy}
              week={week}
            />

            {weekContent?.checkin_addon && (
              <div>
                <QLabel n={11}>{weekContent.checkin_addon}</QLabel>
                <LongText
                  value={f.weekA || ""}
                  onChange={(v) => set("weekA", v)}
                />
              </div>
            )}

            <div>
              <QLabel n={weekContent?.checkin_addon ? 12 : 11}>
                Anything you want help with or want me to know?
              </QLabel>
              <LongText value={f.q11 || ""} onChange={(v) => set("q11", v)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy}
              className="gap-1"
            >
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Submit check-in
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WeeklyCheckin;
