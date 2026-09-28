import React from "react";
import { ETL_LOGO_ON_LIGHT, ETL_LOGO_ON_DARK, ETL_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
export { ETLWatermark } from "@/components/ETLWatermark";

interface PoweredByETLProps {
  theme?: "light" | "dark";
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PoweredByETL({
  theme = "light",
  className,
  size = "sm",
}: PoweredByETLProps) {
  const logoSrc = theme === "dark" ? ETL_LOGO_ON_DARK : ETL_LOGO_ON_LIGHT;

  const iconSizes = {
    sm: "h-4 w-auto",
    md: "h-5 w-auto",
    lg: "h-6 w-auto",
  };

  const textSizes = {
    sm: "text-[11px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 select-none opacity-80 hover:opacity-100 transition-opacity",
        className,
      )}
    >
      <img
        src={logoSrc}
        alt="Eat Train Live"
        className={cn("object-contain shrink-0", iconSizes[size])}
      />
      <span
        className={cn(
          "font-medium tracking-wide",
          theme === "dark" ? "text-neutral-400" : "text-muted-foreground",
          textSizes[size],
        )}
      >
        {ETL_TAGLINE}
      </span>
    </div>
  );
}

export function ETLLogoHeader({
  theme = "light",
  className,
}: {
  theme?: "light" | "dark";
  className?: string;
}) {
  const logoSrc = theme === "dark" ? ETL_LOGO_ON_DARK : ETL_LOGO_ON_LIGHT;

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <img
        src={logoSrc}
        alt="Eat Train Live"
        className="w-32 md:w-36 h-auto object-contain mx-auto transition-transform hover:scale-105"
      />
    </div>
  );
}
