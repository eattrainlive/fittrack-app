import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  Play,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import {
  getAllTrialWeekContent,
  getTaskState,
  toggleTask,
  type TrialWeekContent as TWC,
} from "@/lib/trialWeekContent";
import { getEmbedUrl } from "@/lib/trialHub";

interface Props {
  /** Current trial week (1..4). */
  currentWeek: number;
}

export function TrialWeekContent({ currentWeek }: Props) {
  const [weeks, setWeeks] = useState<TWC[]>([]);
  const [taskState, setTaskState] = useState<Record<string, string>>({});
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [w, ts] = await Promise.all([
        getAllTrialWeekContent(),
        getTaskState(),
      ]);
      setWeeks(w);
      setTaskState(ts);
      // Default to current week open
      setOpenWeek(currentWeek);
      setLoading(false);
    })();
  }, [currentWeek]);

  const handleToggleTask = async (taskId: string, checked: boolean) => {
    const updated = await toggleTask(taskId, checked);
    setTaskState(updated);
    if (checked) toast.success("Task done — nice work!");
  };

  if (loading || weeks.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="font-heading text-lg tracking-wide uppercase">
          Your 4-week journey
        </h2>

        {/* 4-week strip */}
        <div className="grid grid-cols-4 gap-2">
          {weeks.map((w) => {
            const isCurrent = w.week_number === currentWeek;
            const isPast = w.week_number < currentWeek;
            const isLocked = w.week_number > currentWeek;
            return (
              <button
                key={w.week_number}
                disabled={isLocked}
                onClick={() => setOpenWeek(isLocked ? openWeek : w.week_number)}
                className={
                  "flex flex-col items-center gap-1 rounded-lg border p-2 transition " +
                  (isCurrent
                    ? "border-primary bg-primary/10"
                    : isPast
                      ? "border-border bg-muted/40"
                      : "border-border opacity-40 cursor-not-allowed")
                }
              >
                {isLocked ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : isPast ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : isCurrent ? (
                  <Circle className="w-4 h-4 text-primary fill-primary/30" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Wk {w.week_number}
                </span>
              </button>
            );
          })}
        </div>

        {/* Week content (openable for past + current weeks) */}
        {weeks
          .filter((w) => w.week_number <= currentWeek)
          .sort((a, b) => b.week_number - a.week_number)
          .map((w) => {
            const isOpen = openWeek === w.week_number;
            const tasks = Array.isArray(w.tasks) ? w.tasks : [];
            const doneCount = tasks.filter((t) => taskState[t.id]).length;
            return (
              <div
                key={w.week_number}
                className="rounded-xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenWeek(isOpen ? null : w.week_number)}
                  className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/40 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight">
                      {w.title || w.theme}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.week_number === currentWeek
                        ? "This week"
                        : "Week " + w.week_number}
                      {tasks.length > 0 &&
                        ` · ${doneCount}/${tasks.length} tasks`}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* Teaching */}
                    {w.teaching && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {w.teaching}
                      </p>
                    )}

                    {/* Video */}
                    {w.video_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5 text-left hover:bg-muted/70 transition">
                            <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                              <Play className="w-4 h-4 text-primary fill-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight">
                                Watch this week's lesson
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Week {w.week_number} video
                              </p>
                            </div>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl p-0 overflow-hidden">
                          <div className="aspect-video w-full bg-black">
                            <iframe
                              src={getEmbedUrl(w.video_url) || ""}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                              title={`Week ${w.week_number} lesson`}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Tasks */}
                    {tasks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          This week's tasks
                        </p>
                        {tasks.map((t) => {
                          const done = !!taskState[t.id];
                          return (
                            <button
                              key={t.id}
                              onClick={() => handleToggleTask(t.id, !done)}
                              className="w-full flex items-center gap-2.5 text-left text-sm py-1 group"
                            >
                              {done ? (
                                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground" />
                              )}
                              <span
                                className={
                                  done
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }
                              >
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {!w.teaching && !w.video_url && tasks.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Content coming soon.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

export default TrialWeekContent;
