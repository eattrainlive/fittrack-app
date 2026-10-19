import { supabase } from "./supabase";

export type CoachNoteKind = "onboarding" | "checkin" | "general";

export interface CoachNote {
  id: string;
  client_id: string;
  coach_user_id: string | null;
  kind: CoachNoteKind;
  week_number: number | null;
  body: string;
  created_at: string;
}

export const COACH_NOTE_KINDS: { key: CoachNoteKind; label: string }[] = [
  { key: "onboarding", label: "Onboarding" },
  { key: "checkin", label: "Check-in" },
  { key: "general", label: "General" },
];

/** All coach notes for a client, newest first. */
export const getCoachNotes = async (
  clientId: string,
): Promise<CoachNote[]> => {
  const { data, error } = await supabase
    .from("acc_coach_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[coachNotes] getCoachNotes:", error.message);
    return [];
  }
  return (data ?? []) as CoachNote[];
};

/** Add a coach note. coach_user_id defaults to auth.uid() in the DB. */
export const addCoachNote = async (payload: {
  clientId: string;
  kind: CoachNoteKind;
  body: string;
  weekNumber?: number | null;
}): Promise<{ error: any }> => {
  const { error } = await supabase.from("acc_coach_notes").insert({
    client_id: payload.clientId,
    kind: payload.kind,
    body: payload.body,
    week_number: payload.weekNumber ?? null,
  });
  return { error };
};

export const deleteCoachNote = async (
  id: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_coach_notes")
    .delete()
    .eq("id", id);
  return { error };
};
