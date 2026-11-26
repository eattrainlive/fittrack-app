/**
 * Tenant branding — the single source of brand identity for the app.
 *
 * In the multi-tenant model each gym carries its own branding in `gyms.branding`
 * (name, logo, tagline, theme colours). This module loads that at startup and
 * applies it; everything defaults to Eat Train Live (ETL) so with one tenant the
 * app looks exactly as it always has.
 *
 * Colours are stored as HSL triples (e.g. "84.8 100% 46.5%") matching the CSS
 * variables in index.css, so applying a theme is just setting those variables.
 */
import { supabase } from "@/lib/supabase";

export interface BrandingTheme {
  primary: string; // HSL triple, no hsl() wrapper — matches index.css --primary
  accent: string;
  ring: string;
  sidebar_primary: string;
}

export interface Branding {
  gym_id: string;
  app_name: string; // shown as the app/product name (document title etc.)
  brand_name: string; // short brand label ("Eat Train Live")
  tagline: string; // e.g. "Powered by Eat Train Live"
  logo_light: string; // logo for light backgrounds
  logo_dark: string; // logo for dark backgrounds
  theme: BrandingTheme;
}

// ── ETL defaults — what the app shows when no gym branding is loaded ─────────
export const ETL_LOGO_ON_LIGHT =
  "https://vibe.filesafe.space/1783496939163756206/attachments/43e3e84e-8d06-4052-93d2-8ba0c5f1ea44.png";
export const ETL_LOGO_ON_DARK =
  "https://vibe.filesafe.space/1783496939163756206/attachments/ca530c1e-8f9e-4207-b3c5-8979aab63404.png";
export const ETL_TAGLINE = "Powered by Eat Train Live";

const LIME = "84.8 100% 46.5%";

export const DEFAULT_BRANDING: Branding = {
  gym_id: "etl",
  app_name: "FitTrack",
  brand_name: "Eat Train Live",
  tagline: ETL_TAGLINE,
  logo_light: ETL_LOGO_ON_LIGHT,
  logo_dark: ETL_LOGO_ON_DARK,
  theme: { primary: LIME, accent: LIME, ring: LIME, sidebar_primary: LIME },
};

// Live branding — hydrated by loadBranding() at startup; components read via the
// BrandingProvider/useBranding hook (reactive) or getBranding() (one-off).
let currentBranding: Branding = DEFAULT_BRANDING;
export function getBranding(): Branding {
  return currentBranding;
}
export function setBranding(b: Branding) {
  currentBranding = b;
}

/** Merge a partial branding object from the DB over the ETL defaults. */
function mergeBranding(gymId: string, raw: any): Branding {
  const b = raw && typeof raw === "object" ? raw : {};
  const t = b.theme && typeof b.theme === "object" ? b.theme : {};
  return {
    gym_id: gymId || DEFAULT_BRANDING.gym_id,
    app_name: b.app_name || DEFAULT_BRANDING.app_name,
    brand_name: b.brand_name || DEFAULT_BRANDING.brand_name,
    tagline: b.tagline || DEFAULT_BRANDING.tagline,
    logo_light: b.logo_light || DEFAULT_BRANDING.logo_light,
    logo_dark: b.logo_dark || DEFAULT_BRANDING.logo_dark,
    theme: {
      primary: t.primary || DEFAULT_BRANDING.theme.primary,
      accent: t.accent || DEFAULT_BRANDING.theme.accent,
      ring: t.ring || DEFAULT_BRANDING.theme.ring,
      sidebar_primary: t.sidebar_primary || DEFAULT_BRANDING.theme.sidebar_primary,
    },
  };
}

/** Push theme colours onto the document as CSS variables (re-skins the app). */
export function applyBrandingTheme(b: Branding) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary", b.theme.primary);
  root.style.setProperty("--accent", b.theme.accent);
  root.style.setProperty("--ring", b.theme.ring);
  root.style.setProperty("--sidebar-primary", b.theme.sidebar_primary);
  root.style.setProperty("--sidebar-ring", b.theme.sidebar_primary);
}

/**
 * Resolve and load the current gym's branding. Resolution order:
 *   1. explicit gymId arg,
 *   2. the signed-in user's gym (current_gym_id RPC),
 *   3. ETL default.
 * Never throws — on any failure it returns the ETL default so the app always
 * renders. (Pre-login per-gym branding by domain is a later refinement.)
 */
export async function loadBranding(gymId?: string): Promise<Branding> {
  try {
    let id = gymId || null;
    if (!id) {
      const { data } = await supabase.rpc("current_gym_id");
      id = (data as string | null) || null;
    }
    if (!id) return DEFAULT_BRANDING;
    const { data, error } = await supabase
      .from("gyms")
      .select("id, branding")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return DEFAULT_BRANDING;
    return mergeBranding(data.id, (data as any).branding);
  } catch {
    return DEFAULT_BRANDING;
  }
}
