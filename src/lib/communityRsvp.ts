import { supabase } from "./supabase";

export type RsvpStatus = "attending" | "interested" | "not_attending";

export interface RsvpAggregate {
  attending: number;
  interested: number;
  not_attending: number;
  mine: RsvpStatus | null;
}

export interface RsvpName {
  user_id: string;
  full_name: string;
  status: RsvpStatus;
}

/** Load RSVP aggregates + the current user's choice for a list of events. */
export const getRsvpAggregates = async (
  eventIds: string[],
  userId: string,
): Promise<Record<string, RsvpAggregate>> => {
  const out: Record<string, RsvpAggregate> = {};
  if (!eventIds.length) return out;
  try {
    const { data, error } = await supabase
      .from("community_event_rsvps")
      .select("event_id, user_id, status")
      .in("event_id", eventIds);
    if (error) throw error;
    for (const r of data || []) {
      const a = out[r.event_id] || {
        attending: 0,
        interested: 0,
        not_attending: 0,
        mine: null,
      };
      if (r.status === "attending") a.attending++;
      else if (r.status === "interested") a.interested++;
      else if (r.status === "not_attending") a.not_attending++;
      if (r.user_id === userId) a.mine = r.status as RsvpStatus;
      out[r.event_id] = a;
    }
  } catch (e) {
    console.warn("[communityRsvp] getRsvpAggregates:", e);
  }
  return out;
};

/** Upsert (or clear) the current user's RSVP for an event. */
export const setRsvp = async (
  eventId: string,
  status: RsvpStatus,
  current: RsvpStatus | null,
): Promise<boolean> => {
  try {
    // Tapping the active choice again clears it (delete their row).
    if (current === status) {
      const { error } = await supabase
        .from("community_event_rsvps")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", (await getMyId()) ?? "");
      if (error) throw error;
      return true;
    }
    const { error } = await supabase
      .from("community_event_rsvps")
      .upsert(
        { event_id: eventId, status },
        { onConflict: "event_id,user_id" },
      );
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityRsvp] setRsvp:", e);
    return false;
  }
};

/** Staff: list names per status bucket for an event. */
export const getRsvpNames = async (eventId: string): Promise<RsvpName[]> => {
  try {
    const { data, error } = await supabase
      .from("community_event_rsvps")
      .select("user_id, status")
      .eq("event_id", eventId);
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const ids = [...new Set(data.map((r: any) => r.user_id))];
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .in("id", ids);
    const nameMap = new Map<string, string>();
    for (const m of members || [])
      nameMap.set(String(m.id), m.full_name || "Member");

    return data.map((r: any) => ({
      user_id: r.user_id,
      full_name: nameMap.get(String(r.user_id)) || "Member",
      status: r.status as RsvpStatus,
    }));
  } catch (e) {
    console.warn("[communityRsvp] getRsvpNames:", e);
    return [];
  }
};

const getMyId = async (): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};
