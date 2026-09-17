import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTourSteps,
  markTourDone,
  type TourStep,
} from "@/lib/onboardingTour";
import {
  isStandalone,
  isInAppBrowser,
  detectPlatform,
  getInstallHelpSettings,
  vimeoEmbedUrl,
} from "@/lib/installHelp";
import { Button } from "@/components/ui/button";
import { Smartphone, Play, X } from "lucide-react";

/**
 * A lightweight, dependency-free coach-mark tour.
 * Highlights elements with `data-tour="..."` attributes, dims the rest,
 * and persists completion server-side so it only shows once.
 * Includes an "Add to home screen" step when the app isn't installed.
 */
export function OnboardingTour({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [showInstallVideo, setShowInstallVideo] = useState(false);
  const [installVideoUrl, setInstallVideoUrl] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const platformRef = useRef(detectPlatform());

  const steps = getTourSteps();
  const step: TourStep | undefined = steps[stepIndex];
  const isInstallStep = step?.target === "install";

  const highlight = useCallback(
    async (s: TourStep) => {
      if (s.navigateTo) {
        navigate(s.navigateTo);
      }
      let el: HTMLElement | null = null;
      for (let i = 0; i < 20; i++) {
        el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
        if (el) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!el) {
        next();
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 220));
      setRect(el.getBoundingClientRect());
      setReady(true);
    },
    [navigate],
  );

  // Load install help settings + capture beforeinstallprompt
  useEffect(() => {
    getInstallHelpSettings().then((s) => {
      const url =
        platformRef.current === "ios" ? s.iosVideoUrl : s.androidVideoUrl;
      setInstallVideoUrl(url || null);
    });
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;
    setReady(false);
    setRect(null);
    if (isInstallStep) {
      // Install step doesn't need a target highlight — just show the card.
      setReady(true);
    } else {
      highlight(step);
    }
  }, [active, stepIndex, step, highlight, isInstallStep]);

  useEffect(() => {
    if (!active || !ready || isInstallStep) return;
    const recompute = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${step?.target}"]`,
      );
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [active, ready, step, isInstallStep]);

  const finish = useCallback(async () => {
    await markTourDone();
    onComplete();
  }, [onComplete]);

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, finish, steps.length]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  if (!active || !step || !ready) return null;

  const pad = 8;
  const isLast = stepIndex === steps.length - 1;
  const embedUrl = installVideoUrl ? vimeoEmbedUrl(installVideoUrl) : null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {}
      setDeferredPrompt(null);
    } else if (embedUrl) {
      setShowInstallVideo(true);
    }
  };

  // Install step: centered card (no target highlight)
  if (isInstallStep) {
    const inApp = isInAppBrowser();
    return (
      <>
        <div className="fixed inset-0 z-[100] bg-black/60" onClick={skip} />
        <div className="fixed z-[101] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[88vw] max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {stepIndex + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="font-heading text-lg uppercase tracking-wide leading-tight">
            Add to home screen
          </h3>
          <p className="text-sm text-muted-foreground leading-snug">
            Add FitTrack to your home screen so you stay logged in — no more
            repeated sign-ins.
            {inApp && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                You're in an in-app browser — open this in Safari or Chrome to
                install.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            {deferredPrompt ? (
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={handleInstall}
              >
                <Smartphone className="h-4 w-4" /> Install app
              </Button>
            ) : embedUrl ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => setShowInstallVideo(true)}
              >
                <Play className="h-4 w-4" /> Watch how
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground flex-1 leading-snug">
                {platformRef.current === "ios"
                  ? "In Safari, tap the Share button, then 'Add to Home Screen'."
                  : "In your browser menu, tap 'Add to Home screen' or 'Install app'."}
              </p>
            )}
          </div>
          {/* progress dots */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex
                      ? "w-5 bg-primary"
                      : i < stepIndex
                        ? "w-1.5 bg-primary/50"
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            <Button size="sm" onClick={next} className="gap-1">
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
        {showInstallVideo && embedUrl && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowInstallVideo(false)}
          >
            <div
              className="w-full max-w-lg space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end">
                <button
                  onClick={() => setShowInstallVideo(false)}
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

  // Regular step: highlight target
  const tooltipBelow = rect && rect.bottom + 180 < window.innerHeight;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/60"
        style={{
          clipPath: rect
            ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${
                rect.top - pad
              }px, ${rect.left - pad}px ${rect.top - pad}px, ${
                rect.left - pad
              }px ${rect.bottom + pad}px, ${
                rect.right + pad
              }px ${rect.bottom + pad}px, ${
                rect.right + pad
              }px ${rect.top - pad}px, 0 ${rect.top - pad}px)`
            : undefined,
        }}
      />
      {rect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[88vw] max-w-sm bg-card border border-border rounded-xl shadow-xl p-4 space-y-3"
        style={{
          top: tooltipBelow
            ? rect!.bottom + pad + 12
            : Math.max(12, rect!.top - 160),
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {stepIndex + 1} of {steps.length}
          </span>
          <button
            onClick={skip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>
        <h3 className="font-heading text-lg uppercase tracking-wide leading-tight">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-snug">
          {step.body}
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex
                    ? "w-5 bg-primary"
                    : i < stepIndex
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          <Button size="sm" onClick={next} className="gap-1">
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
