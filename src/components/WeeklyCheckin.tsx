import { useEffect, useState } from "react";
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
import { ShortText, LongText, Scale05, QLabel } from "./onboardingFields";
import type { AccClient, AccCohort } from "@/lib/accountabilityProgramme";

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
  const [f, setF] = useState<Record<string, any>>({});

  const set = (k: string, v: any) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) return;
    (async () => {
      const existing = await getMyCheckin(client.id, week);
      if (existing) {
        setF({ ...existing.responses });
        setSubmitted(true);
        setPhotoUrl(existing.responses.q10photo || null);
      } else {
        setF({});
        setSubmitted(false);
        setPhotoUrl(null);
      }
    })();
  }, [open, client.id, week]);

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
      const responses = { ...f, q10photo: photoUrl };
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await saveCheckin({
        clientId: client.id,
        userId: user.id,
        cohortId: cohort.id,
        weekNumber: week,
        responses,
      });
      if (error) throw error;
      toast.success("Check-in submitted — great work 🎉");
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
            <div>
              <QLabel n={1}>Overall, how did this week go?</QLabel>
              <Scale05 value={f.q1 || ""} onChange={(v) => set("q1", v)} />
              <p className="text-xs text-muted-foreground mt-1">
                0 = rough, 5 = brilliant
              </p>
            </div>

            <div>
              <QLabel n={2}>
                How consistently did you hit each habit (plate / protein / water
                / steps / this week's new habit)?
              </QLabel>
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
                Did any 'slip' triggers show up (from your SOS plan) — and what
                will you do next week?
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
              <QLabel n={10}>
                Done your progress photos — and how are you feeling about
                progress?
              </QLabel>
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
                        Add progress photo
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
              </div>
              <LongText
                value={f.q10 || ""}
                onChange={(v) => set("q10", v)}
                placeholder="How you're feeling about progress…"
              />
            </div>

            <div>
              <QLabel n={11}>
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
