// Export a meal-plan OVERVIEW as a shareable PNG (no library — render an SVG we
// control, then rasterise it on a canvas). Delivered via the native share sheet
// where available (so it lands in Photos / WhatsApp in one tap), else downloaded.
// The image is the plan summary only — full recipes stay in the PDF.
import type { PlanItem } from "@/lib/mealPlans";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Side", "Snack", "Other"];

const BG = "#0F1115";
const CARD = "#171A1F";
const LIME = "#BFFF3C";
const WHITE = "#F5F7FA";
const MUTE = "#9CA3AF";

const esc = (s: any) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );

const trunc = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

const mul = (i: PlanItem) => i.servings || 1;
const itemMacros = (i: PlanItem) =>
  `${Math.round(i.calories * mul(i))} kcal · ${Math.round(
    i.protein * mul(i),
  )}P ${Math.round(i.carbs * mul(i))}C ${Math.round(i.fats * mul(i))}F`;

interface T {
  cal: number;
  p: number;
  c: number;
  f: number;
}
const sum = (items: PlanItem[]): T =>
  items.reduce(
    (t, i) => ({
      cal: t.cal + Math.round(i.calories * mul(i)),
      p: t.p + Math.round(i.protein * mul(i)),
      c: t.c + Math.round(i.carbs * mul(i)),
      f: t.f + Math.round(i.fats * mul(i)),
    }),
    { cal: 0, p: 0, c: 0, f: 0 },
  );

const W = 1000;
const PAD = 50;
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type Line =
  | { t: "mealHeader"; text: string }
  | { t: "item"; name: string; macros: string }
  | { t: "dayHeader"; text: string }
  | { t: "total"; text: string }
  | { t: "empty"; text: string }
  | { t: "spacer"; h: number };

const H: Record<string, number> = {
  mealHeader: 40,
  item: 40,
  dayHeader: 48,
  total: 56,
  empty: 36,
};

function mealLines(items: PlanItem[]): Line[] {
  const byMeal: Record<string, PlanItem[]> = {};
  items.forEach((i) => (byMeal[i.meal] ||= []).push(i));
  const meals = Object.keys(byMeal).sort(
    (a, b) => MEAL_ORDER.indexOf(a) - MEAL_ORDER.indexOf(b),
  );
  const out: Line[] = [];
  for (const m of meals) {
    out.push({ t: "mealHeader", text: m });
    for (const i of byMeal[m]) {
      const nm = mul(i) !== 1 ? `${i.name} ×${mul(i)}` : i.name;
      out.push({ t: "item", name: trunc(nm, 34), macros: itemMacros(i) });
    }
  }
  return out;
}

export async function exportMealPlanImage(opts: {
  title: string;
  scope: "day" | "week";
  items: PlanItem[];
  targetCalories?: number | null;
}): Promise<boolean> {
  const { title, scope, items, targetCalories } = opts;

  // Build the list of lines + measure height.
  const lines: Line[] = [];
  if (scope === "day") {
    if (!items.length) lines.push({ t: "empty", text: "No foods added." });
    else lines.push(...mealLines(items));
    const t = sum(items);
    lines.push({ t: "spacer", h: 10 });
    lines.push({
      t: "total",
      text: `Total: ${t.cal} kcal   ·   P ${t.p}g   ·   C ${t.c}g   ·   F ${t.f}g`,
    });
  } else {
    for (let d = 0; d < 7; d++) {
      const dayItems = items.filter((i) => i.dayIndex === d);
      lines.push({ t: "dayHeader", text: DAY_NAMES[d] });
      if (!dayItems.length) {
        lines.push({ t: "empty", text: "—" });
      } else {
        lines.push(...mealLines(dayItems));
        const t = sum(dayItems);
        lines.push({
          t: "total",
          text: `Day total: ${t.cal} kcal · P ${t.p}g · C ${t.c}g · F ${t.f}g`,
        });
      }
      lines.push({ t: "spacer", h: 16 });
    }
  }

  const headerH = 150;
  const bodyH = lines.reduce(
    (h, l) => h + (l.t === "spacer" ? l.h : H[l.t]),
    0,
  );
  const height = headerH + bodyH + PAD;

  // Emit SVG.
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" font-family="${FONT}">`,
  );
  parts.push(`<rect width="${W}" height="${height}" fill="${BG}"/>`);
  parts.push(`<rect width="${W}" height="10" fill="${LIME}"/>`);
  parts.push(
    `<text x="${PAD}" y="62" fill="${MUTE}" font-size="22" font-weight="700" letter-spacing="2">EAT TRAIN LIVE · MEAL PLAN</text>`,
  );
  parts.push(
    `<text x="${PAD}" y="112" fill="${WHITE}" font-size="40" font-weight="800">${esc(
      trunc(title, 40),
    )}</text>`,
  );
  if (targetCalories)
    parts.push(
      `<text x="${PAD}" y="140" fill="${MUTE}" font-size="22">Target: ${targetCalories} kcal/day</text>`,
    );

  let y = headerH;
  for (const l of lines) {
    if (l.t === "spacer") {
      y += l.h;
      continue;
    }
    if (l.t === "dayHeader") {
      parts.push(
        `<rect x="${PAD}" y="${y - 2}" width="${W - PAD * 2}" height="36" rx="8" fill="${CARD}"/>`,
      );
      parts.push(
        `<text x="${PAD + 14}" y="${y + 24}" fill="${LIME}" font-size="24" font-weight="800" letter-spacing="1">${esc(
          l.text.toUpperCase(),
        )}</text>`,
      );
      y += H.dayHeader;
    } else if (l.t === "mealHeader") {
      parts.push(
        `<text x="${PAD}" y="${y + 26}" fill="${MUTE}" font-size="20" font-weight="700" letter-spacing="1">${esc(
          l.text.toUpperCase(),
        )}</text>`,
      );
      y += H.mealHeader;
    } else if (l.t === "item") {
      parts.push(
        `<text x="${PAD + 8}" y="${y + 27}" fill="${WHITE}" font-size="24" font-weight="600">${esc(
          l.name,
        )}</text>`,
      );
      parts.push(
        `<text x="${W - PAD}" y="${y + 27}" fill="${MUTE}" font-size="19" text-anchor="end">${esc(
          l.macros,
        )}</text>`,
      );
      y += H.item;
    } else if (l.t === "empty") {
      parts.push(
        `<text x="${PAD + 8}" y="${y + 24}" fill="${MUTE}" font-size="20" font-style="italic">${esc(
          l.text,
        )}</text>`,
      );
      y += H.empty;
    } else if (l.t === "total") {
      parts.push(
        `<rect x="${PAD}" y="${y}" width="${W - PAD * 2}" height="44" rx="10" fill="${LIME}"/>`,
      );
      parts.push(
        `<text x="${PAD + 16}" y="${y + 30}" fill="${BG}" font-size="22" font-weight="800">${esc(
          l.text,
        )}</text>`,
      );
      y += H.total;
    }
  }
  parts.push("</svg>");
  const svg = parts.join("");

  // Rasterise on a canvas at 2× for a crisp image.
  const scale = 2;
  const pngBlob = await new Promise<Blob | null>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

  if (!pngBlob) return false;
  const filename = `ETL-meal-plan-${scope}.png`;
  const file = new File([pngBlob], filename, { type: "image/png" });

  // Native share sheet (iOS/Android) → "Save Image" / WhatsApp in one tap.
  const nav: any = navigator;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return true;
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  // Fallback: download the PNG.
  const dlUrl = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = dlUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(dlUrl), 2000);
  return true;
}
