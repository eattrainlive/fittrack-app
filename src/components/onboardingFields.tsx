import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

export function ShortText({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function LongText({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="resize-none"
    />
  );
}

export function NumberField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

/** 0–5 selector rendered as a button row. */
export function Scale05({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(String(n))}
          className={`flex-1 h-11 rounded-lg border font-heading text-lg transition ${
            value === String(n)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function MultiSelect({
  options,
  value,
  onChange,
  allowOther,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  allowOther?: boolean;
}) {
  const [other, setOther] = useState("");
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-3 py-1.5 rounded-full border text-sm transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted"
              }`}
            >
              {active && <Check className="w-3 h-3 inline mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
      {allowOther && (
        <Input
          placeholder="Other…"
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            const without = value.filter(
              (v) => !options.includes(v) && v !== other,
            );
            onChange(e.target.value ? [...without, e.target.value] : without);
          }}
          className="text-sm"
        />
      )}
    </div>
  );
}

export function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function QLabel({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <Label className="block text-sm font-medium mb-2">
      <span className="text-muted-foreground mr-1.5">{n}.</span>
      {children}
    </Label>
  );
}
