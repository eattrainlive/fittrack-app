import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlayCircle, Check } from "lucide-react";
import {
  getWeekContent,
  getEmbedUrl,
  type AccWeekContent,
} from "@/lib/accWeekContent";
import { AccResourceList } from "@/components/AccResourceList";
import { useVideoProgress } from "@/lib/accVideoProgress";

/**
 * Renders the staff-authored content for a given week:
 * teaching copy, embedded video, and resource links. Each video carries a
 * "mark as watched" toggle so members/coaches can track lesson progress.
 */
export function WeekContentView({ weekNumber }: { weekNumber: number }) {
  const [content, setContent] = useState<AccWeekContent | null>(null);
  const [loading, setLoading] = useState(true);
  const { watched, toggle } = useVideoProgress(weekNumber);

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
      content.call_recording_url ||
      (content.resources && content.resources.length > 0));

  if (!hasAnything) return null;

  const embed = content!.video_url ? getEmbedUrl(content!.video_url) : null;
  const mainWatched = !!content!.video_url && watched.has(content!.video_url);
  const callEmbed = content!.call_recording_url
    ? getEmbedUrl(content!.call_recording_url)
    : null;

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
      {embed && content!.video_url && (
        <button
          type="button"
          onClick={() => toggle(content!.video_url!)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
            mainWatched
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:text-primary"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          {mainWatched ? "Watched" : "Mark as watched"}
        </button>
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

      {content!.call_recording_url && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            This week's call recording
          </p>
          {callEmbed ? (
            <div className="rounded-lg overflow-hidden border border-border aspect-video bg-black">
              <iframe
                src={callEmbed}
                title={`Week ${weekNumber} call recording`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={content!.call_recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary font-medium"
            >
              <PlayCircle className="w-4 h-4" /> Watch this week's call
            </a>
          )}
        </div>
      )}

      {content!.resources && content!.resources.length > 0 && (
        <AccResourceList
          resources={content!.resources}
          weekNumber={weekNumber}
        />
      )}
    </div>
  );
}

export default WeekContentView;
