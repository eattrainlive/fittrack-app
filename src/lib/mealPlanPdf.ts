// Build a clean, printable meal-plan page and open the browser's print dialog
// (which offers "Save as PDF" / "Save to Files" on iOS & desktop). No PDF
// library needed — keeps the bundle small and works in the PWA.
import type { PlanItem } from "@/lib/mealPlans";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Side", "Snack", "Other"];

const esc = (s: any) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );

interface Totals {
  cal: number;
  p: number;
  c: number;
  f: number;
}
const sum = (items: PlanItem[]): Totals =>
  items.reduce(
    (t, i) => ({
      cal: t.cal + Math.round(i.calories * (i.servings || 1)),
      p: t.p + Math.round(i.protein * (i.servings || 1)),
      c: t.c + Math.round(i.carbs * (i.servings || 1)),
      f: t.f + Math.round(i.fats * (i.servings || 1)),
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

const itemsTable = (items: PlanItem[]) => {
  if (!items.length)
    return `<p class="empty">Nothing added.</p>`;
  const byMeal: Record<string, PlanItem[]> = {};
  items.forEach((i) => {
    (byMeal[i.meal] ||= []).push(i);
  });
  const meals = Object.keys(byMeal).sort(
    (a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b),
  );
  return meals
    .map((m) => {
      const rows = byMeal[m]
        .map((i) => {
          const mult = i.servings || 1;
          const label =
            mult !== 1 ? `${esc(i.name)} ×${mult}` : esc(i.name);
          return `<tr><td>${label}</td>
            <td class="n">${Math.round(i.calories * mult)}</td>
            <td class="n">${Math.round(i.protein * mult)}g</td>
            <td class="n">${Math.round(i.carbs * mult)}g</td>
            <td class="n">${Math.round(i.fats * mult)}g</td></tr>`;
        })
        .join("");
      return `<div class="meal"><h4>${esc(m)}</h4>
        <table><thead><tr><th>Item</th><th class="n">kcal</th><th class="n">P</th><th class="n">C</th><th class="n">F</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
    })
    .join("");
};

const totalsBar = (t: Totals, label = "Total") =>
  `<div class="totals"><strong>${esc(label)}:</strong> ${t.cal} kcal
   &nbsp;·&nbsp; P ${t.p}g &nbsp;·&nbsp; C ${t.c}g &nbsp;·&nbsp; F ${t.f}g</div>`;

export function exportMealPlanPdf(opts: {
  title: string;
  scope: "day" | "week";
  items: PlanItem[];
  targetCalories?: number | null;
}) {
  const { title, scope, items, targetCalories } = opts;

  let body = "";
  if (scope === "day") {
    body = `<section>${itemsTable(items)}${totalsBar(sum(items))}</section>`;
  } else {
    body = [0, 1, 2, 3, 4, 5, 6]
      .map((d) => {
        const dayItems = items.filter((i) => i.dayIndex === d);
        return `<section class="day">
          <h3>${DAY_NAMES[d]}</h3>
          ${itemsTable(dayItems)}
          ${totalsBar(sum(dayItems), "Day total")}
        </section>`;
      })
      .join("");
    const weekAvg = sum(items);
    body += `<section class="weektot">${totalsBar(
      {
        cal: Math.round(weekAvg.cal / 7),
        p: Math.round(weekAvg.p / 7),
        c: Math.round(weekAvg.c / 7),
        f: Math.round(weekAvg.f / 7),
      },
      "Daily average",
    )}</section>`;
  }

  const target =
    targetCalories && scope === "day"
      ? `<p class="target">Target: ${targetCalories} kcal/day</p>`
      : targetCalories
        ? `<p class="target">Target: ${targetCalories} kcal/day</p>`
        : "";

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
         color: #14170f; margin: 32px; }
  header { border-bottom: 3px solid #BFFF3C; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: .5px; }
  .brand { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  .target { color: #6b7280; font-size: 12px; margin: 4px 0 0; }
  h3 { margin: 18px 0 6px; font-size: 15px; background: #f3f4f6; padding: 5px 8px; border-radius: 6px; }
  h4 { margin: 10px 0 4px; font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: .5px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #eee; }
  th.n, td.n { text-align: right; white-space: nowrap; }
  th { font-size: 10px; text-transform: uppercase; color: #9ca3af; }
  .totals { margin: 8px 0 4px; font-size: 13px; background: #14170f; color: #fff; padding: 7px 10px; border-radius: 8px; }
  .totals strong { color: #BFFF3C; }
  .empty { color: #9ca3af; font-size: 12px; font-style: italic; }
  .day { page-break-inside: avoid; }
  footer { margin-top: 24px; color: #9ca3af; font-size: 10px; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { margin: 14mm; } }
</style></head>
<body>
  <header>
    <div class="brand">Eat Train Live · Meal Plan</div>
    <h1>${esc(title)}</h1>
    ${target}
  </header>
  ${body}
  <footer>Generated ${new Date().toLocaleDateString("en-GB")} · FitTrack</footer>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
  }
  // Popup blocked (common in iOS standalone PWA) — fall back to a Blob link in
  // the same tab so the user can still view/save it.
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.location.href = url;
  return false;
}
