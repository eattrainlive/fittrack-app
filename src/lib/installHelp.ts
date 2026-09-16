import { supabase } from "./supabase";

export interface InstallHelpSettings {
  iosVideoUrl: string;
  androidVideoUrl: string;
}

const DEFAULT: InstallHelpSettings = {
  iosVideoUrl: "",
  androidVideoUrl: "",
};

/** Members read the install-help settings (RLS: any authenticated). */
export const getInstallHelpSettings =
  async (): Promise<InstallHelpSettings> => {
    try {
      const { data } = await supabase
        .from("feature_settings")
        .select("value")
        .eq("key", "install_help")
        .maybeSingle();
      if (data?.value) {
        const parsed =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return { ...DEFAULT, ...parsed };
      }
    } catch (e) {
      console.warn("getInstallHelpSettings failed", e);
    }
    return DEFAULT;
  };

/** Detect if the app is running as an installed PWA (standalone). */
export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari standalone
    (window.navigator as any).standalone === true
  );
};

/** Detect if running inside an in-app browser (Instagram, Facebook, Line, etc.). */
export const isInAppBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /Instagram/i.test(ua) ||
    /FBAN|FBAV/i.test(ua) ||
    /Line/i.test(ua) ||
    /Snapchat/i.test(ua) ||
    /GSA/i.test(ua) // Apple News / Apple Search
  );
};

/** Detect platform: iOS vs Android vs other. */
export const detectPlatform = (): "ios" | "android" | "other" => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
};

/** Extract a Vimeo video ID from a Vimeo URL, or null. */
export const vimeoId = (url: string): string | null => {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
};

/** Get the embeddable Vimeo player URL from a video ID or full URL. */
export const vimeoEmbedUrl = (url: string): string | null => {
  const id = vimeoId(url);
  if (!id) return null;
  return `https://player.vimeo.com/video/${id}`;
};
