import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Flag,
  Play,
  Plus,
  Check,
  Phone,
  Video,
  Users,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getClientCheckins,
  getClientFollowups,
  replyToCheckin,
  addFollowup,
  closeFollowup,
  type AccCheckin,
  type AccFollowup,
} from "@/lib/accountabilityCheckins";
import {
  WEEK_THEMES,
  type AccClient,
  type AccCohort,
} from "@/lib/accountabilityProgramme";
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

function CheckinCard({
  checkin,
  onSaved,
}: {
  checkin: AccCheckin;
  onSaved: () => void;
}) {
  const r = checkin.responses || {};
  const theme = themeFor(checkin.week_number);
  const isFinal = checkin.week_number === 6;
  const replied = !!checkin.coach_replied_at;

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

export function AccountabilityClientConsole({
  client,
  cohort,
  onBack,
}: {
  client: AccClient;
  cohort: AccCohort;
  onBack: () => void;
}) {
  const [checkins, setCheckins] = useState<AccCheckin[]>([]);
  const [followups, setFollowups] = useState<AccFollowup[]>([]);
  const [name, setName] = useState("Client");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cks, fus] = await Promise.all([
      getClientCheckins(client.id),
      getClientFollowups(client.id),
    ]);
    setCheckins(cks);
    setFollowups(fus);
    const { data: member } = await supabase
      .from("members")
      .select("full_name, email")
      .eq("id", client.user_id)
      .maybeSingle();
    setName(
      (member as any)?.full_name ||
        (member as any)?.email?.split("@")[0] ||
        "Client",
    );
    setLoading(false);
  }, [client.id, client.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const theme = themeFor(
    Math.min(
      cohort.weeks,
      Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(cohort.start_date + "T00:00:00").getTime()) /
            604800000,
        ) + 1,
      ),
    ),
  );
  const openFollowups = followups.filter((f) => !f.closed_at);

  const handleCloseFu = async (id: string) => {
    const { error } = await closeFollowup(id);
    if (error) toast.error("Couldn't close");
    else load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inbox
      </Button>

      {/* Header */}
      <Card className="bg-card border-border">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-heading text-2xl tracking-wide">{name}</h2>
            {theme && (
              <Badge variant="secondary">
                Week{" "}
                {Math.min(
                  cohort.weeks,
                  Math.max(
                    1,
                    Math.floor(
                      (Date.now() -
                        new Date(cohort.start_date + "T00:00:00").getTime()) /
                        604800000,
                    ) + 1,
                  ),
                )}{" "}
                of {cohort.weeks} — {theme.title}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {client.nutrition_approach && (
              <span>Approach: {client.nutrition_approach}</span>
            )}
            {client.accountability_style && (
              <span>Accountability: {client.accountability_style}</span>
            )}
            {client.checkin_pref && (
              <span>Check-in: {client.checkin_pref}</span>
            )}
          </div>
          {/* 6-dot progress strip */}
          <div className="flex gap-1.5 pt-1">
            {WEEK_THEMES.map((t) => {
              const done = checkins.some((c) => c.week_number === t.week);
              return (
                <div
                  key={t.week}
                  className={`h-2 flex-1 rounded-full ${
                    done ? "bg-primary" : "bg-muted"
                  }`}
                  title={`Week ${t.week}`}
                />
              );
            })}
          </div>
          {client.why && (
            <p className="text-sm italic text-muted-foreground border-l-2 border-primary/40 pl-3">
              "{client.why}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Non-scale trends */}
      {checkins.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">Non-scale trends</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-xs">
            {[
              { label: "Energy", key: "q4" },
              { label: "Sleep", key: "q5" },
              { label: "Mood", key: "q6" },
            ].map((m) => {
              const vals = checkins
                .filter(
                  (c) => c.week_number <= 5 && c.responses?.[m.key] != null,
                )
                .map((c) => c.responses[m.key]);
              if (vals.length < 2) return null;
              return (
                <div key={m.key}>
                  <p className="text-muted-foreground">{m.label}</p>
                  <p className="font-heading text-sm">{vals.join(" → ")}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* SOS plan */}
      {client.sos_plan && (
        <Card className="bg-card border-primary/30 border-l-4 border-l-primary">
          <CardContent className="py-3">
            <p className="text-xs font-semibold text-primary">SOS plan</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.sos_plan}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Open follow-ups */}
      {openFollowups.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm">Open follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openFollowups.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
              >
                <p className="text-sm">{f.note}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloseFu(f.id)}
                  className="gap-1.5 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Close
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly check-in log */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg tracking-wide">
          Weekly check-in log
        </h3>
        {checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No check-ins submitted yet.
          </p>
        ) : (
          [...checkins]
            .sort((a, b) => b.week_number - a.week_number)
            .map((c) => <CheckinCard key={c.id} checkin={c} onSaved={load} />)
        )}
      </div>
    </div>
  );
}

export default AccountabilityClientConsole;
