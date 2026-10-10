import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Flag,
  Play,
  Plus,
  Check,
  Phone,
  Video,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  replyToCheckin,
  addFollowup,
  type AccCheckin,
} from "@/lib/accountabilityCheckins";
import { WEEK_THEMES, type AccClient } from "@/lib/accountabilityProgramme";
import { getEmbedUrl } from "@/lib/accWeekContent";

const themeFor = (week: number) =>
  WEEK_THEMES.find((t) => t.week === week) || null;

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";

const REPLY_FORMATS = [
  { key: "call", label: "Call", icon: Phone },
  { key: "loom", label: "Loom", icon: Video },
  { key: "face", label: "Face-to-face", icon: Users },
  { key: "written", label: "Written", icon: FileText },
];

function ReplyEditor({
  checkin,
  onSaved,
}: {
  checkin: AccCheckin;
  onSaved: () => void;
}) {
  const [format, setFormat] = useState(checkin.coach_reply_format || "");
  const [note, setNote] = useState(checkin.coach_reply_note || "");
  const [loom, setLoom] = useState(checkin.coach_reply_loom_url || "");
  const [flagged, setFlagged] = useState(!!checkin.flagged);
  const [busy, setBusy] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [fuNote, setFuNote] = useState("");
  const replied = !!checkin.coach_replied_at;

  const save = async () => {
    if (!format) {
      toast.error("Pick a reply format");
      return;
    }
    setBusy(true);
    const { error } = await replyToCheckin({
      checkinId: checkin.id,
      format,
      note,
      loomUrl: loom,
      flagged,
    });
    setBusy(false);
    if (error) toast.error("Couldn't save reply");
    else {
      toast.success("Reply saved");
      onSaved();
    }
  };

  const saveFollowup = async () => {
    if (!fuNote.trim()) return;
    const { error } = await addFollowup(checkin.client_id, fuNote);
    if (error) toast.error("Couldn't add follow-up");
    else {
      toast.success("Follow-up added");
      setFuNote("");
      setShowFollowup(false);
      onSaved();
    }
  };

  const embed = loom ? getEmbedUrl(loom) : null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          {replied ? "Your reply" : "Log your reply"}
        </span>
        {replied && (
          <Badge className="bg-primary/15 text-primary border-0 text-xs">
            <Check className="w-3 h-3 mr-1" /> Replied{" "}
            {fmtDate(checkin.coach_replied_at)}
          </Badge>
        )}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Reply format
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {REPLY_FORMATS.map((r) => {
            const Icon = r.icon;
            const active = format === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setFormat(r.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Notes
        </Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add your call notes…"
          rows={3}
          className="resize-none"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Loom link (optional)
        </Label>
        <Input
          value={loom}
          onChange={(e) => setLoom(e.target.value)}
          placeholder="https://www.loom.com/share/…"
        />
        {embed && (
          <div className="mt-2 aspect-video rounded-lg overflow-hidden border border-border">
            <iframe
              src={embed}
              className="w-full h-full"
              allowFullScreen
              title="Loom reply"
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <button
          type="button"
          onClick={() => setFlagged((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
            flagged
              ? "bg-amber-500/15 text-amber-600 border-amber-500/40"
              : "bg-card border-border hover:bg-muted"
          }`}
        >
          <Flag className="w-3.5 h-3.5" /> Flag for personal handling
        </button>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFollowup((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add follow-up
        </Button>
        <Button size="sm" onClick={save} disabled={busy} className="gap-1.5">
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          {replied ? "Update reply" : "Save reply"}
        </Button>
      </div>

      {showFollowup && (
        <div className="flex gap-2">
          <Input
            value={fuNote}
            onChange={(e) => setFuNote(e.target.value)}
            placeholder="Follow-up note…"
          />
          <Button size="sm" variant="outline" onClick={saveFollowup}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

export function AccCheckinCard({
  checkin,
  client,
  onSaved,
}: {
  checkin: AccCheckin;
  client: AccClient;
  onSaved: () => void;
}) {
  const r = checkin.responses || {};
  const theme = themeFor(checkin.week_number);
  const isFinal = checkin.week_number === 6;

  return (
    <Card
      className={`bg-card ${
        checkin.flagged
          ? "border-amber-500/50 border-l-4 border-l-amber-500"
          : "border-border"
      }`}
    >
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {isFinal ? "Final review" : `Week ${checkin.week_number}`}
            </Badge>
            {theme && (
              <span className="text-xs text-muted-foreground">
                {theme.title}
              </span>
            )}
            {checkin.flagged && (
              <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">
                <Flag className="w-3 h-3 mr-1" /> Flagged
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {fmtDate(checkin.submitted_at)}
          </span>
        </div>

        {!isFinal && r.q1 != null && (
          <p className="text-sm">
            <span className="text-muted-foreground">Overall:</span>{" "}
            <span className="font-semibold">{r.q1}/5</span>
          </p>
        )}
        {r.q3 && (
          <p className="text-sm">
            <span className="text-muted-foreground">Win:</span> {r.q3}
          </p>
        )}
        {r.q7 && (
          <p className="text-sm">
            <span className="text-muted-foreground">In the way:</span> {r.q7}
          </p>
        )}
        {r.q8 && (
          <p className="text-sm">
            <span className="text-muted-foreground">SOS trigger:</span> {r.q8}
          </p>
        )}
        {r.weekQ && (
          <div className="text-sm">
            <span className="text-muted-foreground">Week question:</span>{" "}
            {r.weekQ}
            {r.weekA && (
              <p className="mt-0.5 pl-2 border-l-2 border-border text-foreground">
                {r.weekA}
              </p>
            )}
          </div>
        )}
        {/* Week 3 SOS plan fields captured in this check-in */}
        {(r.sos_on || r.sos_sign || r.sos_action) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1">
            <p className="text-xs font-semibold text-primary">SOS plan</p>
            {r.sos_on && (
              <p className="text-sm">
                <span className="text-muted-foreground">On it:</span> {r.sos_on}
              </p>
            )}
            {r.sos_sign && (
              <p className="text-sm">
                <span className="text-muted-foreground">Slipping sign:</span>{" "}
                {r.sos_sign}
              </p>
            )}
            {r.sos_action && (
              <p className="text-sm">
                <span className="text-muted-foreground">First action:</span>{" "}
                {r.sos_action}
              </p>
            )}
            {r.step_target && (
              <p className="text-sm">
                <span className="text-muted-foreground">Step target:</span>{" "}
                <span className="font-semibold">
                  {Number(r.step_target).toLocaleString()}/day
                </span>
              </p>
            )}
          </div>
        )}
        {checkin.avg_steps != null && (
          <p className="text-sm">
            <span className="text-muted-foreground">Avg steps:</span>{" "}
            <span className="font-semibold">
              {Number(checkin.avg_steps).toLocaleString()}/day
            </span>
          </p>
        )}
        {checkin.avg_weight != null && (
          <p className="text-sm">
            <span className="text-muted-foreground">Avg weight:</span>{" "}
            <span className="font-semibold">
              {Number(checkin.avg_weight).toFixed(1)} kg
            </span>
          </p>
        )}
        {/* Tracking numbers (tracking clients only) */}
        {(r.trackDays != null ||
          r.trackCalories != null ||
          r.trackProtein != null ||
          r.trackShot) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
            <p className="text-xs font-semibold text-primary">Tracking</p>
            {r.trackDays != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Days logged:
                </span>
                <span className="text-sm font-semibold">{r.trackDays}/7</span>
                {Number(r.trackDays) < 4 && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">
                    Low
                  </Badge>
                )}
              </div>
            )}
            {r.trackCalories != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Calories:</span>
                <span
                  className={`text-sm font-semibold ${
                    client.calorie_target
                      ? Math.abs(
                          Number(r.trackCalories) -
                            Number(client.calorie_target),
                        ) <=
                        Number(client.calorie_target) * 0.1
                        ? ""
                        : "text-amber-600"
                      : ""
                  }`}
                >
                  {r.trackCalories}
                </span>
                {client.calorie_target && (
                  <span className="text-xs text-muted-foreground">
                    · target {client.calorie_target}
                  </span>
                )}
              </div>
            )}
            {r.trackProtein != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Protein:</span>
                <span
                  className={`text-sm font-semibold ${
                    client.protein_target
                      ? Number(r.trackProtein) >= Number(client.protein_target)
                        ? "text-green-600"
                        : "text-amber-600"
                      : ""
                  }`}
                >
                  {r.trackProtein} g
                </span>
                {client.protein_target && (
                  <span className="text-xs text-muted-foreground">
                    · target {client.protein_target} g
                  </span>
                )}
              </div>
            )}
            {r.trackShot && (
              <a href={r.trackShot} target="_blank" rel="noopener noreferrer">
                <img
                  src={r.trackShot}
                  alt="tracking summary"
                  className="h-20 rounded-lg border border-border object-cover"
                />
              </a>
            )}
          </div>
        )}
        {isFinal && r.q15 != null && (
          <p className="text-sm">
            <span className="text-muted-foreground">Programme rating:</span>{" "}
            <span className="font-semibold">{r.q15}/5</span>
            {r.q19 != null && (
              <>
                {" · "}
                <span className="text-muted-foreground">NPS:</span>{" "}
                <span className="font-semibold">{r.q19}/10</span>
              </>
            )}
          </p>
        )}

        <ReplyEditor checkin={checkin} onSaved={onSaved} />
      </CardContent>
    </Card>
  );
}

export default AccCheckinCard;
