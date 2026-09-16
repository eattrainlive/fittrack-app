import { useEffect, useState } from "react";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const DEFAULT_SCHEDULE_URL =
  "https://eattrainlive.fitnesshub.net/schedule/?hf=1";

const Schedule = () => {
  const [url, setUrl] = useState<string>(DEFAULT_SCHEDULE_URL);
  const [ready, setReady] = useState(false);

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
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openSchedule = () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card/60">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-heading text-lg tracking-wide uppercase truncate">
            Class schedule
          </h1>
        </div>
      </header>

      <div className="relative flex-1 bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-heading uppercase tracking-wide">
              Class schedule
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              View and book classes on our booking site. Tip: tick
              &ldquo;remember me&rdquo; when you log in and you&rsquo;ll stay
              signed in next time.
            </p>
          </div>
          <Button
            onClick={openSchedule}
            disabled={!ready}
            className="gap-2 w-full"
          >
            {!ready ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Open class schedule <ExternalLink className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
