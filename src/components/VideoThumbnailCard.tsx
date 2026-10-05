import { useEffect, useState, forwardRef } from "react";
import { Play } from "lucide-react";
import { getVideoThumbnail } from "@/lib/videoThumbnail";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  videoUrl: string;
  title: string;
  subtitle?: string;
}

/**
 * A video card that shows the real lesson thumbnail (with a play overlay)
 * instead of a generic icon. Renders a <button> root (forwardRef) so it can be
 * used as a Radix DialogTrigger `asChild` trigger. Falls back to an icon card
 * if no thumbnail can be resolved.
 */
export const VideoThumbnailCard = forwardRef<HTMLButtonElement, Props>(
  ({ videoUrl, title, subtitle, ...props }, ref) => {
    const [thumb, setThumb] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let alive = true;
      getVideoThumbnail(videoUrl)
        .then((t) => alive && setThumb(t))
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [videoUrl]);

    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className="w-full text-left rounded-lg border border-border bg-muted/40 overflow-hidden hover:bg-muted/70 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {thumb ? (
          <div className="relative aspect-video w-full bg-black/5">
            <img
              src={thumb}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-sm font-medium leading-tight text-white">
                {title}
              </p>
              {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center gap-3 p-2.5">
            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{title}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        )}
      </button>
    );
  },
);

VideoThumbnailCard.displayName = "VideoThumbnailCard";

export default VideoThumbnailCard;
