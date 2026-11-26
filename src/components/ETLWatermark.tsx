import React from "react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";

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
  const branding = useBranding();
  const logoSrc = theme === "dark" ? branding.logo_dark : branding.logo_light;

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
