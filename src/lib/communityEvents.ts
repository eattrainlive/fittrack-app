import { supabase } from "./supabase";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

/** Upload an event image to the shared community-images bucket, return the public URL. */
export const uploadEventImage = async (file: File): Promise<string | null> => {
  try {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("Image must be under 2MB");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("community-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;
    const { data } = supabase.storage
      .from("community-images")
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[communityEvents] uploadEventImage:", e);
    throw e;
  }
};

export interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_at: string;
  ends_at: string | null;
  location: string | null;
  link: string | null;
  image_url: string | null;
  published: boolean;
  created_at?: string;
}

export const isStaff = (): boolean =>
  localStorage.getItem("fittrack_is_staff") === "true";

/** Published upcoming events (members). */
export const getUpcomingEvents = async (): Promise<CommunityEvent[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .eq("published", true)
      .gte("event_at", now)
      .order("event_at", { ascending: true });
    if (error) throw error;
    return (data as CommunityEvent[]) || [];
  } catch (e) {
    console.warn("[communityEvents] getUpcomingEvents:", e);
    return [];
  }
};

/** All events (staff) — includes drafts and past, soonest first. */
export const getAllEvents = async (): Promise<CommunityEvent[]> => {
  try {
    const { data, error } = await supabase
      .from("community_events")
      .select("*")
      .order("event_at", { ascending: true });
    if (error) throw error;
    return (data as CommunityEvent[]) || [];
  } catch (e) {
    console.warn("[communityEvents] getAllEvents:", e);
    return [];
  }
};

export const saveEvent = async (
  ev: Partial<CommunityEvent> & { title: string; event_at: string },
): Promise<boolean> => {
  try {
    const payload = {
      title: ev.title,
      description: ev.description ?? null,
      event_at: ev.event_at,
      ends_at: ev.ends_at ?? null,
      location: ev.location ?? null,
      link: ev.link ?? null,
      image_url: ev.image_url ?? null,
      published: ev.published ?? true,
    };
    if (ev.id) {
      const { error } = await supabase
        .from("community_events")
        .update(payload)
        .eq("id", ev.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("community_events").insert(payload);
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn("[communityEvents] saveEvent:", e);
    return false;
  }
};

export const deleteEvent = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_events")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityEvents] deleteEvent:", e);
    return false;
  }
};
