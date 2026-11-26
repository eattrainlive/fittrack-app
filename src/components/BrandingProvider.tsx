// Loads the current gym's branding at startup, applies its theme colours and
// document title, and exposes it via useBranding(). Defaults to ETL, so with a
// single tenant nothing changes. Re-themes the whole app via CSS variables.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_BRANDING,
  applyBrandingTheme,
  loadBranding,
  setBranding,
  type Branding,
} from "@/lib/branding";

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    // Apply ETL default immediately (no flash of unstyled brand), then hydrate
    // from the signed-in gym and re-apply.
    applyBrandingTheme(DEFAULT_BRANDING);
    let cancelled = false;
    loadBranding().then((b) => {
      if (cancelled) return;
      setBranding(b);
      setBrandingState(b);
      applyBrandingTheme(b);
      if (typeof document !== "undefined" && b.app_name) {
        document.title = b.app_name;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
  );
}

export default BrandingProvider;
