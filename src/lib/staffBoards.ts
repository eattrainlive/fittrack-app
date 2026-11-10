// Staff Hub — boards data layer: announcements, supplies (low-stock) and daily
// checklists. All staff-only, team-wide.
import { supabase } from "@/lib/supabase";

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Announcements ────────────────────────────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  created_by: string | null;
  created_at: string;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("staff_announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function createAnnouncement(input: {
  title: string;
  body?: string;
  pinned?: boolean;
  created_by?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("staff_announcements").insert({
    title: input.title.trim(),
    body: input.body?.trim() || null,
    pinned: !!input.pinned,
    created_by: input.created_by || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function togglePin(id: string, pinned: boolean) {
  await supabase.from("staff_announcements").update({ pinned }).eq("id", id);
}
export async function deleteAnnouncement(id: string) {
  await supabase.from("staff_announcements").delete().eq("id", id);
}

// ── Supplies / low-stock ─────────────────────────────────────────────────────
export type StockStatus = "ok" | "low" | "out";
export interface Supply {
  id: string;
  name: string;
  category: string | null;
  status: StockStatus;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}
export const STOCK_LABEL: Record<StockStatus, string> = { ok: "In stock", low: "Low", out: "Out" };

export async function listSupplies(): Promise<Supply[]> {
  const { data, error } = await supabase.from("staff_supplies").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Supply[];
}
export async function lowStockCount(): Promise<number> {
  const { count } = await supabase
    .from("staff_supplies")
    .select("id", { count: "exact", head: true })
    .neq("status", "ok");
  return count ?? 0;
}
export async function createSupply(input: { name: string; category?: string; status?: StockStatus; by?: string }) {
  const { error } = await supabase.from("staff_supplies").insert({
    name: input.name.trim(),
    category: input.category?.trim() || null,
    status: input.status || "ok",
    updated_by: input.by || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function setSupplyStatus(id: string, status: StockStatus, by?: string) {
  await supabase
    .from("staff_supplies")
    .update({ status, updated_by: by || null, updated_at: new Date().toISOString() })
    .eq("id", id);
}
export async function deleteSupply(id: string) {
  await supabase.from("staff_supplies").delete().eq("id", id);
}

// ── Daily checklists ─────────────────────────────────────────────────────────
export type ChecklistSection = "opening" | "closing" | "cleaning" | "general";
export interface ChecklistItem {
  id: string;
  title: string;
  section: ChecklistSection;
  sort_order: number;
  active: boolean;
}
export interface ChecklistState extends ChecklistItem {
  doneToday: boolean;
  doneBy: string | null;
  logId: string | null;
}
export const SECTION_LABEL: Record<ChecklistSection, string> = {
  opening: "Opening",
  closing: "Closing",
  cleaning: "Cleaning",
  general: "General",
};

/** Templates + today's completion state, merged. */
export async function getChecklists(): Promise<ChecklistState[]> {
  const [{ data: items, error: e1 }, { data: logs, error: e2 }] = await Promise.all([
    supabase.from("checklist_templates").select("*").eq("active", true).order("section").order("sort_order"),
    supabase.from("checklist_log").select("id, template_id, done_by").eq("done_date", todayStr()),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const logByItem: Record<string, any> = {};
  for (const l of logs ?? []) logByItem[String(l.template_id)] = l;
  return (items ?? []).map((it: any) => {
    const log = logByItem[String(it.id)];
    return { ...it, doneToday: !!log, doneBy: log?.done_by ?? null, logId: log?.id ?? null } as ChecklistState;
  });
}

export async function tickChecklist(templateId: string, by?: string) {
  const { error } = await supabase
    .from("checklist_log")
    .insert({ template_id: templateId, done_date: todayStr(), done_by: by || null });
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function untickChecklist(logId: string) {
  await supabase.from("checklist_log").delete().eq("id", logId);
}

export async function addChecklistItem(input: { title: string; section: ChecklistSection; sort_order?: number }) {
  const { error } = await supabase.from("checklist_templates").insert({
    title: input.title.trim(),
    section: input.section,
    sort_order: input.sort_order ?? 0,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function removeChecklistItem(id: string) {
  await supabase.from("checklist_templates").update({ active: false }).eq("id", id);
}

/** Count of today's not-yet-done checklist items — for the Today feed. */
export async function pendingChecklistCount(): Promise<number> {
  const items = await getChecklists().catch(() => [] as ChecklistState[]);
  return items.filter((i) => !i.doneToday).length;
}
