import { ETL_LOGO_ON_DARK, ETL_LOGO_ON_LIGHT } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface PoweredByETLProps {
  className?: string;
  theme?: "dark" | "light" | "auto";
  size?: "sm" | "default";
}

export function PoweredByETL({
  className,
  theme = "auto",
  size = "default",
}: PoweredByETLProps) {
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 select-none opacity-80 hover:opacity-100 transition-opacity",
        className,
      )}
    >
      <img
        src={theme === "light" ? ETL_LOGO_ON_LIGHT : ETL_LOGO_ON_DARK}
        alt="Eat Train Live"
        className={cn(
          "object-contain shrink-0",
          isSmall ? "h-4 w-4" : "h-5 w-5",
        )}
        loading="lazy"
      />
      <span
        className={cn(
          "font-medium text-muted-foreground tracking-wide",
          isSmall ? "text-[10px]" : "text-xs",
        )}
      >
        Powered by{" "}
        <span className="font-semibold text-foreground/80">Eat Train Live</span>
      </span>
    </div>
  );
}

export function EtlLogoWatermark({
  className,
  theme = "dark",
  size = 28,
}: {
  className?: string;
  theme?: "dark" | "light";
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 shrink-0 opacity-75 hover:opacity-100 transition-opacity",
        className,
      )}
    >
      <img
        src={theme === "light" ? ETL_LOGO_ON_LIGHT : ETL_LOGO_ON_DARK}
        alt="Eat Train Live"
        style={{ height: `${size}px`, width: `${size}px` }}
        className="object-contain"
        loading="lazy"
      />
      <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground font-semibold">
        Eat Train Live
      </span>
    </div>
  );
}
