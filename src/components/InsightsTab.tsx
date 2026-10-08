import { useState } from "react";
import { StaffHubMetrics } from "./StaffHubMetrics";
import { TrendsView } from "./TrendsView";
import UsageDashboard from "./UsageDashboard";
import { useStaffHubData } from "@/lib/useStaffHubData";

type View = "thismonth" | "trends" | "usage";

const VIEWS: { key: View; label: string }[] = [
  { key: "thismonth", label: "This month" },
  { key: "trends", label: "Trends" },
  { key: "usage", label: "Usage" },
];

export function InsightsTab({ staffSecret }: { staffSecret: string }) {
  const { data, loading, error, refreshing, reload } = useStaffHubData();
  const [view, setView] = useState<View>("thismonth");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              view === v.key
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "thismonth" && (
        <StaffHubMetrics
          data={data}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onRefresh={reload}
        />
      )}
      {view === "trends" && <TrendsView data={data} />}
      {view === "usage" && <UsageDashboard staffSecret={staffSecret} />}
    </div>
  );
}
