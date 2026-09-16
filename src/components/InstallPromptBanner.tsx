import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  Share,
  Smartphone,
  ExternalLink,
  Play,
  Plus,
} from "lucide-react";
import {
  getInstallHelpSettings,
  isStandalone,
  isInAppBrowser,
  detectPlatform,
  vimeoEmbedUrl,
  type InstallHelpSettings,
} from "@/lib/installHelp";

const DISMISS_KEY = "fittrack_install_prompt_dismissed";

export function InstallPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [settings, setSettings] = useState<InstallHelpSettings | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other",
  );
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Don't show if already installed / standalone
    if (isStandalone()) return;

    setPlatform(detectPlatform());
    setInAppBrowser(isInAppBrowser());

    // Don't show if dismissed this session
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    // Capture the Android beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show the banner after a short delay (let the app settle)
    const timer = setTimeout(() => setVisible(true), 1500);

    // Load settings
    getInstallHelpSettings().then(setSettings);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      try {
        await deferredPromptRef.current.userChoice;
      } catch {}
      deferredPromptRef.current = null;
      setVisible(false);
    } else {
      // No native prompt available (iOS or not triggered) — show the video/guide
      setShowVideo(true);
    }
  };

  if (!visible) return null;

  const videoUrl =
    platform === "ios" ? settings?.iosVideoUrl : settings?.androidVideoUrl;
  const embedUrl = videoUrl ? vimeoEmbedUrl(videoUrl) : null;

  return (
    <>
      {/* Dismissible bottom banner */}
      <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md">
        <div className="rounded-xl border border-primary/30 bg-background shadow-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-tight">
                  Add FitTrack to your home screen
                </p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Stay logged in and open with one tap — no more browser logins.
                  {inAppBrowser && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                      You're in an in-app browser — open this in Safari or
                      Chrome to install.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {platform === "android" && deferredPromptRef.current ? (
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={handleInstall}
              >
                <Download className="h-4 w-4" /> Install app
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={handleInstall}
              >
                <Download className="h-4 w-4" /> Install
              </Button>
            )}
            {embedUrl && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => setShowVideo(true)}
              >
                <Play className="h-4 w-4" /> Watch how
              </Button>
            )}
          </div>

          {/* Illustrated iOS steps when no video */}
          {platform === "ios" && !embedUrl && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">
                How to add on iPhone:
              </p>
              <div className="flex items-center gap-2">
                <Share className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Tap the <strong>Share</strong> icon at the bottom of Safari
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>
                </span>
              </div>
            </div>
          )}

          {/* Illustrated Android steps when no video */}
          {platform === "android" &&
            !embedUrl &&
            !deferredPromptRef.current && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">
                  How to add on Android:
                </p>
                <div className="flex items-center gap-2">
                  <Share className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Tap the <strong>menu</strong> (⋮) in Chrome →{" "}
                    <strong>Add to Home screen</strong>
                  </span>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Video dialog */}
      {showVideo && embedUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
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

/** Small inline tip for the Auth page — encourages installing to stay logged in. */
export function InstallAuthTip() {
  const [show, setShow] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    setShow(true);
    setInApp(isInAppBrowser());
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center space-y-1">
      <p className="text-xs text-muted-foreground">
        {inApp ? (
          <>
            Tip: open this in <strong>Safari</strong> or <strong>Chrome</strong>{" "}
            and add it to your home screen so you stay logged in.
          </>
        ) : (
          <>
            Tip: add FitTrack to your home screen so you stay logged in — no
            repeated sign-ins.
          </>
        )}
      </p>
    </div>
  );
}
