// Fault / equipment report centre — data layer. Staff-only CRUD over
// equipment_faults + photo upload to the equipment-faults storage bucket.
import { supabase } from "@/lib/supabase";

export type FaultSeverity = "low" | "medium" | "high" | "out_of_order";
export type FaultStatus = "open" | "in_progress" | "fixed";

export interface Fault {
  id: string;
  title: string;
  location: string | null;
  severity: FaultSeverity;
  status: FaultStatus;
  photo_url: string | null;
  notes: string | null;
  reported_by: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export const SEVERITY_LABEL: Record<FaultSeverity, string> = {
  low: "Minor",
  medium: "Needs attention",
  high: "Urgent",
  out_of_order: "Out of order",
};
export const STATUS_LABEL: Record<FaultStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
};

/** All faults, newest first. Pass includeFixed=false for just the live board. */
export async function listFaults(includeFixed = true): Promise<Fault[]> {
  let q = supabase.from("equipment_faults").select("*").order("created_at", { ascending: false });
  if (!includeFixed) q = q.neq("status", "fixed");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Fault[];
}

/** Count of unresolved faults — for the Today feed. */
export async function openFaultCount(): Promise<number> {
  const { count, error } = await supabase
    .from("equipment_faults")
    .select("id", { count: "exact", head: true })
    .neq("status", "fixed");
  if (error) return 0;
  return count ?? 0;
}

/** Upload a photo to the equipment-faults bucket, return its public URL. */
export async function uploadFaultPhoto(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("equipment-faults").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("equipment-faults").getPublicUrl(path);
  return data.publicUrl;
}

export async function createFault(input: {
  title: string;
  location?: string;
  severity: FaultSeverity;
  notes?: string;
  photo_url?: string | null;
  reported_by?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("equipment_faults").insert({
    title: input.title.trim(),
    location: input.location?.trim() || null,
    severity: input.severity,
    notes: input.notes?.trim() || null,
    photo_url: input.photo_url || null,
    reported_by: input.reported_by || null,
    status: "open",
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setFaultStatus(
  id: string,
  status: FaultStatus,
  by?: string,
): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, any> = { status, updated_at: new Date().toISOString() };
  if (status === "fixed") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = by || null;
  } else {
    patch.resolved_at = null;
    patch.resolved_by = null;
  }
  const { error } = await supabase.from("equipment_faults").update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
