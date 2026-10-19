import { supabase } from "./supabase";

export interface ClientFocus {
  id: string;
  client_id: string;
  week_number: number;
  body: string;
  updated_at: string;
}

/** All focus notes for a client (coach view), newest week first. */
export const getClientFocus = async (
  clientId: string,
): Promise<ClientFocus[]> => {
  const { data, error } = await supabase
    .from("acc_client_focus")
    .select("*")
    .eq("client_id", clientId)
    .order("week_number", { ascending: false });
  if (error) {
    console.warn("[clientFocus] getClientFocus:", error.message);
    return [];
  }
  return (data ?? []) as ClientFocus[];
};

/** The focus note for one week (used client-side for the current week). */
export const getFocusForWeek = async (
  clientId: string,
  week: number,
): Promise<ClientFocus | null> => {
  const { data, error } = await supabase
    .from("acc_client_focus")
    .select("*")
    .eq("client_id", clientId)
    .eq("week_number", week)
    .maybeSingle();
  if (error) {
    console.warn("[clientFocus] getFocusForWeek:", error.message);
    return null;
  }
  return (data as ClientFocus) ?? null;
};

/** Create or update the focus note for a client's week (staff only). */
export const upsertClientFocus = async (
  clientId: string,
  week: number,
  body: string,
): Promise<{ error: any }> => {
  const { error } = await supabase.from("acc_client_focus").upsert(
    {
      client_id: clientId,
      week_number: week,
      body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,week_number" },
  );
  return { error };
};

// ── One-time "new note" flag (per focus id + updated_at, local to the device) ─
// A fresh note or an edited one (new updated_at) re-flags. Cleared when the
// member clicks the flag or opens their 6-week dashboard.
const focusSeenKey = (f: ClientFocus) => `acc_focus_seen:${f.id}:${f.updated_at}`;

export const isFocusSeen = (f: ClientFocus): boolean => {
  try {
    return localStorage.getItem(focusSeenKey(f)) === "1";
  } catch {
    return false;
  }
};

export const markFocusSeen = (f: ClientFocus): void => {
  try {
    localStorage.setItem(focusSeenKey(f), "1");
  } catch {
    /* ignore */
  }
};

export const deleteClientFocus = async (
  id: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("acc_client_focus")
    .delete()
    .eq("id", id);
  return { error };
};
