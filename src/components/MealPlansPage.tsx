import { useEffect, useState } from "react";
import { getMemberMacros } from "@/lib/store";
import { ResourcesSection } from "@/components/ResourcesSection";

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-lg font-heading uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="text-sm text-muted-foreground mt-1">Check back soon.</p>
    </div>
  );
}

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
          className={`flex-1 text-sm font-bold py-2 rounded-md transition-all flex items-center justify-center gap-2 ${tab === "build" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Build Your Own
          <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-2 py-0.5">
            Soon
          </span>
        </button>
      </div>

      {tab === "plans" ? (
        <ResourcesSection
          page="meal_plans"
          heading="Ready-Made Plans"
          blurb="Full plans you can follow as-is."
        />
      ) : (
        <ComingSoon title="Build Your Own — Coming Soon" />
      )}
    </div>
  );
}

export default MealPlansPage;
