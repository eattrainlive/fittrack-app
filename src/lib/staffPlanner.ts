// Staff Hub — Planner data layer. Recurring reminders (with roll-forward on
// completion) + a content scheduler. Staff-only.
import { supabase } from "@/lib/supabase";

// ── Coaches (for assignment dropdown) ────────────────────────────────────────
export interface Coach {
  user_id: string;
  name: string;
}

/** Staff/coaches with display names, for the "assign to" picker. */
export async function listCoaches(): Promise<Coach[]> {
  const { data: staffRows } = await supabase.from("staff_users").select("user_id");
  const ids = (staffRows ?? []).map((s: any) => s.user_id);
  if (!ids.length) return [];
  const { data: memberRows } = await supabase
    .from("members")
    .select("id, email, full_name")
    .in("id", ids);
  const byId = new Map<string, any>((memberRows ?? []).map((m: any) => [m.id, m]));
  return ids
    .map((id: string) => {
      const m = byId.get(id);
      const name = m?.full_name || m?.email?.split("@")[0] || "Coach";
      return { user_id: id, name };
    })
    .sort((a: Coach, b: Coach) => a.name.localeCompare(b.name));
}

// ── Reminders ────────────────────────────────────────────────────────────────
export type Repeat = "none" | "daily" | "weekly" | "monthly";

export interface Reminder {
  id: string;
  title: string;
  detail: string | null;
  assigned_to: string | null;
  due_date: string; // YYYY-MM-DD
  repeat: Repeat;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  created_by: string | null;
  created_at: string;
}

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: "One-off",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Next due date for a recurring reminder, from a YYYY-MM-DD base. */
function nextDue(base: string, repeat: Repeat): string {
  const d = new Date(base + "T00:00:00Z");
  if (repeat === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else if (repeat === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (repeat === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function listReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("staff_reminders")
    .select("*")
    .order("done", { ascending: true })
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Reminder[];
}

/** Reminders due today or overdue and not done — for the Today feed. */
export async function dueReminderCount(): Promise<number> {
  const { count, error } = await supabase
    .from("staff_reminders")
    .select("id", { count: "exact", head: true })
    .eq("done", false)
    .lte("due_date", todayStr());
  if (error) return 0;
  return count ?? 0;
}

export async function createReminder(input: {
  title: string;
  detail?: string;
  assigned_to?: string;
  due_date: string;
  repeat: Repeat;
  created_by?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("staff_reminders").insert({
    title: input.title.trim(),
    detail: input.detail?.trim() || null,
    assigned_to: input.assigned_to?.trim() || null,
    due_date: input.due_date,
    repeat: input.repeat,
    created_by: input.created_by || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Tick a reminder done. A one-off is simply marked done; a recurring one rolls
 * forward to its next due date and resets so it reappears next cycle.
 */
export async function completeReminder(
  r: Reminder,
  by?: string,
): Promise<{ ok: boolean; error?: string }> {
  const patch =
    r.repeat === "none"
      ? { done: true, done_at: new Date().toISOString(), done_by: by || null }
      : {
          done: false,
          done_at: new Date().toISOString(),
          done_by: by || null,
          due_date: nextDue(r.due_date < todayStr() ? todayStr() : r.due_date, r.repeat),
        };
  const { error } = await supabase.from("staff_reminders").update(patch).eq("id", r.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function reopenReminder(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("staff_reminders")
    .update({ done: false, done_at: null, done_by: null })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteReminder(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("staff_reminders").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Calendar expansion ───────────────────────────────────────────────────────
// Project reminders (incl. every recurrence) + content posts onto calendar days
// within [startStr, endStr] inclusive (YYYY-MM-DD). Returns a map keyed by date.
export interface CalItem {
  key: string;
  kind: "reminder" | "post";
  date: string;
  title: string;
  recurring: boolean;
  live: boolean; // the actionable stored instance (vs a projected recurrence)
  reminder?: Reminder;
  post?: ContentPost;
}

function stepDate(base: string, repeat: Repeat, dir: 1 | -1): string {
  const d = new Date(base + "T00:00:00Z");
  if (repeat === "daily") d.setUTCDate(d.getUTCDate() + dir);
  else if (repeat === "weekly") d.setUTCDate(d.getUTCDate() + 7 * dir);
  else if (repeat === "monthly") d.setUTCMonth(d.getUTCMonth() + dir);
  return d.toISOString().slice(0, 10);
}

export function buildCalendar(
  reminders: Reminder[],
  posts: ContentPost[],
  startStr: string,
  endStr: string,
): Record<string, CalItem[]> {
  const map: Record<string, CalItem[]> = {};
  const push = (date: string, item: CalItem) => {
    if (date < startStr || date > endStr) return;
    (map[date] ??= []).push(item);
  };

  for (const r of reminders) {
    if (r.repeat === "none") {
      push(r.due_date, {
        key: `r-${r.id}`,
        kind: "reminder",
        date: r.due_date,
        title: r.title,
        recurring: false,
        live: true,
        reminder: r,
      });
      continue;
    }
    // Recurring: project from the stored due_date backward + forward across range.
    const anchor = r.due_date;
    // forward (and the anchor itself)
    let cur = anchor;
    for (let i = 0; i < 400 && cur <= endStr; i++) {
      push(cur, {
        key: `r-${r.id}-${cur}`,
        kind: "reminder",
        date: cur,
        title: r.title,
        recurring: true,
        live: cur === anchor,
        reminder: r,
      });
      cur = stepDate(cur, r.repeat, 1);
    }
    // backward
    cur = stepDate(anchor, r.repeat, -1);
    for (let i = 0; i < 400 && cur >= startStr; i++) {
      push(cur, {
        key: `r-${r.id}-${cur}`,
        kind: "reminder",
        date: cur,
        title: r.title,
        recurring: true,
        live: false,
        reminder: r,
      });
      cur = stepDate(cur, r.repeat, -1);
    }
  }

  for (const p of posts) {
    push(p.scheduled_for, {
      key: `p-${p.id}`,
      kind: "post",
      date: p.scheduled_for,
      title: p.caption.slice(0, 40),
      recurring: false,
      live: p.status !== "posted",
      post: p,
    });
  }

  for (const d of Object.keys(map)) map[d].sort((a, b) => (a.kind < b.kind ? -1 : 1));
  return map;
}

// ── Content scheduler ────────────────────────────────────────────────────────
export type Destination = "private" | "stories" | "main";
export type PostStatus = "draft" | "scheduled" | "posted";

export interface ContentPost {
  id: string;
  caption: string;
  destination: Destination;
  media_url: string | null;
  scheduled_for: string; // YYYY-MM-DD
  status: PostStatus;
  notes: string | null;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
}

export const DESTINATION_LABEL: Record<Destination, string> = {
  private: "Private client page",
  stories: "Stories",
  main: "Main page",
};

export async function listPosts(): Promise<ContentPost[]> {
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .order("scheduled_for", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContentPost[];
}

/** Posts due to go out today or earlier and not yet posted — for the Today feed. */
export async function duePostCount(): Promise<number> {
  const { count, error } = await supabase
    .from("content_posts")
    .select("id", { count: "exact", head: true })
    .neq("status", "posted")
    .lte("scheduled_for", todayStr());
  if (error) return 0;
  return count ?? 0;
}

export async function uploadContentMedia(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("content-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("content-media").getPublicUrl(path).data.publicUrl;
}

export async function createPost(input: {
  caption: string;
  destination: Destination;
  scheduled_for: string;
  media_url?: string | null;
  notes?: string;
  status?: PostStatus;
  created_by?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("content_posts").insert({
    caption: input.caption.trim(),
    destination: input.destination,
    scheduled_for: input.scheduled_for,
    media_url: input.media_url || null,
    notes: input.notes?.trim() || null,
    status: input.status || "scheduled",
    created_by: input.created_by || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markPosted(
  id: string,
  by?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("content_posts")
    .update({ status: "posted", posted_at: new Date().toISOString(), posted_by: by || null })
    .eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── AI content idea generator ────────────────────────────────────────────────
export interface ContentIdeas {
  captions: string[];
  stories: string[];
  angles: string[];
}

export async function generateIdeas(
  staffSecret: string,
  input: { topic: string; destination?: Destination; tone?: string; extra?: string },
): Promise<{ ok: boolean; ideas?: ContentIdeas; error?: string }> {
  const { data, error } = await supabase.functions.invoke("content-ideas", {
    body: { staffSecret, ...input },
  });
  if (error || data?.error) return { ok: false, error: error?.message || data?.error };
  return {
    ok: true,
    ideas: {
      captions: data?.captions ?? [],
      stories: data?.stories ?? [],
      angles: data?.angles ?? [],
    },
  };
}
