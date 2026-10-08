# Builder brief — Staff Hub: merge Usage + KPIs into one "Insights" tab (+ Trends)

Consolidate the two number tabs. Today the admin has a **Usage** tab (`<UsageDashboard>`) and a
**This Month** tab (`<StaffHubTab>` = KPI metrics + the call lists). Reorganise into:

- **Insights** tab — a single tab with a top switcher: **This month · Trends · Usage**.
- **Call Lists** tab — the trialists / reach out / win back cadence (moved out of the old This Month
  tab, since the KPIs are now in Insights).

Net result: same two tabs, but grouped by purpose (numbers vs actions) and with the new Trends view.

## Data — already available, don't add fetches
`useStaffHubData()` (in `@/lib/useStaffHubData`) already returns the whole payload. The lib types now
include the yearly series (I added these):
```ts
import { useStaffHubData } from "@/lib/useStaffHubData";
import {
  formatMetricValue, formatRate, formatPounds, formatNumber,
  type StaffHubResponse, type MonthRow,
} from "@/lib/staffHubMetrics";
```
`data` has: `metrics` (this month, flat list), **`months`** (Jan..Dec rows), **`year`** (year-to-date
row), **`labels`** (metric key → plain-English heading). A `MonthRow` is
`{ month: "January".."December", tab?, started?, [metricKey]: number }`.

## 1. `Admin.tsx` wiring
- Replace the two `TabsTrigger`s `value="usage"` ("Usage") and `value="staffhub"` ("This Month") with:
  - `<TabsTrigger value="insights">Insights</TabsTrigger>`
  - `<TabsTrigger value="calllists">Call Lists</TabsTrigger>`
- Replace their two `TabsContent`s with:
  - `insights` → `<InsightsTab staffSecret={staffSecret} />`
  - `calllists` → `<StaffHubCallListsTab />` (the call lists only — see §4)

## 2. New `InsightsTab` (src/components/InsightsTab.tsx)
- Calls `useStaffHubData()` once and shares `data` to all three views.
- A segmented switch (same pill style as the call-list tabs): **This month · Trends · Usage**,
  default **This month**.
- Renders:
  - **This month** → the existing `<StaffHubMetrics data={data} loading={loading} error={error}
    refreshing={refreshing} onRefresh={reload} />` (the KPI number cards — unchanged).
  - **Trends** → `<TrendsView data={data} />` (see §3).
  - **Usage** → the existing `<UsageDashboard staffSecret={staffSecret} />` (unchanged; it keeps its
    own week/range controls).

## 3. New `TrendsView` (src/components/TrendsView.tsx) — the new bit
Charts the monthly series. Phone-first, uses **recharts** (already in the app).
- **Year so far** strip at the top: a few headline cards from the `year` row — Sign ups
  (`joins_total`), Cancellations (`cancels_total`), Net (`net_members`), Revenue (`members_value` or
  `net_value` — whichever is present). Label each from `labels[key]`. Format: rates (`conv_*`,
  `attrition`) as % via `formatRate`; `*_value` as £ via `formatPounds`; `net_members` signed; else
  `formatNumber`. (There's a `formatMetricValue(key, value)` helper that already picks the right one.)
- **Metric picker:** a dropdown (or pill row) of the numeric metric keys found in the month rows
  (exclude `month`, `tab`, `started`), each shown with its `labels[key]` heading. Default to
  `joins_total` if present.
- **Main chart:** a recharts bar (or line) of the selected metric across the months. Only include
  months where `started` is true (so empty future months don't show), in Jan→Dec order. X axis =
  short month name; Y = the value; tooltip shows the formatted value (use `formatMetricValue`). Bars
  in brand lime (`#a3e635`); near-black text; no heavy gridlines. Title = the metric's label.
- Don't hard-code the metric keys beyond the sensible defaults above — read whatever keys arrive so
  new KPIs added to the sheet appear automatically.
- If `months` is empty/absent, show a muted "No monthly data yet" state (the cached payload may be
  metrics-only on first load).

(Year-over-year isn't available yet — the sheet holds one year + a year-to-date row — so don't build
a YoY compare; "Year so far" + the monthly trend is the scope.)

## 4. Trim `StaffHubTab` → call-lists-only
The old `StaffHubTab` rendered `<StaffHubMetrics>` + the call lists. The metrics now live in Insights,
so make the Call Lists tab render **only** the call lists. Easiest: a small `StaffHubCallListsTab`
that calls `useStaffHubData()` and renders just `<StaffHubCallLists data={data} loading={loading}
error={error} />` under a "Call lists" heading. (Both tabs calling `useStaffHubData()` is fine — it's
cached; the proxy isn't hit twice in quick succession.)

## Rules
- No new data fetching or Supabase calls — `useStaffHubData()` for the proxy payload; UsageDashboard
  keeps its own source.
- No maths on the KPI numbers — display as given; only the chart plotting + the existing format
  helpers. Rates as %, `_value` as £.
- Phone-first: charts responsive (`ResponsiveContainer`), switch pills wrap, no horizontal scroll.
- Keep everything behind the existing staff gate (it already is, via the Admin page).

## Acceptance
- One **Insights** tab with This month / Trends / Usage; This month and Usage render exactly as
  before.
- Trends shows a "Year so far" strip + a metric picker + a monthly bar chart that updates per metric,
  reading keys/labels from the payload (no hard-coded metric list).
- Rates show as %, revenue as £, net shows its sign.
- Call lists live in their own **Call Lists** tab and still work (log outcomes, cadence, routes).

---

## Appendix — apply these edits to `src/lib/staffHubMetrics.ts` first
The Trends view needs the yearly series in the types + cache. Add them so the build compiles.

**a. Add the `MonthRow` interface (just above `StaffHubResponse`):**
```ts
export interface MonthRow {
  month: string;              // "January".."December" or "YEAR"
  tab?: string;
  started?: boolean;
  [key: string]: number | string | boolean | undefined;
}
```

**b. Add these three fields inside `StaffHubResponse` (alongside `metrics`):**
```ts
  months?: MonthRow[];
  year?: MonthRow | null;
  labels?: Record<string, string>;
```

**c. In `setCachedMetrics`, include them in the cached `safe` object (they're non-personal):**
```ts
      months: res.months,
      year: res.year,
      labels: res.labels,
```
(Keep the PII lists OUT of the cache, exactly as now — only add months/year/labels.)
