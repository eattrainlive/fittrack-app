import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Play, ArrowRightLeft } from "lucide-react";
import {
  getSmartAlternates,
  rankAlternatesLocally,
  type AlternateCandidate,
  type AlternateContext,
} from "@/lib/smartAlternates";

interface SmartAlternatesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: string | null;
  exerciseName: string;
  allExercises: any[];
  context: AlternateContext;
  onApply: (exercise: AlternateCandidate) => void;
}

export const SmartAlternatesPanel = ({
  open,
  onOpenChange,
  exerciseId,
  exerciseName,
  allExercises,
  context,
  onApply,
}: SmartAlternatesPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [alternates, setAlternates] = useState<AlternateCandidate[]>([]);
  const [fromServer, setFromServer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!open || !exerciseId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setAlternates([]);
      const res = await getSmartAlternates(exerciseId, context);
      if (cancelled) return;
      if (res.alternates.length > 0) {
        setAlternates(res.alternates);
        setFromServer(res.fromServer);
      } else {
        // Fallback to local ranking.
        const origin = allExercises.find(
          (e) => String(e.id) === String(exerciseId),
        );
        const local = rankAlternatesLocally(origin, allExercises, context);
        setAlternates(local);
        setFromServer(false);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exerciseId]);

  const filteredSearch = searchQuery
    ? allExercises
        .filter((e) =>
          String(e.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )
        .slice(0, 20)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Smart alternates
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Swap{" "}
            <span className="font-semibold text-foreground">
              {exerciseName}
            </span>{" "}
            for a like-for-like movement
          </p>
        </DialogHeader>

        {!fromServer && !loading && (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            Using local ranking — deploy the{" "}
            <code className="font-mono">get-alternates</code> function for
            semantic-aware results.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Finding alternates…
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {alternates.map((alt) => (
              <button
                key={alt.id}
                onClick={() => {
                  onApply(alt);
                  onOpenChange(false);
                }}
                className="w-full flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {alt.name}
                    </span>
                    {alt.videoUrl && (
                      <a
                        href={alt.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-primary"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alt.reason}
                  </p>
                  {alt.equipment && (
                    <Badge variant="outline" className="mt-1 text-[10px] h-4">
                      {alt.equipment}
                    </Badge>
                  )}
                </div>
              </button>
            ))}

            {alternates.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ranked alternates found.
              </p>
            )}
          </div>
        )}

        {/* Free-search fallback */}
        <div className="pt-2 border-t border-border">
          {!showSearch ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => setShowSearch(true)}
            >
              <Search className="h-4 w-4" /> Search all exercises
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-sm py-2 focus:outline-none text-foreground"
                  placeholder="Type an exercise name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredSearch.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      onApply({
                        id: ex.id,
                        name: ex.name,
                        equipment: ex.equipment,
                        difficulty: ex.difficulty,
                        movementType: ex.movementType,
                        videoUrl: ex.videoUrl,
                        reason: "manual selection",
                        score: 0,
                      });
                      onOpenChange(false);
                    }}
                    className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted/30 text-foreground"
                  >
                    {ex.name}
                    {ex.movementType ? (
                      <span className="text-xs text-muted-foreground ml-2">
                        (
                        {Array.isArray(ex.movementType)
                          ? ex.movementType.join(", ")
                          : ex.movementType}
                        )
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
