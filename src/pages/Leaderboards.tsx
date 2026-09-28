import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trophy, Loader2, Flame, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { getWorkoutsOfWeek, getWowResults } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  fetchBlockLeaderboard,
  formatBlockScore,
  type BlockScoreEntry,
} from "@/lib/blockLeaderboard";
import { BlockLeaderboardDialog } from "@/components/BlockLeaderboardDialog";
import { ETLWatermark } from "@/components/ETLWatermark";
import { ETL_LOGO_ON_DARK } from "@/lib/brand";

const Leaderboards = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentWow, setCurrentWow] = useState<any>(null);
  const [wowResults, setWowResults] = useState<any[]>([]);
  const [uid, setUid] = useState<string>("");

  // Block boards: map sectionId -> { title, entries }
  const [blockBoards, setBlockBoards] = useState<
    { sectionId: string; title: string; entries: BlockScoreEntry[] }[]
  >([]);
  const [openBoard, setOpenBoard] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const u = localStorage.getItem("fittrack_current_uid") || "";
      setUid(u);

      // --- Workout of the Week ---
      const wows = await getWorkoutsOfWeek();
      const todayStr = new Date().toISOString().split("T")[0];
      let wow = wows.find((w: any) => w.week_start <= todayStr);
      if (!wow && wows.length > 0) wow = wows[wows.length - 1];
      if (!cancelled) setCurrentWow(wow);
      if (wow) {
        const results = await getWowResults(wow.id);
        if (!cancelled) setWowResults(results);
      }

      // --- Block leaderboards this week ---
      // Pull distinct leaderboard sections with recent scores, then load each.
      try {
        const { data: sections } = await supabase
          .from("block_scores")
          .select(
            "section_id, leaderboard_title, section_title, block_type, created_at",
          )
          .eq("is_leaderboard", true)
          .order("created_at", { ascending: false });

        if (!cancelled && sections && sections.length) {
          // Deduplicate by section_id, keep most recent.
          const seen = new Map<string, any>();
          for (const s of sections as any[]) {
            if (!seen.has(s.section_id)) seen.set(s.section_id, s);
          }
          const distinct = [...seen.values()].slice(0, 8);

          const boards: {
            sectionId: string;
            title: string;
            entries: BlockScoreEntry[];
          }[] = [];
          for (const s of distinct) {
            const res = await fetchBlockLeaderboard(s.section_id);
            if (res.entries.length) {
              boards.push({
                sectionId: s.section_id,
                title:
                  res.title ||
                  s.leaderboard_title ||
                  s.section_title ||
                  "Block",
                entries: res.entries,
              });
            }
          }
          // Order by most entries / most recent.
          boards.sort((a, b) => b.entries.length - a.entries.length);
          if (!cancelled) setBlockBoards(boards);
        }
      } catch (e) {
        // best-effort
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmtWow = (score: number) => {
    if (currentWow?.score_type === "time") {
      const m = Math.floor((score || 0) / 60);
      const s = (score || 0) % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    return `${score}`;
  };

  const wowTypeLabel = currentWow
    ? currentWow.score_type === "time"
      ? "For Time"
      : currentWow.score_type === "reps"
        ? "Total Reps"
        : currentWow.score_type === "distance"
          ? "For Distance"
          : "For Calories"
    : "";

  const sortedWow = [...wowResults].sort((a, b) =>
    currentWow?.score_type === "time" ? a.score - b.score : b.score - a.score,
  );
  const myWow = wowResults.find((r) => r.member_id === uid);
  const myWowRank =
    myWow && sortedWow.findIndex((r) => r.member_id === uid) + 1;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl tracking-wider uppercase leading-none flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Leaderboards
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            How you stack up this week
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Workout of the Week */}
          {currentWow ? (
            <Card className="bg-[#14170f] border-[#23291b] relative overflow-hidden">
              <ETLWatermark
                position="top-right"
                size={24}
                className="top-4 right-4"
              />
              <CardHeader className="pr-14">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Workout of the Week
                    </p>
                    <CardTitle className="font-heading text-2xl tracking-wider text-white mt-1">
                      {currentWow.name
                        .replace(/^workout of the week\s*/i, "")
                        .trim() || currentWow.name}
                    </CardTitle>
                    <CardDescription className="text-neutral-400">
                      {wowTypeLabel}
                      {myWow ? ` · Your rank: ${myWowRank}` : ""}
                    </CardDescription>
                  </div>
                  <Trophy className="h-8 w-8 text-primary shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {sortedWow.length === 0 ? (
                  <p className="text-center text-sm text-neutral-400 py-6">
                    No scores logged yet. Be the first!
                  </p>
                ) : (
                  sortedWow.map((r, i) => (
                    <div
                      key={r.member_id || i}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-lg ${
                        r.member_id === uid
                          ? "bg-primary/15 text-white"
                          : "text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-heading text-lg text-primary w-6 shrink-0 text-center">
                          {i + 1}
                        </span>
                        <span className="truncate">
                          {r.display_name || "Member"}
                          {r.member_id === uid && " (You)"}
                        </span>
                        {r.scaled && (
                          <Badge
                            variant="outline"
                            className="text-[8px] px-1 h-4 shrink-0"
                          >
                            Scaled
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold tabular-nums shrink-0">
                        {fmtWow(r.score)}
                      </span>
                    </div>
                  ))
                )}
                <div className="pt-2">
                  <Button
                    className="w-full font-bold tracking-wide rounded-xl"
                    onClick={() => navigate("/workouts?wow=true")}
                  >
                    {myWow ? "Update Your Score" : "Log Your Score"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No Workout of the Week is active right now.
              </CardContent>
            </Card>
          )}

          {/* Block leaderboards */}
          <div>
            <h2 className="font-heading text-xl tracking-wider uppercase mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              This Week's Boards
            </h2>
            {blockBoards.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No leaderboard results logged yet this week.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {blockBoards.map((b) => {
                  const top = b.entries.slice(0, 5);
                  return (
                    <Card
                      key={b.sectionId}
                      className="bg-card border-border relative overflow-hidden"
                    >
                      <ETLWatermark
                        position="top-right"
                        size={20}
                        className="top-3 right-3"
                      />
                      <CardHeader className="pb-2 pr-12">
                        <CardTitle className="text-base font-bold">
                          {b.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {top.map((e, i) => (
                          <div
                            key={e.user_id + i}
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg ${
                              e.user_id === uid ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  i === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {i + 1}
                              </span>
                              <span className="truncate">
                                {e.member_name ||
                                  (e.user_id === uid ? "You" : "Member")}
                                {e.user_id === uid && " (You)"}
                              </span>
                            </div>
                            <span className="font-bold tabular-nums shrink-0">
                              {formatBlockScore(e)}
                            </span>
                          </div>
                        ))}
                        {b.entries.length > top.length && (
                          <button
                            onClick={() => setOpenBoard(b.sectionId)}
                            className="w-full text-center text-xs font-bold text-primary py-2"
                          >
                            View all {b.entries.length} ›
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <BlockLeaderboardDialog
        open={!!openBoard}
        onOpenChange={(v) => !v && setOpenBoard(null)}
        sectionId={openBoard}
      />
    </div>
  );
};

export default Leaderboards;
