import React from "react";
import { ETL_LOGO_ON_LIGHT, ETL_LOGO_ON_DARK } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface ETLWatermarkProps {
  theme?: "light" | "dark";
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  size?: number;
  className?: string;
}

export function ETLWatermark({
  theme = "light",
  position = "top-right",
  size = 28,
  className,
}: ETLWatermarkProps) {
  const logoSrc = theme === "dark" ? ETL_LOGO_ON_DARK : ETL_LOGO_ON_LIGHT;

  const positionClasses = {
    "top-right": "top-3 right-3",
    "top-left": "top-3 left-3",
    "bottom-right": "bottom-3 right-3",
    "bottom-left": "bottom-3 left-3",
  };

  return (
    <div
      className={cn(
        "absolute pointer-events-none z-10 flex items-center gap-1.5 opacity-70",
        positionClasses[position],
        className,
      )}
    >
      <img
        src={logoSrc}
        alt="ETL"
        style={{ height: `${size}px` }}
        className="w-auto object-contain"
      />
    </div>
  );
}
