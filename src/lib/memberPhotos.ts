import { supabase } from "./supabase";
import { logError } from "./errorLog";

export interface MemberPhoto {
  id: string | number;
  url: string;
  created_at?: string | null;
  is_baseline?: boolean;
  phase?: string | null;
}

// Load the member's OWN progress photos directly from member_photos so every
// object carries the real DB row `id` (needed for deletes). RLS allows owners
// to read their own rows.
export const getMyPhotos = async (): Promise<MemberPhoto[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  try {
    const { data } = await supabase
      .from("member_photos")
      .select("id, url, created_at, is_baseline, phase")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });
    return (data || []) as MemberPhoto[];
  } catch {
    return [];
  }
};

// Delete a progress photo. Guarded: never sends id=undefined (which caused the
// 22P02 invalid input syntax for type bigint error).
export const deleteMemberPhoto = async (
  photo: any,
): Promise<{ success: boolean; error?: any }> => {
  if (!photo?.id) return { success: false, error: "no photo id" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not signed in" };
  // remove the DB row (by id), scoped to the owner
  const { error } = await supabase
    .from("member_photos")
    .delete()
    .eq("id", photo.id)
    .eq("member_id", user.id);
  // also remove the file from the media bucket (best-effort)
  try {
    const marker = "/object/public/media/";
    const i = String(photo.url || "").indexOf(marker);
    if (i !== -1)
      await supabase.storage
        .from("media")
        .remove([decodeURIComponent(photo.url.slice(i + marker.length))]);
  } catch (_) {}
  if (error) logError("deleteMemberPhoto", "member_photos", error);
  return { success: !error, error };
};
