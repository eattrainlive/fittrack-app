import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Embeds the "How to set your habits" explainer video at the top of every
 * habit-setting screen (trialist + member). Responsive 16:9 Vimeo embed.
 * Collapsible — shown by default.
 */
export function HabitExplainerVideo({
  title = "How to set your habits",
  defaultOpen = true,
}: {
  title?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          {title}
        </span>
        <ChevronDown
          className={
            "w-4 h-4 text-muted-foreground transition " +
            (open ? "rotate-180" : "")
          }
        />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div
            className="relative w-full rounded-lg overflow-hidden bg-black"
            style={{ paddingTop: "56.25%" }}
          >
            <iframe
              src="https://player.vimeo.com/video/1232022355"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="How to set your habits"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HabitExplainerVideo;
