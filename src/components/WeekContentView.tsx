import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink, PlayCircle } from "lucide-react";
import {
  getWeekContent,
  getEmbedUrl,
  type AccWeekContent,
} from "@/lib/accWeekContent";

/**
 * Renders the staff-authored content for a given week:
 * teaching copy, embedded video, and resource links.
 */
export function WeekContentView({ weekNumber }: { weekNumber: number }) {
  const [content, setContent] = useState<AccWeekContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const c = await getWeekContent(weekNumber);
      if (active) {
        setContent(c);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [weekNumber]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading week content…
      </div>
    );
  }

  const hasAnything =
    content &&
    (content.teaching ||
      content.video_url ||
      (content.resources && content.resources.length > 0));

  if (!hasAnything) return null;

  const embed = content!.video_url ? getEmbedUrl(content!.video_url) : null;

  return (
    <div className="mt-3 space-y-3">
      {content!.teaching && (
        <div className="rounded-lg bg-muted/40 border border-border p-3">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {content!.teaching}
          </p>
        </div>
      )}

      {embed && (
        <div className="rounded-lg overflow-hidden border border-border aspect-video bg-black">
          <iframe
            src={embed}
            title={`Week ${weekNumber} video`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {content!.video_url && !embed && (
        <a
          href={content!.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary font-medium"
        >
          <PlayCircle className="w-4 h-4" /> Watch this week's video
        </a>
      )}

      {content!.resources && content!.resources.length > 0 && (
        <div className="space-y-1.5">
          {content!.resources
            .filter((r) => r.url)
            .map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {r.title || r.url}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}

export default WeekContentView;
