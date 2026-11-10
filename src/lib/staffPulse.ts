// Staff Hub — read-only "pulse": who's in today, milestones to celebrate, and
// upcoming anniversaries. Thin wrapper over the staff-pulse edge function.
import { supabase } from "@/lib/supabase";

export interface WhosInRow {
  name: string;
  membership: string | null;
  at: string;
}
export interface Milestone {
  type: "pb" | "join" | "streak";
  name: string;
  detail: string;
  at: string;
}
export interface Anniversary {
  name: string;
  years: number;
  date: string;
  inDays: number;
}
export interface Pulse {
  whosIn: WhosInRow[];
  milestones: Milestone[];
  anniversaries: Anniversary[];
}

export async function getPulse(staffSecret: string): Promise<Pulse> {
  const { data, error } = await supabase.functions.invoke("staff-pulse", { body: { staffSecret } });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return {
    whosIn: data?.whosIn ?? [],
    milestones: data?.milestones ?? [],
    anniversaries: data?.anniversaries ?? [],
  };
}
