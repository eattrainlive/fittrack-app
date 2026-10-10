import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Target,
  Play,
  MessageSquare,
  Phone,
  Video,
  Users,
  FileText,
  Pencil,
} from "lucide-react";
import { getEmbedUrl } from "@/lib/accWeekContent";
import { fmtDate } from "@/lib/accDashboardHelpers";
import { PhotoTile } from "../accDashboardWidgets";
import { saveMySosPlan, type AccClient } from "@/lib/accountabilityProgramme";
import type { AccCheckin } from "@/lib/accountabilityCheckins";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const parseSosPlan = (plan?: string | null) => {
  if (!plan) return { sos_on: "", sos_sign: "", sos_action: "" };
  const onIt = plan.match(/When I'm on it:\s*(.*)/)?.[1]?.trim() || "";
  const sign = plan.match(/First sign I'm slipping:\s*(.*)/)?.[1]?.trim() || "";
  const action = plan.match(/What I'll do:\s*(.*)/)?.[1]?.trim() || "";
  return { sos_on: onIt, sos_sign: sign, sos_action: action };
};

const buildSosPlan = (onIt: string, sign: string, action: string) =>
  `When I'm on it: ${onIt}\nFirst sign I'm slipping: ${sign}\nWhat I'll do: ${action}`;

const REPLY_FORMAT_ICON: Record<string, any> = {
  call: Phone,
  loom: Video,
  face: Users,
  written: FileText,
};

export function PhotosCard({
  baselinePhoto,
  latestPhoto,
  week,
  onUpload,
}: {
  baselinePhoto: any;
  latestPhoto: any;
  week: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <PhotoTile
            photo={baselinePhoto}
            label="Before"
            emptyText="No baseline"
          />
          <PhotoTile photo={latestPhoto} label="Now" emptyText="Add a photo" />
        </div>
        <label className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 cursor-pointer transition">
          <Camera className="w-3.5 h-3.5" /> Add now
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
          />
        </label>
        {(week === 3 || week === 6) && !latestPhoto && (
          <p className="text-[11px] text-amber-600 mt-1.5 text-center">
            📸 {week === 3 ? "Mid-point" : "Final"} photo due this week
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MeasurementsCard({
  client,
  latestMeas,
}: {
  client: AccClient;
  latestMeas: any;
}) {
  const measDelta = (key: string) => {
    const base = client.baseline?.[key] ? Number(client.baseline[key]) : null;
    const now = latestMeas?.[key] ? Number(latestMeas[key]) : null;
    if (base == null || now == null) return null;
    return Number((now - base).toFixed(1));
  };
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Measurements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {(["waist", "tummy", "chest", "thigh"] as const).map((key) => {
          const d = measDelta(key);
          const base = client.baseline?.[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground capitalize">{key}</span>
              <span className="flex items-center gap-2">
                {base ? (
                  <span className="text-xs text-muted-foreground">
                    {base}cm
                  </span>
                ) : null}
                {d != null ? (
                  <span
                    className={`font-medium ${
                      d < 0 ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {d > 0 ? "+" : ""}
                    {d}cm
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
          );
        })}
        {!client.baseline?.waist && !latestMeas?.waist && (
          <p className="text-xs text-muted-foreground pt-1">
            Add measurements in Progress to track changes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function CoachReplyCard({
  reply,
  coachName,
  coachAvatar,
}: {
  reply: AccCheckin;
  coachName: string;
  coachAvatar: string | null;
}) {
  return (
    <Card className="bg-primary/5 border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
            {coachAvatar ? (
              <img
                src={coachAvatar}
                alt={coachName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-primary">
                {coachName.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <CardTitle className="text-sm">{coachName}'s reply</CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Week {reply.week_number} · {fmtDate(reply.coach_replied_at)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {reply.coach_reply_note && (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {reply.coach_reply_note}
          </p>
        )}
        {reply.coach_reply_loom_url &&
          (() => {
            const e = getEmbedUrl(reply.coach_reply_loom_url!);
            return e ? (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <iframe
                  src={e}
                  className="w-full h-full"
                  allowFullScreen
                  title="Coach video"
                />
              </div>
            ) : (
              <a
                href={reply.coach_reply_loom_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium"
              >
                <Play className="w-4 h-4" /> Watch your coach's video
              </a>
            );
          })()}
        {reply.coach_reply_format && !reply.coach_reply_loom_url && (
          <Badge variant="outline" className="text-xs">
            {(() => {
              const Icon =
                REPLY_FORMAT_ICON[reply.coach_reply_format!] || MessageSquare;
              return <Icon className="w-3 h-3 mr-1" />;
            })()}
            {reply.coach_reply_format}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function SosPlanCard({
  sosPlan,
  clientId,
  readOnly,
  onSaved,
}: {
  sosPlan: string;
  clientId: string;
  readOnly?: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [onIt, setOnIt] = useState("");
  const [sign, setSign] = useState("");
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);

  const openEdit = () => {
    const p = parseSosPlan(sosPlan);
    setOnIt(p.sos_on);
    setSign(p.sos_sign);
    setAction(p.sos_action);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    const { error } = await saveMySosPlan(
      clientId,
      buildSosPlan(onIt, sign, action),
    );
    setBusy(false);
    if (error) {
      toast.error("Couldn't save your SOS plan");
    } else {
      toast.success("SOS plan updated");
      setOpen(false);
      onSaved?.();
    }
  };

  return (
    <>
      <Card className="bg-card border-primary/30 border-l-4 border-l-primary">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Your SOS plan
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={openEdit}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {sosPlan}
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit your SOS plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                When I'm on it, I…
              </Label>
              <Input value={onIt} onChange={(e) => setOnIt(e.target.value)} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                The first sign I'm slipping is…
              </Label>
              <Input value={sign} onChange={(e) => setSign(e.target.value)} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1.5">
                When I spot it, the first thing I'll do is…
              </Label>
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WinsStrip({
  wins,
}: {
  wins: { label: string; emoji: string }[];
}) {
  if (wins.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Your wins so far
      </p>
      <div className="flex flex-wrap gap-2">
        {wins.map((w, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1.5 text-sm font-medium"
          >
            <span>{w.emoji}</span> {w.label}
          </span>
        ))}
      </div>
    </div>
  );
}
