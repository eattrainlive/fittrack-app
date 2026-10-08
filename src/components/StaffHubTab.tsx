import { StaffHubMetrics } from "./StaffHubMetrics";
import { StaffHubCallLists } from "./StaffHubCallLists";
import { useStaffHubData } from "@/lib/useStaffHubData";

/**
 * Staff Hub tab: "This month" numbers + the three call lists.
 * Fetches the proxy payload ONCE and shares it across both sections.
 */
export function StaffHubTab() {
  const { data, loading, error, refreshing, reload } = useStaffHubData();

  return (
    <div className="space-y-8">
      <StaffHubMetrics
        data={data}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={reload}
      />
      <div>
        <h3 className="mb-3 font-heading text-lg tracking-wide">Call lists</h3>
        <StaffHubCallLists data={data} loading={loading} error={error} />
      </div>
    </div>
  );
}
