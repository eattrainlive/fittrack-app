import { useEffect, useState } from "react";
import { getMemberMacros } from "@/lib/store";
import { ResourcesSection } from "@/components/ResourcesSection";
import { RecipeCards } from "@/components/RecipeCards";
import { ReadyMadePlans } from "@/components/ReadyMadePlans";

export function MealPlansPage() {
  const [tab, setTab] = useState<"plans" | "build">("plans");
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    const m = getMemberMacros();
    setTarget(m?.calorie_target ?? null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex bg-muted rounded-lg p-1">
        <button
          onClick={() => setTab("plans")}
          className={`flex-1 text-sm font-bold py-2 rounded-md transition-all ${tab === "plans" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Ready-Made Plans
        </button>
        <button
          onClick={() => setTab("build")}
          className={`flex-1 text-sm font-bold py-2 rounded-md transition-all ${tab === "build" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Build Your Own
        </button>
      </div>

      {tab === "plans" ? (
        <div className="space-y-6">
          <ReadyMadePlans />
          <ResourcesSection
            page="meal_plans"
            heading="More resources"
            blurb="Guides and extras from your coach."
          />
        </div>
      ) : (
        <RecipeCards targetCalories={target} />
      )}
    </div>
  );
}

export default MealPlansPage;
