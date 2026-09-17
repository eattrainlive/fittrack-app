import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Play, X, Share, Plus } from "lucide-react";
import {
  isStandalone,
  isInAppBrowser,
  detectPlatform,
  getInstallHelpSettings,
  vimeoEmbedUrl,
  type InstallHelpSettings,
} from "@/lib/installHelp";

/**
 * Slim, non-dismissible banner at the top of the Education area.
 * Only shown when the app is NOT installed (standalone). Disappears once installed.
 */
export function EducationInstallBanner() {
  const [settings, setSettings] = useState<InstallHelpSettings | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other",
  );
  const [inApp, setInApp] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const deferredRef = useRef<any>(null);

  useEffect(() => {
    if (isStandalone()) return;
    setPlatform(detectPlatform());
    setInApp(isInAppBrowser());
    getInstallHelpSettings().then(setSettings);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e;
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Don't render if installed
  if (isStandalone()) return null;

  const videoUrl =
    platform === "ios" ? settings?.iosVideoUrl : settings?.androidVideoUrl;
  const embedUrl = videoUrl ? vimeoEmbedUrl(videoUrl) : null;

  const handleInstall = async () => {
    if (deferredRef.current) {
      deferredRef.current.prompt();
      try {
        await deferredRef.current.userChoice;
      } catch {}
      deferredRef.current = null;
      setDeferredPrompt(null);
    } else if (embedUrl) {
      setShowVideo(true);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">
            📲 Add FitTrack to your home screen
          </p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
            {inApp
              ? "Open this in Safari or Chrome to install — in-app browsers can't install."
              : "Stay logged in and open with one tap."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {deferredPrompt ? (
            <Button size="sm" className="gap-1.5" onClick={handleInstall}>
              <Smartphone className="h-3.5 w-3.5" /> Install
            </Button>
          ) : embedUrl ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowVideo(true)}
            >
              <Play className="h-3.5 w-3.5" /> Watch how
            </Button>
          ) : platform === "ios" ? (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Share → Add to Home Screen
            </span>
          ) : null}
        </div>
      </div>

      {showVideo && embedUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="w-full max-w-lg space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowVideo(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="How to add FitTrack to your home screen"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
