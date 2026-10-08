import { useCallback, useEffect, useState } from "react";
import {
  fetchStaffHubMetrics,
  getCachedMetrics,
  type StaffHubResponse,
} from "./staffHubMetrics";

/**
 * Shared Staff Hub data fetcher. Both the "This month" numbers and the
 * call lists use this so the proxy is hit once per mount, not per list.
 */
export function useStaffHubData() {
  const [data, setData] = useState<StaffHubResponse | null>(() =>
    getCachedMetrics(),
  );
  const [loading, setLoading] = useState(!getCachedMetrics());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchStaffHubMetrics();
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't refresh");
      const cached = getCachedMetrics();
      if (cached) setData(cached);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  return { data, loading, error, refreshing, reload: () => load() };
}
