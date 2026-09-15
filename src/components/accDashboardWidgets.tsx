import { Check, Lock, Circle } from "lucide-react";

export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-7"
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EncouragingEmpty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground italic">{text}</p>;
}

export function FormStatusRow({
  label,
  status,
  done,
  locked,
}: {
  label: string;
  status: string;
  done?: boolean;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2">
        {done ? (
          <Check className="w-3.5 h-3.5 text-primary" />
        ) : locked ? (
          <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
        ) : (
          <Circle className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {label}
      </span>
      <span
        className={`text-xs ${
          done
            ? "text-primary"
            : locked
              ? "text-muted-foreground/50"
              : "text-muted-foreground"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

export function PhotoTile({
  photo,
  label,
  emptyText,
}: {
  photo: any;
  label: string;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-border aspect-[3/4] bg-muted/30 flex flex-col">
      {photo?.url ? (
        <img
          src={photo.url}
          alt={label}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-2">
          <span className="text-[10px] text-muted-foreground">{emptyText}</span>
        </div>
      )}
      <span className="text-[10px] text-center py-0.5 bg-card/80 border-t border-border">
        {label}
      </span>
    </div>
  );
}
