import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { markTourDone } from "@/lib/tour";
import { Button } from "@/components/ui/button";

export type TourStep = {
  /** `data-tour` attribute value to find the target element. */
  target: string;
  title: string;
  body: string;
  /** Route to navigate to before looking for the target (if not on that route). */
  route?: string;
};

const STEPS: TourStep[] = [
  {
    target: "log-workout",
    title: "Log a workout",
    body: "Start here — follow a programme or log your own session.",
    route: "/workouts",
  },
  {
    target: "habits",
    title: "Set your habits",
    body: "Pick a few daily habits to build — small wins add up.",
    route: "/nutrition",
  },
  {
    target: "education",
    title: "Education library",
    body: "Guides, videos and how-tos live here whenever you need them.",
    route: "/nutrition",
  },
];

const STEP_DELAY = 450; // wait for navigation + render before measuring

function getRect(el: HTMLElement): DOMRect {
  return el.getBoundingClientRect();
}

export function AppTour() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);

  const finish = useCallback(async () => {
    await markTourDone();
    window.dispatchEvent(new Event("fittrack_tour_done"));
  }, []);

  const measure = useCallback(() => {
    const def = STEPS[step];
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${def.target}"]`,
    );
    if (!el) {
      setMissing(true);
      setRect(null);
      return;
    }
    setMissing(false);
    el.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
    // re-measure after scroll settles
    requestAnimationFrame(() => setRect(getRect(el)));
  }, [step]);

  // On step change (or mount): navigate if needed, then measure.
  useEffect(() => {
    const def = STEPS[step];
    const run = async () => {
      if (def.route) {
        const here = window.location.pathname;
        if (!here.startsWith(def.route)) {
          navigate(def.route);
        }
      }
      // give the target screen time to render
      setTimeout(measure, STEP_DELAY);
    };
    run();
    // re-measure on resize / scroll while open
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step, measure, navigate]);

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const skip = () => finish();

  if (missing) {
    // target not found — auto-advance after a beat instead of blocking
    setTimeout(() => {
      if (step < STEPS.length - 1) setStep((s) => s + 1);
      else finish();
    }, 600);
  }

  // Tooltip placement: prefer below the target, clamp to viewport.
  const pad = 8;
  const ttWidth = 280;
  let top = 0;
  let left = 0;
  if (rect) {
    top = rect.bottom + pad;
    // if no room below, place above
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 200 && rect.top > 220) top = rect.top - pad - 160;
    left = rect.left + rect.width / 2 - ttWidth / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - ttWidth - pad));
  } else {
    top = window.innerHeight / 2 - 80;
    left = (window.innerWidth - ttWidth) / 2;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dim overlay with a cut-out for the target */}
      {rect ? (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - 6}
                y={rect.top - 6}
                width={rect.width + 12}
                height={rect.height + 12}
                rx={10}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="hsl(var(--foreground))"
            opacity={0.55}
            mask="url(#tour-mask)"
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "hsl(var(--foreground) / 0.55)" }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute"
        style={{
          top,
          left,
          width: ttWidth,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={skip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          </div>
          <h3 className="font-heading text-lg tracking-wide uppercase leading-tight">
            {STEPS[step].title}
          </h3>
          <p className="text-sm text-muted-foreground leading-snug">
            {STEPS[step].body}
          </p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? "w-5 bg-primary"
                      : i < step
                        ? "w-1.5 bg-primary/50"
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
            <Button size="sm" onClick={next} className="gap-1">
              {step === STEPS.length - 1 ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
