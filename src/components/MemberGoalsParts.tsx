import { Target, Scale, Footprints, Dumbbell, Salad } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrimaryGoal } from "@/lib/memberGoals";

export const PRIMARY_GOAL_OPTIONS: {
  value: PrimaryGoal;
  label: string;
  emoji: string;
}[] = [
  { value: "fat_loss", label: "Fat loss", emoji: "🔥" },
  { value: "strength", label: "Strength", emoji: "💪" },
  { value: "fitness", label: "Fitness", emoji: "🏃" },
  { value: "health", label: "Health", emoji: "❤️" },
];

export const fmtNum = (n?: number | null) => (n == null ? "" : String(n));
export const fmtKg = (n: number) => n.toLocaleString();

export const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const monthLabel = () =>
  new Date().toLocaleDateString("en-GB", { month: "long" });

export function GoalStat({
  icon: Icon,
  label,
  target,
  actual,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  target: string;
  actual: string;
  status: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-base leading-none">{actual}</span>
        <span className="text-xs text-muted-foreground">/ {target}</span>
      </div>
      <p className="text-[10px] text-primary font-medium capitalize">
        {status}
      </p>
    </div>
  );
}

export function Field({
  id,
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm">
        {icon} {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export {
  Target,
  Scale,
  Footprints,
  Dumbbell,
  Salad,
};
