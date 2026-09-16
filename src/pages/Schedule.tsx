import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const DEFAULT_SCHEDULE_URL =
  "https://eattrainlive.fitnesshub.net/schedule/?hf=1";

const Schedule = () => {
  const [url, setUrl] = useState<string>(DEFAULT_SCHEDULE_URL);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("feature_settings")
          .select("value")
          .eq("key", "schedule")
          .maybeSingle();
        const v = data?.value as any;
        if (active && v?.url) setUrl(v.url);
      } catch {
        /* fall back to default */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // If the iframe doesn't fire onLoad within ~6s, assume the provider blocks
  // framing and show the fallback card instead of a blank screen.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [loaded]);

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/60">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-heading text-lg tracking-wide uppercase truncate">
            Class Schedule
          </h1>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
        >
          Open in browser <ExternalLink className="w-3 h-3" />
        </a>
      </header>

      <div className="relative flex-1 bg-background">
        {!loaded && !blocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm">Loading the timetable…</p>
          </div>
        )}

        {blocked ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm w-full text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-heading uppercase tracking-wide">
                  Open the schedule
                </h2>
                <p className="text-sm text-muted-foreground">
                  The timetable opens in a new tab so you can view and book
                  classes.
                </p>
              </div>
              <Button asChild className="gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Open schedule <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            src={url}
            title="Class Schedule"
            className="w-full h-full border-0"
            allow="fullscreen"
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  );
};

export default Schedule;
