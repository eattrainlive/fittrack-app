import { useState } from "react";
import { PlayCircle, ExternalLink, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEmbedUrl, type AccWeekResource } from "@/lib/accWeekContent";

/**
 * Shared rendering of a week's resources: videos show as clear, tappable
 * video cards that play in an in-app dialog; non-video links show as plain
 * external links. Used by WeekContentView and the dashboard Lesson card so
 * lessons look identical wherever they appear.
 */
export function AccResourceList({
  resources,
}: {
  resources: AccWeekResource[];
}) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [openTitle, setOpenTitle] = useState<string>("");

  const items = (resources || []).filter((r) => r.url);
  const videos = items.filter((r) => getEmbedUrl(r.url));
  const links = items.filter((r) => !getEmbedUrl(r.url));

  const openVideo = (r: AccWeekResource) => {
    setOpenTitle(r.title || "Video");
    setOpenUrl(getEmbedUrl(r.url) || r.url);
  };

  return (
    <>
      {videos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This week's videos
          </p>
          <div className="space-y-2">
            {videos.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openVideo(r)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left transition hover:bg-muted/70 active:scale-[.99]"
              >
                <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
                <span className="flex-1 text-sm font-medium leading-snug">
                  {r.title || r.url}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                  Watch
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-1.5">
          {videos.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resources
            </p>
          )}
          {links.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {r.title || r.url}
            </a>
          ))}
        </div>
      )}

      <Dialog open={!!openUrl} onOpenChange={(o) => !o && setOpenUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{openTitle}</DialogTitle>
          </DialogHeader>
          {openUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={openUrl}
                title={openTitle}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" /> Open in new tab
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AccResourceList;
