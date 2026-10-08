import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchStaffHubMetrics,
  getCachedMetrics,
  formatMetricValue,
  formatGenerated,
  formatNumber,
  type StaffHubResponse,
  type StaffMetric,
} from "@/lib/staffHubMetrics";

/**
 * ETL Staff Hub — Screen 1 "This month".
 * Phone-first KPI dashboard reading live metrics from the Netlify proxy.
 * Metrics only (no PII); grouped from the payload, never hard-coded.
 */
export function StaffHubMetrics({
  data: sharedData,
  loading: sharedLoading,
  error: sharedError,
  refreshing: sharedRefreshing,
  onRefresh,
}: {
  data?: StaffHubResponse | null;
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const [localData, setLocalData] = useState<StaffHubResponse | null>(() =>
    getCachedMetrics(),
  );
  const [localLoading, setLocalLoading] = useState(!getCachedMetrics());
  const [localError, setLocalError] = useState<string | null>(null);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLocalRefreshing(true);
    else setLocalLoading(true);
    try {
      const res = await fetchStaffHubMetrics();
      setLocalData(res);
      setLocalError(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Couldn't refresh");
      const cached = getCachedMetrics();
      if (cached) setLocalData(cached);
    } finally {
      setLocalRefreshing(false);
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sharedData !== undefined) return; // shared fetch owns it
    load(true);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, sharedData]);

  const data = sharedData !== undefined ? sharedData : localData;
  const loading = sharedLoading !== undefined ? sharedLoading : localLoading;
  const error = sharedError !== undefined ? sharedError : localError;
  const refreshing =
    sharedRefreshing !== undefined ? sharedRefreshing : localRefreshing;
  const reload = onRefresh ?? (() => load());

  // Index metrics by key for quick lookup
  const byKey = useMemo(() => {
    const map: Record<string, StaffMetric> = {};
    for (const m of data?.metrics ?? []) map[m.key] = m;
    return map;
  }, [data]);

  // Group remaining metrics (excluding the headline/known ones we render explicitly)
  const knownKeys = useMemo(
    () =>
      new Set([
        "joins_total",
        "cancels_total",
        "net_members",
        "last_joins",
        "last_cancels",
        "last_net",
        "conv_total",
        "conv_decided",
        "conv_running",
        "trials_total",
        "last_trials",
        "members_total",
        // members_* and *_value are rendered in the base section
      ]),
    [],
  );

  const baseMetrics = useMemo(
    () =>
      (data?.metrics ?? []).filter(
        (m) =>
          m.key.startsWith("members_") ||
          m.key.endsWith("_value") ||
          m.key === "members_total",
      ),
    [data],
  );

  const otherGroups = useMemo(() => {
    const remaining = (data?.metrics ?? []).filter(
      (m) => !knownKeys.has(m.key) && !baseMetrics.includes(m),
    );
    const groups: Record<string, StaffMetric[]> = {};
    for (const m of remaining) {
      (groups[m.group] ||= []).push(m);
    }
    return groups;
  }, [data, knownKeys, baseMetrics]);

  const monthName = data?.month_name ?? "This month";
  const generated = data?.generated ? formatGenerated(data.generated) : "";

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data || !data.metrics?.length) {
    return (
      <div className="space-y-4">
        <Header
          monthName={monthName}
          generated={generated}
          error={error}
          onRefresh={reload}
          refreshing={refreshing}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No figures yet
          </CardContent>
        </Card>
      </div>
    );
  }

  const joins = byKey["joins_total"];
  const cancels = byKey["cancels_total"];
  const net = byKey["net_members"];
  const lastJoins = byKey["last_joins"];
  const lastCancels = byKey["last_cancels"];
  const lastNet = byKey["last_net"];
  const convTotal = byKey["conv_total"];
  const convDecided = byKey["conv_decided"];
  const convRunning = byKey["conv_running"];
  const trials = byKey["trials_total"];
  const lastTrials = byKey["last_trials"];
  const membersTotal = byKey["members_total"];

  return (
    <div className="space-y-5">
      <Header
        monthName={monthName}
        generated={generated}
        error={error}
        onRefresh={reload}
        refreshing={refreshing}
      />

      {/* 1. Headline row — the three that matter */}
      <div className="grid grid-cols-3 gap-2">
        <HeadlineCard
          label="Sign ups"
          value={joins ? formatNumber(joins.value) : "0"}
          compare={lastJoins}
          goodWhenUp
        />
        <HeadlineCard
          label="Cancellations"
          value={cancels ? formatNumber(cancels.value) : "0"}
          compare={lastCancels}
          goodWhenUp={false}
        />
        <HeadlineCard
          label="Net change"
          value={net ? (net.value > 0 ? `+${net.value}` : `${net.value}`) : "0"}
          compare={lastNet}
          goodWhenUp
        />
      </div>

      {/* 3. Conversion with context */}
      {convTotal && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold tabular-nums">
                {formatMetricValue(convTotal.key, convTotal.value)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                Conversion
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {convDecided ? `${convDecided.value} decided` : "0 decided"}
              {convRunning ? `, ${convRunning.value} still running` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 4. Trials started */}
      {trials && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Trials started
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {formatNumber(trials.value)}
              </p>
            </div>
            {lastTrials && (
              <CompareChip
                current={trials.value}
                last={lastTrials.value}
                goodWhenUp
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. The base — members total + breakdown */}
      {membersTotal && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total members
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {formatNumber(membersTotal.value)}
              </p>
            </div>
            {baseMetrics.filter((m) => m.key !== "members_total").length >
              0 && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                {baseMetrics
                  .filter((m) => m.key !== "members_total")
                  .map((m) => (
                    <div key={m.key} className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground">
                        {m.label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatMetricValue(m.key, m.value)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Any other groups that arrive — never drop unknown keys */}
      {Object.entries(otherGroups).map(([group, items]) => (
        <Card key={group}>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((m) => (
                <div key={m.key} className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMetricValue(m.key, m.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Header({
  monthName,
  generated,
  error,
  onRefresh,
  refreshing,
}: {
  monthName: string;
  generated: string;
  error: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-heading text-2xl tracking-wide">{monthName}</h2>
        {generated && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {error ? (
              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Last updated {generated} — couldn't refresh
              </span>
            ) : (
              <>Last updated {generated}</>
            )}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0"
        aria-label="Refresh"
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function HeadlineCard({
  label,
  value,
  compare,
  goodWhenUp,
}: {
  label: string;
  value: string;
  compare?: StaffMetric;
  goodWhenUp: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground leading-tight">
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums leading-none">
          {value}
        </span>
        {compare && (
          <CompareChip
            current={Number(value.replace(/[^\d-]/g, "")) || 0}
            last={compare.value}
            goodWhenUp={goodWhenUp}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CompareChip({
  current,
  last,
  goodWhenUp,
}: {
  current: number;
  last: number;
  goodWhenUp: boolean;
}) {
  if (last === 0 && current === 0) {
    return (
      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" /> 0 last month
      </span>
    );
  }

  const diff = current - last;
  const up = diff > 0;
  const down = diff < 0;
  const isGood = goodWhenUp ? up : down;
  const isBad = goodWhenUp ? down : up;

  const color = isGood
    ? "text-emerald-600 dark:text-emerald-500"
    : isBad
      ? "text-red-600 dark:text-red-500"
      : "text-muted-foreground";

  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <span
      className={`text-[11px] font-medium flex items-center gap-0.5 ${color}`}
    >
      <Icon className="h-3 w-3" />
      {up ? "up" : down ? "down" : "same"} from {last} last month
    </span>
  );
}
