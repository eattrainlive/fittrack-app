import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus } from "lucide-react";
import {
  ERG_MACHINES,
  getErgSummary,
  ergSummaryMap,
  daysLeft,
  type ErgRow,
} from "@/lib/ergChallenge";
import ErgLogDialog from "./ErgLogDialog";

export default function ErgChallengeCard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ErgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await getErgSummary();
    setRows(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const left = daysLeft();
  const ended = left === 0;
  const map = ergSummaryMap(rows);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Million Metre Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 w-full animate-pulse rounded-lg bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading tracking-wide">
              Million Metre Challenge
            </CardTitle>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {ended ? "Challenge ended" : `${left} days to Christmas`}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {ERG_MACHINES.map((m) => {
            const r = map[m.key];
            const total = r?.total_metres ?? 0;
            const mine = r?.my_metres ?? 0;
            const pct = Math.min(100, (total / m.target) * 100);
            const smashed = total >= m.target;
            return (
              <div
                key={m.key}
                className="space-y-1"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/challenge")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/challenge");
                }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.label}</span>
                  {smashed ? (
                    <span className="text-xs font-semibold text-primary">
                      Smashed it 🎉
                    </span>
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {total.toLocaleString()} / {m.target.toLocaleString()} m
                    </span>
                  )}
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${smashed ? 100 : pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  you: {mine.toLocaleString()} m
                </p>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            {!ended && (
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Log metres
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/challenge")}
            >
              Full challenge <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ErgLogDialog open={open} onOpenChange={setOpen} onSaved={load} />
    </>
  );
}
