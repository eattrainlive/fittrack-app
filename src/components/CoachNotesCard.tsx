import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NotebookPen,
  Copy,
  Trash2,
  Check,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCoachNotes,
  addCoachNote,
  deleteCoachNote,
  COACH_NOTE_KINDS,
  type CoachNote,
  type CoachNoteKind,
} from "@/lib/coachNotes";
import type { AccClient } from "@/lib/accountabilityProgramme";

const kindLabel: Record<CoachNoteKind, string> = {
  onboarding: "Onboarding",
  checkin: "Check-in",
  general: "General",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * Coach notes timeline on a client's profile — a running log of conversation
 * round-ups (in-person onboarding, in-person check-ins, ad-hoc). Each note is
 * copyable, and "Copy all for Claude" assembles the client's context + every
 * note into a pastable block for a Claude project.
 */
export function CoachNotesCard({
  client,
  clientName,
}: {
  client: AccClient;
  clientName: string;
}) {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<CoachNoteKind>("onboarding");
  const [week, setWeek] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotes(await getCoachNotes(client.id));
    setLoading(false);
  }, [client.id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!body.trim()) {
      toast.error("Write a note first");
      return;
    }
    setSaving(true);
    const { error } = await addCoachNote({
      clientId: client.id,
      kind,
      body: body.trim(),
      weekNumber: kind === "checkin" && week ? Number(week) : null,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save — try again");
      return;
    }
    setBody("");
    setWeek("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await deleteCoachNote(id);
    if (error) toast.error("Couldn't delete");
    else load();
  };

  const copyText = async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const noteToText = (n: CoachNote) =>
    `[${kindLabel[n.kind]}${
      n.kind === "checkin" && n.week_number != null
        ? ` · Week ${n.week_number}`
        : ""
    } · ${fmtDate(n.created_at)}]\n${n.body}`;

  // Build a pastable context block for a Claude project.
  const buildAll = () => {
    const b = (client.baseline as any) || {};
    const ctx: string[] = [`Client: ${clientName}`];
    if (client.nutrition_approach)
      ctx.push(`Nutrition approach: ${client.nutrition_approach}`);
    if (client.why) ctx.push(`Their why: ${client.why}`);
    const baseline = [
      b.weight && `weight ${b.weight}kg`,
      b.waist && `waist ${b.waist}`,
      b.steps && `${b.steps} steps`,
    ]
      .filter(Boolean)
      .join(", ");
    if (baseline) ctx.push(`Baseline: ${baseline}`);
    const body = notes
      .slice()
      .reverse() // oldest first for a chronological history
      .map(noteToText)
      .join("\n\n");
    return (
      `${ctx.join("\n")}\n\n— Coach notes (oldest first) —\n\n${body}`.trim()
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" /> Coach notes
          </CardTitle>
          {notes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => copyText(buildAll())}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Copy all for Claude
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add a note */}
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {COACH_NOTE_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (kind === k.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground")
                }
              >
                {k.label}
              </button>
            ))}
            {kind === "checkin" && (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={6}
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                placeholder="Wk"
                className="w-14 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={
              kind === "onboarding"
                ? "Round up the onboarding conversation — goals, context, what you agreed…"
                : kind === "checkin"
                  ? "Round up the in-person check-in — wins, blockers, what's next…"
                  : "Add a note about this client…"
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="sm"
            className="w-full"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save note"
            )}
          </Button>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No notes yet. Your round-ups will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 h-4"
                    >
                      {kindLabel[n.kind]}
                      {n.kind === "checkin" && n.week_number != null
                        ? ` · Wk ${n.week_number}`
                        : ""}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {fmtDate(n.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyText(noteToText(n), n.id)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      title="Copy note"
                    >
                      {copiedId === n.id ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(n.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CoachNotesCard;
