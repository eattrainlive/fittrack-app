// Retention nurture — the active-member equivalent of the trial cockpit.
// Reads the member-engagement board (band + attendance + app + PT credits),
// overlays the retention_touch_log (cooldowns) and inbound replies, and works
// out the ONE touch each member is due. Sends via the same GHL pipe as trials.
import { supabase } from "@/lib/supabase";

export type TouchKey = "missed_you" | "slipping" | "celebrate" | "pt_low";

export interface Touch {
  key: TouchKey;
  label: string;
  templateKey: string; // GHL approved WhatsApp template
  cooldownDays: number;
  note: "coach" | "auto" | "none"; // coach = optional typed note; auto = pt remaining; none
  before: string;
  after: string;
  blurb: string;
}

export const TOUCHES: Record<TouchKey, Touch> = {
  missed_you: {
    key: "missed_you",
    label: "Missed you",
    templateKey: "retention_missed_you",
    cooldownDays: 14,
    note: "coach",
    before:
      "Hey {name}, we've missed you at ETL lately! Life gets busy — I just wanted to check in.",
    after:
      "Want me to help you get a session booked back in this week? Whatever's getting in the way, I'm here to help.",
    blurb: "No visits in the window — the early win-back before they drift off.",
  },
  slipping: {
    key: "slipping",
    label: "Slipping",
    templateKey: "retention_slipping",
    cooldownDays: 14,
    note: "coach",
    before: "Hey {name}, not seen you quite as much lately — everything ok?",
    after:
      "Anything I can do to help you get back into your groove? Happy to get a session booked in with you.",
    blurb: "Attendance dropping from their norm — a gentle check-in.",
  },
  celebrate: {
    key: "celebrate",
    label: "Celebrate",
    templateKey: "retention_celebrate",
    cooldownDays: 28,
    note: "none",
    before:
      "{name}, loving seeing you in so consistently — brilliant work, it really does pay off.",
    after: "Keep that momentum rolling — proud of you!",
    blurb: "Thriving / consistent attender — reinforce the habit.",
  },
  pt_low: {
    key: "pt_low",
    label: "PT credits low",
    templateKey: "retention_pt_low",
    cooldownDays: 14,
    note: "auto",
    before: "Hey {name}, quick heads up — you've got",
    after:
      "PT sessions left before they reset. Want me to get them booked in so you don't lose them? Let me know what days suit.",
    blurb: "PT allowance running low near reset — book before it expires.",
  },
};

export const WAITING_DAYS = 3;
const MS_DAY = 86400000;
const norm = (e?: string | null) => String(e || "").toLowerCase().trim();

export interface RetentionMember {
  email: string;
  name: string;
  user_id: string | null;
  membership: string | null;
  band: "thriving" | "steady" | "slipping" | "at-risk";
  attendance: { visits: number; perWeek: number; lastVisitDays: number | null };
  app_status: "on_app" | "invited_not_joined" | "not_invited";
  pt_credits: { allowance: number; used: number; remaining: number; resetDays: number } | null;
  flags: string[];
  dueTouch: TouchKey | null;
  awaitingReply: boolean;
  lastTouchAt: string | null;
}

/** Which touch (if any) a member qualifies for — priority order. */
function candidateTouch(m: any): TouchKey | null {
  if (m.band === "at-risk") return "missed_you";
  if (m.band === "slipping") return "slipping";
  if (m.pt_credits && m.pt_credits.remaining <= 2 && m.pt_credits.resetDays <= 10)
    return "pt_low";
  if (m.band === "thriving") return "celebrate";
  return null; // steady members are fine — no nudge
}

/** Fill {name} and, for pt_low, the remaining count into the preview. */
export function renderTouch(touch: Touch, m: RetentionMember, note: string): string {
  const name = (m.name || "there").split(" ")[0];
  const before = touch.before.replace(/\{name\}/g, name);
  const after = touch.after.replace(/\{name\}/g, name);
  const mid =
    touch.note === "auto"
      ? String(m.pt_credits?.remaining ?? "")
      : touch.note === "coach"
        ? note.trim()
        : "";
  return [before, mid, after].filter(Boolean).join(" ");
}

export async function getRetentionBoard(
  staffSecret: string,
  days = 30,
): Promise<{ members: RetentionMember[] }> {
  const { data, error } = await supabase.functions.invoke("member-engagement", {
    body: { staffSecret, days },
  });
  if (error || data?.error) throw new Error(error?.message || data?.error);
  const raw = (data?.members ?? []) as any[];

  // Touch history (cooldowns) + reply detection.
  const [{ data: logs }, { data: inbound }] = await Promise.all([
    supabase.from("retention_touch_log").select("email, touch_key, sent_at"),
    supabase.from("member_messages").select("email, occurred_at").eq("direction", "in"),
  ]);
  const perKey: Record<string, Record<string, number>> = {};
  const lastAny: Record<string, number> = {};
  for (const l of logs ?? []) {
    const e = norm(l.email);
    const t = Date.parse(l.sent_at);
    if (isNaN(t)) continue;
    (perKey[e] ??= {})[l.touch_key] = Math.max(perKey[e][l.touch_key] || 0, t);
    lastAny[e] = Math.max(lastAny[e] || 0, t);
  }
  const lastInbound: Record<string, number> = {};
  for (const m of inbound ?? []) {
    const e = norm(m.email);
    const t = Date.parse(m.occurred_at);
    if (!isNaN(t)) lastInbound[e] = Math.max(lastInbound[e] || 0, t);
  }

  const now = Date.now();
  const members: RetentionMember[] = raw.map((m) => {
    const e = norm(m.email);
    const lastAnyMs = lastAny[e] || 0;
    const repliedSince = (lastInbound[e] || 0) > lastAnyMs;
    const awaitingReply =
      lastAnyMs > 0 && now - lastAnyMs < WAITING_DAYS * MS_DAY && !repliedSince;

    const cand = candidateTouch(m);
    let dueTouch: TouchKey | null = null;
    if (cand && !awaitingReply) {
      const last = perKey[e]?.[cand] || 0;
      if (now - last >= TOUCHES[cand].cooldownDays * MS_DAY) dueTouch = cand;
    }
    return {
      email: m.email,
      name: m.full_name || m.email,
      user_id: m.user_id ?? null,
      membership: m.membership ?? null,
      band: m.band,
      attendance: m.attendance,
      app_status: m.app_status,
      pt_credits: m.pt_credits ?? null,
      flags: m.flags ?? [],
      dueTouch,
      awaitingReply,
      lastTouchAt: lastAnyMs ? new Date(lastAnyMs).toISOString() : null,
    };
  });
  return { members };
}

/** Send a retention touch: fires the GHL template (shared trial-nurture pipe) and logs it. */
export async function sendTouch(
  m: RetentionMember,
  touchKey: TouchKey,
  note: string,
  by: string,
): Promise<{ ok: boolean; error?: string }> {
  const touch = TOUCHES[touchKey];
  const messageBody = renderTouch(touch, m, note);
  // For pt_low the {{2}} variable is the remaining count; for coach touches it's the note.
  const coachNote =
    touch.note === "auto" ? String(m.pt_credits?.remaining ?? "") : note.trim();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/.netlify/functions/trial-nurture", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: m.email,
        name: m.name,
        step_key: touchKey,
        template_key: touch.templateKey,
        coach_note: coachNote,
        message_body: messageBody,
        by,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false)
      return { ok: false, error: data?.error || `send failed (${res.status})` };

    await supabase.from("retention_touch_log").insert({
      email: m.email,
      touch_key: touchKey,
      template_key: touch.templateKey,
      note: coachNote || null,
      sent_by: by,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}
