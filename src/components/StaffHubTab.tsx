import { StaffHubCallLists } from "./StaffHubCallLists";
import { useStaffHubData } from "@/lib/useStaffHubData";

/**
 * Call Lists tab: the trialists / reach out / win back cadence.
 * The KPI metrics now live in the Insights tab; this renders the call lists only.
 */
export function StaffHubTab() {
  const { data, loading, error } = useStaffHubData();

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg tracking-wide">Call lists</h3>
      <StaffHubCallLists data={data} loading={loading} error={error} />
    </div>
  );
}
