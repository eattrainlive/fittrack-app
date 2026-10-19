import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Eye, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getClientFocus,
  upsertClientFocus,
  type ClientFocus,
} from "@/lib/clientFocus";
import type { AccClient } from "@/lib/accountabilityProgramme";

/**
 * Coach editor for the client-facing "This week's focus" note. The coach writes
 * (or pastes) what they agreed for the week; the client sees it on their own
 * accountability dashboard. One note per week.
 */
export function ClientFocusCard({
  client,
  currentWeek,
  totalWeeks,
}: {
  client: AccClient;
  currentWeek: number;
  totalWeeks: number;
}) {
  const weeks = useMemo(
    () => Array.from({ length: totalWeeks }, (_, i) => i + 1),
    [totalWeeks],
  );
  const [focus, setFocus] = useState<ClientFocus[]>([]);
  const [week, setWeek] = useState(
    Math.min(Math.max(currentWeek || 1, 1), totalWeeks),
  );
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const byWeek = useMemo(() => {
    const m = new Map<number, ClientFocus>();
    for (const f of focus) m.set(f.week_number, f);
    return m;
  }, [focus]);

  const load = useCallback(async () => {
    setLoading(true);
    setFocus(await getClientFocus(client.id));
    setLoading(false);
  }, [client.id]);

  useEffect(() => {
    load();
  }, [load]);

  // When the selected week (or loaded data) changes, prefill the textarea.
  useEffect(() => {
    setBody(byWeek.get(week)?.body || "");
  }, [week, byWeek]);

  const save = async () => {
    if (!body.trim()) {
      toast.error("Write the focus first");
      return;
    }
    setSaving(true);
    const { error } = await upsertClientFocus(client.id, week, body.trim());
    setSaving(false);
    if (error) {
      toast.error("Couldn't save — try again");
      return;
    }
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
    load();
  };

  return (
    <Card className="bg-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> This week&rsquo;s focus
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> The client sees this on their dashboard.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Week selector */}
        <div className="flex flex-wrap gap-1.5">
          {weeks.map((w) => {
            const has = byWeek.has(w);
            const active = w === week;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setWeek(w)}
                className={
                  "relative rounded-lg border px-3 py-1.5 text-xs font-medium transition " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground")
                }
              >
                Wk {w}
                {has && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
                {w === currentWeek && (
                  <span className="ml-1 text-[9px] uppercase tracking-wide opacity-70">
                    now
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What we agreed to focus on this week — in plain, encouraging language the client will read…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedTick ? (
                <>
                  <Check className="h-4 w-4" /> Saved
                </>
              ) : byWeek.has(week) ? (
                `Update Week ${week} focus`
              ) : (
                `Set Week ${week} focus`
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ClientFocusCard;
