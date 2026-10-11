import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * Tracks which lesson videos a member has marked as watched for a given week.
 * Keys are the video URL (the main weekly video_url and each resource url).
 * Persists to acc_video_progress (member-scoped, RLS-guarded). Soft-fails
 * when the table/user isn't available (e.g. preview without a session).
 */
export function useVideoProgress(weekNumber?: number) {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("acc_video_progress")
        .select("video_url")
        .eq("member_id", user.id)
        .eq("week_number", weekNumber ?? 0)
        .eq("watched", true);
      setWatched(new Set((data ?? []).map((r: any) => r.video_url)));
    } catch {
      // table may not exist yet — soft-fail
    } finally {
      setLoading(false);
    }
  }, [weekNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (url: string) => {
      if (!url) return;
      const isWatched = watched.has(url);
      // Optimistic update
      setWatched((prev) => {
        const next = new Set(prev);
        if (isWatched) next.delete(url);
        else next.add(url);
        return next;
      });
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        if (isWatched) {
          await supabase
            .from("acc_video_progress")
            .delete()
            .eq("member_id", user.id)
            .eq("week_number", weekNumber ?? 0)
            .eq("video_url", url);
        } else {
          await supabase.from("acc_video_progress").upsert(
            {
              member_id: user.id,
              week_number: weekNumber ?? 0,
              video_url: url,
              watched: true,
              watched_at: new Date().toISOString(),
            },
            { onConflict: "member_id,week_number,video_url" },
          );
        }
      } catch {
        // Roll back on failure
        load();
      }
    },
    [watched, weekNumber, load],
  );

  return { watched, loading, toggle };
}
