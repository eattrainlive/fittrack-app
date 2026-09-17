import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TOUR_STEPS, markTourDone, type TourStep } from "@/lib/onboardingTour";
import { Button } from "@/components/ui/button";

/**
 * A lightweight, dependency-free 3-step coach-mark tour.
 * Highlights elements with `data-tour="..."` attributes, dims the rest,
 * and persists completion server-side so it only shows once.
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

  const step: TourStep | undefined = TOUR_STEPS[stepIndex];

  const highlight = useCallback(
    async (s: TourStep) => {
      // Navigate first if needed, then wait for the target to render.
      if (s.navigateTo) {
        navigate(s.navigateTo);
      }
      // Poll for the target element (it may need a render cycle).
      let el: HTMLElement | null = null;
      for (let i = 0; i < 20; i++) {
        el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
        if (el) break;
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!el) {
        // Target not found — skip this step gracefully.
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

  useEffect(() => {
    if (!active || !step) return;
    setReady(false);
    setRect(null);
    highlight(step);
  }, [active, stepIndex, step, highlight]);

  // Recompute rect on resize/scroll so the highlight tracks.
  useEffect(() => {
    if (!active || !ready) return;
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
  }, [active, ready, step]);

  const finish = useCallback(async () => {
    await markTourDone();
    onComplete();
  }, [onComplete]);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, finish]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  if (!active || !step || !ready) return null;

  const pad = 8;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Tooltip placement: prefer below the target, flip above if near bottom.
  const tooltipBelow = rect && rect.bottom + 180 < window.innerHeight;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dim overlay with a cutout for the target */}
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
      {/* Highlight ring */}
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
      {/* Tooltip card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[88vw] max-w-sm bg-card border border-border rounded-xl shadow-xl p-4 space-y-3"
        style={{
          top: tooltipBelow
            ? rect.bottom + pad + 12
            : Math.max(12 + safeTop(), rect.top - 160),
          bottom: !tooltipBelow ? undefined : undefined,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {stepIndex + 1} of {TOUR_STEPS.length}
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
          {/* progress dots */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
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

function safeTop(): number {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--safe-top")
      .trim();
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
