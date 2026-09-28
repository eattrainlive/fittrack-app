import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trophy } from "lucide-react";
import {
  fetchBlockLeaderboard,
  formatBlockScore,
} from "@/lib/blockLeaderboard";
import { ETL_LOGO_ON_DARK } from "@/lib/brand";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sectionId: string | null;
  sectionTitle?: string | null;
}

export function BlockLeaderboardDialog({
  open,
  onOpenChange,
  sectionId,
  sectionTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sectionId) return;
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    fetchBlockLeaderboard(sectionId).then((res) => {
      if (cancelled) return;
      setEntries(res.entries);
      setTitle(res.title || sectionTitle || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, sectionId, sectionTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col relative">
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {title || "Leaderboard"}
            </DialogTitle>
            <img
              src={ETL_LOGO_ON_DARK}
              alt="Eat Train Live"
              className="h-5 w-auto object-contain opacity-70"
            />
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              No scores logged yet. Be the first!
            </p>
          ) : (
            entries.map((e, i) => (
              <div
                key={e.user_id + i}
                className={`flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 ${
                  i === 0 ? "bg-primary/10 border-primary/40" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {e.member_name || "Member"}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {formatBlockScore(e)}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
