import { supabase } from "./supabase";

export interface AccWeekResource {
  title: string;
  url: string;
}

export interface AccWeekContent {
  week_number: number;
  title: string;
  theme: string;
  habit: string;
  teaching: string;
  video_url: string;
  resources: AccWeekResource[];
  updated_at?: string;
}

/** Load all week-content rows (0..6). */
export const getAllWeekContent = async (): Promise<AccWeekContent[]> => {
  try {
    const { data } = await supabase
      .from("acc_week_content")
      .select("*")
      .order("week_number", { ascending: true });
    return (data as AccWeekContent[]) ?? [];
  } catch (e) {
    console.warn("getAllWeekContent failed", e);
    return [];
  }
};

/** Load a single week's content. */
export const getWeekContent = async (
  weekNumber: number,
): Promise<AccWeekContent | null> => {
  try {
    const { data } = await supabase
      .from("acc_week_content")
      .select("*")
      .eq("week_number", weekNumber)
      .maybeSingle();
    return (data as AccWeekContent) ?? null;
  } catch (e) {
    console.warn("getWeekContent failed", e);
    return null;
  }
};

/** Staff: update a week's content. */
export const updateWeekContent = async (
  weekNumber: number,
  patch: Partial<AccWeekContent>,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_week_content")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("week_number", weekNumber);
  return { error };
};

/**
 * Convert a Loom / YouTube / Vimeo URL into an embeddable iframe src.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube shorts, loom.com/share/, vimeo.com/<id>/<hash>.
 */
export const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const u = url.trim();
  try {
    // YouTube watch link
    let m = u.match(
      /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    );
    if (m) return `https://www.youtube.com/embed/${m[1]}`;

    // YouTube Shorts
    m = u.match(/youtube\.com\/shorts\/([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;

    // YouTube embed (already)
    if (/youtube\.com\/embed\//.test(u)) return u;

    // Loom
    m = u.match(/loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/);
    if (m) return `https://www.loom.com/embed/${m[1]}`;

    // Already a player.vimeo.com embed URL — use as-is (preserves ?h= unlisted hash)
    if (/player\.vimeo\.com\/video\//.test(u)) return u;

    // Vimeo — supports unlisted videos with a hash: vimeo.com/<id>/<hash>
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
    if (m)
      return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;

    // Fallback: return as-is (may still work in an iframe)
    return u;
  } catch {
    return null;
  }
};
