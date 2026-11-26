import React from "react";
import { cn } from "@/lib/utils";
import { useBranding } from "@/components/BrandingProvider";
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
  const branding = useBranding();
  const logoSrc = theme === "dark" ? branding.logo_dark : branding.logo_light;

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
        alt={branding.brand_name}
        className={cn("object-contain shrink-0", iconSizes[size])}
      />
      <span
        className={cn(
          "font-medium tracking-wide",
          theme === "dark" ? "text-neutral-400" : "text-muted-foreground",
          textSizes[size],
        )}
      >
        {branding.tagline}
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
  const branding = useBranding();
  const logoSrc = theme === "dark" ? branding.logo_dark : branding.logo_light;

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <img
        src={logoSrc}
        alt={branding.brand_name}
        className="w-32 md:w-36 h-auto object-contain mx-auto transition-transform hover:scale-105"
      />
    </div>
  );
}
