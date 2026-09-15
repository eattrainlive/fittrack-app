import { useEffect, useState, useCallback } from "react";
import { Loader2, Eye, Users, UserCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getActiveCohort,
  getCohortClients,
  currentWeekOf,
  type AccClient,
  type AccCohort,
} from "@/lib/accountabilityProgramme";
import {
  getDemoData,
  loadRealClientData,
  type PreviewData,
} from "@/lib/accPreviewData";
import { AccountabilityDashboard } from "@/components/accDashboard/AccountabilityDashboard";

const WEEKS = [0, 1, 2, 3, 4, 5, 6];

const weekLabel = (w: number) =>
  w === 0 ? "Pre-start" : w === 6 ? "Week 6 · Final" : `Week ${w}`;

export function AccountabilityPreview() {
  const [cohort, setCohort] = useState<AccCohort | null>(null);
  const [clients, setClients] = useState<AccClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"demo" | "real">("demo");
  const [week, setWeek] = useState(3);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [realData, setRealData] = useState<PreviewData | null>(null);
  const [realLoading, setRealLoading] = useState(false);

  // Load cohort + clients once
  const load = useCallback(async () => {
    setLoading(true);
    const c = await getActiveCohort();
    setCohort(c);
    if (c) {
      const cs = await getCohortClients(c.id);
      setClients(cs);
      if (cs.length && !selectedClientId) {
        setSelectedClientId(cs[0].id);
      }
    }
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load real client data when selected
  const loadReal = useCallback(async () => {
    if (source !== "real" || !selectedClientId) return;
    setRealLoading(true);
    const data = await loadRealClientData(selectedClientId);
    setRealData(data);
    setRealLoading(false);
  }, [source, selectedClientId]);

  useEffect(() => {
    if (source === "real") loadReal();
  }, [loadReal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No accountability cohort found. Run accountability_schema.sql to seed
          one.
        </CardContent>
      </Card>
    );
  }

  const computedWeek = currentWeekOf(cohort.start_date, cohort.weeks);
  const previewData =
    source === "demo" ? getDemoData(week) : realData ? { ...realData } : null;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <Card className="bg-card border-border">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <Eye className="w-3 h-3" /> Preview mode
            </Badge>
            <span className="text-xs text-muted-foreground">
              Live cohort is{" "}
              {computedWeek === 0
                ? "pre-start"
                : computedWeek > cohort.weeks
                  ? "complete"
                  : `Week ${computedWeek}`}
            </span>
          </div>

          {/* Week selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Preview week
            </p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKS.map((w) => (
                <Button
                  key={w}
                  size="sm"
                  variant={week === w ? "default" : "outline"}
                  onClick={() => setWeek(w)}
                  className="h-8 px-3 text-xs"
                >
                  {weekLabel(w)}
                </Button>
              ))}
            </div>
          </div>

          {/* Data source toggle */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Data source
              </p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={source === "demo" ? "default" : "outline"}
                  onClick={() => setSource("demo")}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <UserCircle className="w-3.5 h-3.5" /> Demo client
                </Button>
                <Button
                  size="sm"
                  variant={source === "real" ? "default" : "outline"}
                  onClick={() => setSource("real")}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Real client
                </Button>
              </div>
            </div>

            {source === "real" && (
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Client
                </p>
                <Select
                  value={selectedClientId}
                  onValueChange={(v) => {
                    setSelectedClientId(v);
                    setRealData(null);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue
                      placeholder={
                        clients.length === 0
                          ? "No clients enrolled"
                          : "Select client"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.user_id.slice(0, 8)}… ·{" "}
                        {c.onboarding_done ? "Onboarded" : "Pending"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard render */}
      {source === "demo" && (
        <AccountabilityDashboard
          previewData={previewData ?? undefined}
          previewWeek={week}
          readOnly
        />
      )}

      {source === "real" && (
        <>
          {realLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : realData ? (
            <AccountabilityDashboard
              previewData={previewData ?? undefined}
              previewWeek={currentWeekOf(
                realData.cohort.start_date,
                realData.cohort.weeks,
              )}
              readOnly
            />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                {clients.length === 0
                  ? "No clients enrolled in this cohort yet. Switch to Demo client to see the full experience."
                  : "Select a client to preview their dashboard."}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default AccountabilityPreview;
