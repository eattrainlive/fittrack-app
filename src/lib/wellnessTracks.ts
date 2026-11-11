// "Listen & Let Go" audio tracks (sound baths now; wider wellness hub later).
// See supabase/sql/wellness_tracks_setup.sql.
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authUser";

export interface WellnessTrack {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_label: string | null;
  sort_order: number;
  published: boolean;
  created_at?: string;
}

const norm = (r: any): WellnessTrack => ({
  id: r.id,
  title: r.title,
  description: r.description ?? null,
  audio_url: r.audio_url,
  duration_label: r.duration_label ?? null,
  sort_order: r.sort_order ?? 0,
  published: !!r.published,
  created_at: r.created_at,
});

/** Published tracks for members (staff also see unpublished via listAllTracks). */
export const listTracks = async (): Promise<WellnessTrack[]> => {
  const { data, error } = await supabase
    .from("wellness_tracks")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("listTracks", error);
    return [];
  }
  return (data || []).map(norm);
};

export const listAllTracks = async (): Promise<WellnessTrack[]> => {
  const { data, error } = await supabase
    .from("wellness_tracks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data || []).map(norm);
};

export const saveTrack = async (
  t: Partial<WellnessTrack> & { title: string; audio_url: string },
): Promise<{ success: boolean; error?: any }> => {
  const {
    data: { user },
  } = await getCurrentUser();
  const row: any = {
    title: t.title.trim(),
    description: t.description?.trim() || null,
    audio_url: t.audio_url.trim(),
    duration_label: t.duration_label?.trim() || null,
    sort_order: t.sort_order ?? 0,
    published: t.published ?? true,
    updated_at: new Date().toISOString(),
  };
  if (t.id) row.id = t.id;
  else row.created_by = user?.id ?? null;
  const { error } = await supabase.from("wellness_tracks").upsert(row);
  return { success: !error, error };
};

export const deleteTrack = async (id: string) => {
  const { error } = await supabase.from("wellness_tracks").delete().eq("id", id);
  return { success: !error, error };
};

/** Upload an audio file to the wellness-audio bucket, returns its public URL.
 *  Tip: compress to ~128kbps MP3 first — keeps files small and streaming fast. */
export const uploadAudio = async (
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> => {
  // 200MB hard cap (matches the bucket). Encourage compression well below this.
  if (file.size > 200 * 1024 * 1024)
    throw new Error("File too large — compress to MP3 (~128kbps) first.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const path = `tracks/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  onProgress?.(10);
  const { error } = await supabase.storage
    .from("wellness-audio")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  onProgress?.(100);
  const { data } = supabase.storage.from("wellness-audio").getPublicUrl(path);
  return data.publicUrl;
};
