import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { syncMembershipsFromCsv } from "@/lib/membershipSync";

export default function SyncMembershipsCard({
  onDone,
}: {
  onDone?: () => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    setResult(null);
    try {
      const res = await syncMembershipsFromCsv(file);
      if (res.success !== true) {
        throw new Error((res as { error: string }).error);
      }
      setResult(res.results);
      toast.success(
        `Synced ${res.activeCount} memberships · Matched ${res.results.matched} · Created ${res.results.created ?? 0}`,
      );
      onDone?.();
    } catch (err: any) {
      toast.error(`Membership sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="flex-1 bg-card border-border">
      <CardHeader>
        <CardTitle>Sync Memberships</CardTitle>
        <CardDescription>
          Upload a Quoox <strong>Active Memberships</strong> export (.xlsx or
          .csv) to backfill the roster. Members without a webhook event will
          then show their plan and the trial board picks up any trialists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleSync}
            disabled={isSyncing}
          />
          {isSyncing && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {result && (
          <div className="text-sm space-y-1 rounded-lg border border-border bg-muted/30 p-3">
            <p className="font-semibold">Sync complete</p>
            <p className="text-muted-foreground">
              Matched: {result.matched} · Created: {result.created ?? 0} ·
              Unmatched: {result.unmatched} · Flagged: {result.flagged}
            </p>
            {result.unmatchedEmails?.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Unmatched emails (no app account or email mismatch):
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.unmatchedEmails.slice(0, 20).map((e: string) => (
                    <span
                      key={e}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50"
                    >
                      {e}
                    </span>
                  ))}
                  {result.unmatchedEmails.length > 20 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{result.unmatchedEmails.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
