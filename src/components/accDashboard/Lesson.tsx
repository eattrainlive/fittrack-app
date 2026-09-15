import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, AlertCircle } from "lucide-react";
import { getEmbedUrl, type AccWeekContent } from "@/lib/accWeekContent";

export function LessonCard({
  content,
  week,
  checkinDue,
  checkinDone,
  onStartCheckin,
}: {
  content: AccWeekContent | null;
  week: number;
  checkinDue: boolean;
  checkinDone: boolean;
  onStartCheckin: () => void;
}) {
  const embed = content?.video_url ? getEmbedUrl(content.video_url) : null;
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This week's lesson</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {content ? (
          <>
            {content.title && (
              <p className="font-heading text-lg">{content.title}</p>
            )}
            {content.habit && (
              <p className="text-xs text-primary font-medium">
                New habit: {content.habit}
              </p>
            )}
            {embed && (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <iframe
                  src={embed}
                  className="w-full h-full"
                  allowFullScreen
                  title={content.title || "Lesson video"}
                />
              </div>
            )}
            {content.teaching && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {content.teaching}
              </p>
            )}
            {content.resources?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition"
                  >
                    {r.title}
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your coach will add this week's lesson soon.
          </p>
        )}

        {/* Check-in CTA */}
        {!checkinDone && (
          <div
            className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
              checkinDue
                ? "bg-amber-500/5 border-amber-500/40"
                : "bg-muted/30 border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              {checkinDue && <AlertCircle className="w-4 h-4 text-amber-500" />}
              <div>
                <p className="text-sm font-medium">
                  {week === 6
                    ? "Your final review is due"
                    : `Your Week ${week} check-in is due Sunday`}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={onStartCheckin} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
