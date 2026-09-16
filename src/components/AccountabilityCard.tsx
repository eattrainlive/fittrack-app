import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ArrowUpRight, Play } from "lucide-react";
import {
  getAccountabilitySettings,
  type AccountabilitySettings,
} from "@/lib/accountability";
import {
  getActiveCohort,
  getMyClientRecord,
} from "@/lib/accountabilityProgramme";

const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function AccountabilityCard() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<AccountabilitySettings | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAccountabilitySettings();
      setCfg(settings);
      // Check if this member is enrolled in the active cohort.
      const cohort = await getActiveCohort();
      if (cohort) {
        const client = await getMyClientRecord(cohort.id);
        setEnrolled(!!client);
      }
    })();
  }, []);

  if (!cfg) return null;

  const subtitle = cfg.startDate
    ? `Starts ${formatDate(cfg.startDate)}`
    : "Coming soon";

  const handleClick = () => {
    // Enrolled members always go to the programme space.
    if (enrolled) {
      navigate("/accountability");
      return;
    }
    if (cfg.enabled && cfg.courseRoute) {
      navigate(cfg.courseRoute);
      return;
    }
    if (cfg.enabled && !cfg.courseRoute) {
      navigate("/accountability");
      return;
    }
    // Off → register interest
    if (cfg.registerUrl) {
      window.open(cfg.registerUrl, "_blank", "noopener,noreferrer");
    }
  };

  const hasButton = enrolled
    ? true
    : cfg.enabled
      ? !!cfg.courseRoute
      : !!cfg.registerUrl;
  const buttonLabel = enrolled
    ? "Open programme"
    : cfg.enabled
      ? "Open programme"
      : "Register your interest";

  const shortLabel =
    buttonLabel === "Register your interest" ? "Register" : buttonLabel;

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 sm:gap-4 bg-gradient-to-br from-primary/15 via-card to-card border border-primary/30 rounded-xl p-4 text-left shadow-sm active:scale-[0.99] transition"
    >
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md">
        <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {enrolled ? "Your programme" : "New Programme"}
        </p>
        <p className="font-heading text-base sm:text-lg uppercase tracking-wider leading-tight line-clamp-2">
          {cfg.title}
        </p>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
          <CalendarDays className="w-3 h-3 shrink-0" /> {subtitle}
        </p>
      </div>
      {hasButton ? (
        <span className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-bold text-xs px-3 py-2 rounded-lg whitespace-nowrap">
          {enrolled || cfg.enabled ? (
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="hidden sm:inline">{buttonLabel}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </span>
      ) : (
        <span className="shrink-0 text-[10px] font-bold uppercase text-muted-foreground bg-muted px-2.5 py-2 rounded-lg">
          Details coming soon
        </span>
      )}
    </button>
  );
}
