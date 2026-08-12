import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Check, Flame, Loader2, Utensils, ChevronLeft, ChevronRight, Zap, Search, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getRecipes,
  getDiary,
  addDiaryItem,
  removeDiaryItem,
  searchFoods,
} from "@/lib/store";

interface Recipe {
  id: string;
  name: string;
  meal: string;
  band: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre?: number;
  serves?: string;
  time?: string;
  ingredients: string;
  method: string;
  image_url: string;
  sort_order: number;
}

const MEAL_TYPES = [
  { key: "Breakfast", label: "Breakfast", icon: "🌅" },
  { key: "Lunch", label: "Lunch", icon: "☀️" },
  { key: "Dinner", label: "Dinner", icon: "🌙" },
  { key: "Side", label: "Sides", icon: "🥗" },
  { key: "Snack", label: "Snacks", icon: "🍪" },
  { key: "Dessert", label: "Dessert", icon: "🍰" },
];

const DIARY_MEALS = ["Breakfast", "Lunch", "Dinner", "Side", "Snack", "Other"];

function startOfWeekMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RecipeCards({ targetCalories }: { targetCalories: number | null }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState<string>("Breakfast");
  const [selected, setSelected] = useState<Recipe | null>(null);

  // Diary state
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [diary, setDiary] = useState<any[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [fitsMyDay, setFitsMyDay] = useState(false);
  const [openBands, setOpenBands] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(20);

  const loadRecipes = useCallback(async () => {
    const all = await getRecipes();
    setRecipes(all);
  }, []);

  const loadDiary = useCallback(async (date: string) => {
    setDiaryLoading(true);
    const items = await getDiary(date);
    setDiary(items);
    setDiaryLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadRecipes();
      setLoading(false);
    })();
  }, [loadRecipes]);

  useEffect(() => {
    loadDiary(selectedDate);
  }, [selectedDate, loadDiary]);

  // Reset pagination + open bands when filters or meal tab change
  useEffect(() => { setLimit(20); setOpenBands(new Set()); }, [searchQuery, activeChips, fitsMyDay, activeMeal]);

  // Lunch and Dinner share the "Main" recipe set; Breakfast and Snack map 1:1
  const mealQuery = (tab: string) => (tab === "Lunch" || tab === "Dinner" ? "Main" : tab);

  const mealRecipes = recipes.filter((r) => r.meal === mealQuery(activeMeal));

  const handleAddRecipe = async (recipe: Recipe) => {
    await addDiaryItem({
      date: selectedDate,
      meal: activeMeal, // use the tab name (Lunch/Dinner), not the recipe's stored "Main"
      source: "recipe",
      recipe_id: recipe.id,
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fats: recipe.fats,
    });
    await loadDiary(selectedDate);
    toast.success(`${recipe.name} added to your day`);
  };

  const handleRemoveDiaryItem = async (id: string) => {
    await removeDiaryItem(id);
    await loadDiary(selectedDate);
  };

  // Diary totals for selected date
  const dayTotals = diary.reduce(
    (acc, r) => ({
      calories: acc.calories + (r.calories || 0),
      protein: acc.protein + (r.protein || 0),
      carbs: acc.carbs + (r.carbs || 0),
      fat: acc.fat + (r.fats || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calPct = targetCalories ? Math.min(100, Math.round((dayTotals.calories / targetCalories) * 100)) : 0;

  // Check if a recipe is already in the diary for this date
  const isInDiary = (recipeId: string) => diary.some((i) => i.recipe_id === recipeId);

  // ── Filter logic (client-side over loaded recipes) ────────────────
  const chipTests: Record<string, (r: Recipe) => boolean> = {
    'High protein': (r) => r.protein >= 30,
    'Quick (≤15 min)': (r) => (parseInt((r.time || '').match(/\d+/)?.[0] ?? '999')) <= 15,
    'Chicken': (r) => /chicken/i.test(r.name + r.ingredients),
    'Beef': (r) => /beef|mince/i.test(r.name + r.ingredients),
    'Seafood': (r) => /prawn|shrimp|tuna|fish|salmon/i.test(r.name + r.ingredients),
    'Veggie': (r) => !/chicken|beef|mince|prawn|tuna|fish|turkey|bacon|ham|salmon/i.test(r.name + r.ingredients),
    'Sweet': (r) => r.meal === 'Dessert' || /biscoff|chocolate|cheesecake|donut|cake|cookie/i.test(r.name),
  };

  const q = searchQuery.trim().toLowerCase();
  const anyFilterActive = !!q || activeChips.length > 0 || fitsMyDay;
  const remaining = (targetCalories ?? 0) - dayTotals.calories;

  const filteredRecipes = mealRecipes.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q) && !(r.ingredients || '').toLowerCase().includes(q)) return false;
    if (activeChips.length && !activeChips.every(c => chipTests[c]?.(r))) return false;
    if (fitsMyDay && (!targetCalories || r.calories > Math.max(remaining, 0))) return false;
    return true;
  });

  const filteredBands = Array.from(new Set(filteredRecipes.map(r => r.band))).sort((a: any, b: any) => parseInt(a) - parseInt(b));
  const openBandRecipes = filteredBands
    .filter(b => openBands.has(b) || anyFilterActive)
    .flatMap(b => filteredRecipes.filter(r => r.band === b));
  const hasMore = openBandRecipes.length > limit;

  const toggleBand = (band: string) => {
    setOpenBands(prev => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  const clearAll = () => { setSearchQuery(""); setActiveChips([]); setFitsMyDay(false); };

  // Week strip days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = fmtDate(new Date());

  // Per-day calorie totals for the week strip
  const [weekTotals, setWeekTotals] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const totals: Record<string, number> = {};
      for (const d of weekDays) {
        const ds = fmtDate(d);
        const items = await getDiary(ds);
        totals[ds] = items.reduce((s, i) => s + (i.calories || 0), 0);
      }
      setWeekTotals(totals);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, diary]);

  // Diary grouped by meal
  const diaryByMeal = DIARY_MEALS.map((m) => ({
    meal: m,
    items: diary.filter((i) => (i.meal || "Other") === m),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-48">
      {/* ── Week strip ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}
            className="p-1.5 rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} —{" "}
            {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
          <button
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}
            className="p-1.5 rounded-lg hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1.5">
          {weekDays.map((d, i) => {
            const ds = fmtDate(d);
            const isSelected = ds === selectedDate;
            const isToday = ds === todayStr;
            const dayTotal = weekTotals[ds] || 0;
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : isToday
                    ? "border-primary/40 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className="text-sm font-bold">{d.getDate()}</span>
                {dayTotal > 0 && (
                  <span className={`text-[9px] ${isSelected ? "text-primary-foreground/70" : "text-primary"}`}>
                    {dayTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Day diary (selected date) ──────────────────────────────────── */}
      <div className="space-y-3">
        {diaryLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : diary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items logged for this day yet. Add recipes below or quick-add.
          </p>
        ) : (
          diaryByMeal.map((group) => (
            <div key={group.meal} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.meal}</p>
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-lg p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.calories} kcal · P{item.protein} C{item.carbs} F{item.fats}
                      {item.source === "custom" && <span className="ml-1 opacity-60">(custom)</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveDiaryItem(item.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* ── Day total vs target ────────────────────────────────────────── */}
      <div className="bg-[#14170f] text-white rounded-2xl p-3.5 space-y-2">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">
              {selectedDate === todayStr ? "Today" : new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })} · {diary.length} items
            </p>
            <p className="font-heading text-2xl text-primary leading-none">
              {dayTotals.calories}{targetCalories ? ` / ${targetCalories}` : ""} <span className="text-xs text-neutral-400">kcal</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 h-8 gap-1"
            onClick={() => setShowQuickAdd(true)}
          >
            <Zap className="h-3.5 w-3.5" /> Quick Add
          </Button>
        </div>
        {targetCalories && (
          <>
            <div className="h-1.5 rounded-full bg-neutral-700 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${calPct}%` }} />
            </div>
            <p className="text-xs text-neutral-300">
              P {dayTotals.protein}g · C {dayTotals.carbs}g · F {dayTotals.fat}g
              {targetCalories - dayTotals.calories > 0 ? ` · ${targetCalories - dayTotals.calories} to go` : dayTotals.calories > targetCalories ? ` · ${dayTotals.calories - targetCalories} over` : ""}
            </p>
          </>
        )}
        {!targetCalories && (
          <p className="text-xs text-neutral-300">P {dayTotals.protein}g · C {dayTotals.carbs}g · F {dayTotals.fat}g</p>
        )}
      </div>

      {/* ── Meal type selector ────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEAL_TYPES.map((m) => {
          const count = recipes.filter((r) => r.meal === mealQuery(m.key)).length;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMeal(m.key)}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-lg border transition-all shrink-0 ${
                activeMeal === m.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <span>{m.icon}</span> {m.label}
              {count > 0 && (
                <span className={`text-[10px] ${activeMeal === m.key ? "text-primary-foreground/70" : "text-muted-foreground/50"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sticky filter bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-1 py-2 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes…"
            className="pl-9 pr-9 h-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {Object.keys(chipTests).map(chip => {
            const active = activeChips.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => setActiveChips(prev => active ? prev.filter(c => c !== chip) : [...prev, chip])}
                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-all shrink-0 ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Fits my day + count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={fitsMyDay}
              onCheckedChange={setFitsMyDay}
              disabled={!targetCalories}
            />
            <span className="text-xs font-bold text-muted-foreground">
              Fits my day{fitsMyDay && targetCalories ? ` · ${Math.max(remaining, 0)} kcal left` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Showing {filteredRecipes.length} of {mealRecipes.length}</span>
            {anyFilterActive && (
              <button onClick={clearAll} className="text-[11px] font-bold text-primary">Clear all</button>
            )}
          </div>
        </div>
        {!targetCalories && (
          <p className="text-[10px] text-muted-foreground">Set a calorie target to use "Fits my day"</p>
        )}
      </div>

      {/* ── Recipe cards by calorie band (accordions) ──────────────────── */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">No recipes match — try clearing a filter.</p>
          {anyFilterActive && <Button variant="outline" size="sm" onClick={clearAll}>Clear all</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBands.map((band) => {
            const bandItems = filteredRecipes.filter(r => r.band === band);
            const isOpen = openBands.has(band) || anyFilterActive;
            const visibleInBand = openBandRecipes.slice(0, limit).filter(r => r.band === band);
            return (
              <div key={band} className="rounded-xl border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-card"
                  onClick={() => toggleBand(band)}
                >
                  <span className="text-sm font-bold uppercase tracking-wider">{band} kcal</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {bandItems.length} recipes <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isOpen && visibleInBand.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 p-3 pt-2">
                    {visibleInBand.map((r) => {
                      const added = isInDiary(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className="flex flex-col text-left rounded-xl border border-border overflow-hidden bg-card active:scale-[0.98] transition text-left"
                        >
                          <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                            {r.image_url ? (
                              <img
                                src={r.image_url}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils className="h-8 w-8 text-muted-foreground/20" />
                              </div>
                            )}
                            {added && (
                              <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 space-y-1">
                            <p className="font-bold text-xs leading-tight line-clamp-2">{r.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-semibold">{r.calories} kcal</span>
                              <span>·</span>
                              <span>{r.protein}g protein</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setLimit(l => l + 20)}
              className="w-full text-center text-sm font-bold text-primary py-3 border border-border rounded-xl"
            >
              Load more ({openBandRecipes.length - limit} remaining)
            </button>
          )}
        </div>
      )}

      {/* ── Full recipe modal ──────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="w-[92vw] max-w-sm max-h-[85vh] overflow-hidden bg-card border-border p-0 flex flex-col">
          {selected && (
            <>
              <div className="aspect-[16/10] w-full bg-muted overflow-hidden relative shrink-0">
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Utensils className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <DialogHeader className="absolute bottom-0 left-0 right-0 p-4">
                  <DialogTitle className="text-white text-xl font-heading uppercase tracking-wider leading-none">
                    {selected.name}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="overflow-y-auto p-4 space-y-4 flex-1">
                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-heading text-foreground">{selected.calories}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">kcal</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-heading text-primary">{selected.protein}g</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Protein</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-heading text-amber-500">{selected.carbs}g</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Carbs</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-lg font-heading text-orange-400">{selected.fats}g</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Fat</p>
                  </div>
                </div>

                {(selected.serves || selected.time) && (
                  <p className="text-xs text-muted-foreground">
                    {selected.serves && `Serves ${selected.serves}`}
                    {selected.serves && selected.time && " · "}
                    {selected.time}
                  </p>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ingredients</h4>
                  <ul className="space-y-1">
                    {String(selected.ingredients || "")
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s && !/^(macros?|calories?|serves?|total\s*time|protein|carbs?|fat|fibre|fiber)\s*[:\-]/i.test(s))
                      .map((ing, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {ing}
                        </li>
                      ))}
                  </ul>
                </div>

                {selected.method && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</h4>
                    <ol className="space-y-2 pl-0 list-none">
                      {String(selected.method)
                        .split("\n")
                        .map(s => s.trim())
                        .filter(Boolean)
                        .map((step, i) => {
                          const text = step.replace(/^\d+\.\s*/, "");
                          return (
                            <li key={i} className="flex gap-2 text-sm leading-relaxed">
                              <span className="shrink-0 font-medium text-muted-foreground w-5">{i + 1}.</span>
                              <span>{text}</span>
                            </li>
                          );
                        })}
                    </ol>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border p-3 bg-background">
                <Button
                  className="w-full h-11 font-bold"
                  onClick={() => { handleAddRecipe(selected); setSelected(null); }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add to {selectedDate === todayStr ? "Today" : new Date(selectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Quick Add dialog ───────────────────────────────────────────── */}
      <QuickAddDialog
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        selectedDate={selectedDate}
        defaultMeal={activeMeal}
        onSaved={() => { loadDiary(selectedDate); }}
      />
    </div>
  );
}

// ── Quick Add custom food item (with Open Food Facts search) ────────────────

interface FoodResult {
  name: string;
  per100: { cal: number; protein: number; carbs: number; fats: number };
  serving: string | null;
  image: string | null;
}

function QuickAddDialog({ open, onClose, selectedDate, defaultMeal, onSaved }: {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  defaultMeal: string;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState(defaultMeal);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual entry state
  const [mName, setMName] = useState("");
  const [mCalories, setMCalories] = useState("");
  const [mProtein, setMProtein] = useState("");
  const [mCarbs, setMCarbs] = useState("");
  const [mFats, setMFats] = useState("");

  useEffect(() => {
    if (open) {
      setMode('search');
      setQuery(""); setResults([]); setPicked(null); setGrams("100");
      setMeal(defaultMeal);
      setMName(""); setMCalories(""); setMProtein(""); setMCarbs(""); setMFats("");
    }
  }, [open, defaultMeal]);

  // Debounced search
  useEffect(() => {
    if (mode !== 'search' || !query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchFoods(query);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, mode]);

  const handleSaveSearch = async () => {
    if (!picked) return;
    setSaving(true);
    const factor = (parseInt(grams) || 100) / 100;
    await addDiaryItem({
      date: selectedDate,
      meal,
      source: "custom",
      name: picked.name,
      calories: Math.round(picked.per100.cal * factor),
      protein: Math.round(picked.per100.protein * factor),
      carbs: Math.round(picked.per100.carbs * factor),
      fats: Math.round(picked.per100.fats * factor),
    });
    setSaving(false);
    toast.success("Added to your day");
    onSaved();
    onClose();
  };

  const handleSaveManual = async () => {
    if (!mName.trim() || !mCalories) {
      toast.error("Name and calories are required");
      return;
    }
    setSaving(true);
    await addDiaryItem({
      date: selectedDate,
      meal,
      source: "custom",
      name: mName.trim(),
      calories: parseInt(mCalories) || 0,
      protein: parseInt(mProtein) || 0,
      carbs: parseInt(mCarbs) || 0,
      fats: parseInt(mFats) || 0,
    });
    setSaving(false);
    toast.success("Added to your day");
    onSaved();
    onClose();
  };

  if (!open) return null;

  const dayLabel = selectedDate === fmtDate(new Date()) ? "Today" : new Date(selectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[92vw] max-w-sm bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider">Quick Add</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 text-xs font-bold py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === 'search' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            <Search className="h-3.5 w-3.5" /> Search Foods
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 text-xs font-bold py-2 rounded-md transition-all ${mode === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Manual Entry
          </button>
        </div>

        {/* Meal picker (shared) */}
        <div className="space-y-1.5">
          <Label className="text-xs">Meal</Label>
          <Select value={meal} onValueChange={setMeal}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DIARY_MEALS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === 'search' && (
          <div className="space-y-3">
            {!picked ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Search for a food</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Hovis wholemeal"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                {searching && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!searching && query.trim().length >= 2 && results.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No results found. Try a different term or use manual entry.
                  </p>
                )}

                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setPicked(r)}
                      className="w-full flex items-center gap-3 border border-border rounded-lg p-2.5 text-left hover:border-primary/40 transition-colors active:scale-[0.99]"
                    >
                      {r.image ? (
                        <img src={r.image} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Utensils className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.per100.cal} kcal / 100g
                          {r.serving ? ` · serving: ${r.serving}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {results.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Food data from{" "}
                    <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
                      Open Food Facts
                    </a>
                  </p>
                )}
              </>
            ) : (
              /* Portion step */
              <div className="space-y-4">
                <button
                  onClick={() => setPicked(null)}
                  className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to results
                </button>

                <div className="flex items-center gap-3 border border-border rounded-lg p-3">
                  {picked.image ? (
                    <img src={picked.image} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Utensils className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{picked.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {picked.per100.cal} kcal · P{picked.per100.protein} C{picked.per100.carbs} F{picked.per100.fats} per 100g
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Portion (grams)</Label>
                  <Input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    placeholder="100"
                    autoFocus
                  />
                  {picked.serving && (
                    <p className="text-[10px] text-muted-foreground">Serving size: {picked.serving}</p>
                  )}
                </div>

                {/* Computed macros preview */}
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const f = (parseInt(grams) || 100) / 100;
                    return (
                      <>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-heading text-foreground">{Math.round(picked.per100.cal * f)}</p>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">kcal</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-heading text-primary">{Math.round(picked.per100.protein * f)}g</p>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Protein</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-heading text-amber-500">{Math.round(picked.per100.carbs * f)}g</p>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Carbs</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-sm font-heading text-orange-400">{Math.round(picked.per100.fats * f)}g</p>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Fat</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <Button className="w-full h-11 font-bold" onClick={handleSaveSearch} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add to {dayLabel}
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Food name</Label>
              <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. Banana" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Calories *</Label>
              <Input type="number" value={mCalories} onChange={(e) => setMCalories(e.target.value)} placeholder="90" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Protein (g)</Label>
                <Input type="number" value={mProtein} onChange={(e) => setMProtein(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Carbs (g)</Label>
                <Input type="number" value={mCarbs} onChange={(e) => setMCarbs(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Fat (g)</Label>
                <Input type="number" value={mFats} onChange={(e) => setMFats(e.target.value)} placeholder="0" />
              </div>
            </div>
            <Button className="w-full h-11 font-bold" onClick={handleSaveManual} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add to {dayLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
