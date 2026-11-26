// Christmas challenge — 12 active days (gym/24hr scan or class/PT booking) in Dec 1–24.
import { supabase } from "@/lib/supabase";

export interface MyChallenge {
  mode: "member"; enabled: boolean; title: string; prize: string; target: number;
  start: string; end: string; count: number; days: string[]; qualified: boolean;
  winnerAnnounced: string | null;
}
export interface StaffChallenge {
  mode: "staff"; enabled: boolean; title: string; prize: string; target: number; start: string; end: string;
  total: number; qualified: number;
  board: { email: string; name: string; count: number; qualified: boolean }[];
  lastDraw: { winner_name: string | null; winner_email: string | null; entrants: number; drawn_at: string } | null;
}

export async function getMyChallenge(): Promise<MyChallenge | null> {
  const { data, error } = await supabase.functions.invoke("xmas-challenge", { body: {} });
  if (error || data?.error) return null;
  return data as MyChallenge;
}
export async function getStaffChallenge(staffSecret: string): Promise<StaffChallenge | null> {
  const { data, error } = await supabase.functions.invoke("xmas-challenge", { body: { staffSecret } });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return data as StaffChallenge;
}
export async function drawRaffle(staffSecret: string, by?: string): Promise<{ winner: any }> {
  const { data, error } = await supabase.functions.invoke("xmas-challenge", { body: { staffSecret, action: "draw", by } });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  return data;
}

/** The Dec 1–24 date list for the calendar grid. */
export function challengeDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z"), last = new Date(end + "T00:00:00Z");
  while (d <= last) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}
