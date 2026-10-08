// Supabase Edge Function: progress-summary
// Single source of truth for the progress pack. Computes a member's progress summary over a
// date window from all the owner-scoped tables (via service role), for:
//   - the MEMBER themselves (auth: their JWT; can only request their own data), and
//   - STAFF/Carla (auth: staffSecret; can request any member) — the coach review view.
//
// Deploy:
//   supabase functions deploy progress-summary          (keep JWT verification ON)
//   Reuses the existing STAFF_SECRET (same one manage-members uses) — no new secret needed.
//
// Request body: { start: "YYYY-MM-DD", end: "YYYY-MM-DD", memberType?: string,
//                 staffSecret?: string, memberUserId?: string, memberEmail?: string }
//   Self call: omit staffSecret — the caller's JWT identifies the member.
//   Staff call: include staffSecret + memberUserId + memberEmail.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    // Window: use what's passed, else default to a rolling 30-day month (used by the member
    // activity card, which sends no dates). Trial card still passes its own trial window.
    const end = String(body.end || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const start = String(body.start || "").slice(0, 10)
      || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const isStaff = STAFF_SECRET && body.staffSecret === STAFF_SECRET;
    const wantsOtherMember = !!(body.memberUserId || body.memberEmail);

    // SAFETY: a request for another member (has memberUserId/memberEmail) MUST present a valid staff
    // secret. Never fall back to self-mode for it — that would return the caller's own data mislabelled
    // as the requested member (e.g. the coach's data showing under a trialist's panel).
    if (wantsOtherMember && !isStaff) {
      return json({ error: "staff secret required for member lookups" }, 403);
    }

    let userId: string | null = null;
    let email: string | null = null;

    if (isStaff) {
      userId = body.memberUserId ? String(body.memberUserId) : null;
      email = body.memberEmail ? String(body.memberEmail).trim().toLowerCase() : null;
    } else {
      // Self call — resolve the caller from their JWT.
      const auth = req.headers.get("Authorization") ?? "";
      const token = auth.replace(/^Bearer\s+/i, "");
      const anon = createClient(SUPABASE_URL, ANON_KEY);
      const { data: { user } } = await anon.auth.getUser(token);
      if (!user) return json({ error: "unauthorized" }, 401);
      userId = user.id;
      email = (user.email ?? "").toLowerCase() || null;
    }
    if (!userId && !email) return json({ error: "no member resolved" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);
    const summary = await computeSummary(db, { userId, email, start, end, memberType: body.memberType ?? null });
    return json(summary, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Inclusive-of-day range helpers (window is [start 00:00, end 23:59:59]).
const startTs = (d: string) => `${d}T00:00:00`;
const endTs = (d: string) => `${d}T23:59:59`;
const dayOf = (v: any) => String(v || "").slice(0, 10);

// Normalise email so gmail/googlemail/+tags line up (for resolving the roster row).
function normEmail(e: any): string {
  const s = String(e ?? "").trim().toLowerCase();
  const at = s.indexOf("@"); if (at < 0) return s;
  let local = s.slice(0, at), dom = s.slice(at + 1);
  local = local.split("+")[0];
  if (dom === "googlemail.com") dom = "gmail.com";
  if (dom === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${dom}`;
}

async function computeSummary(db: any, p: { userId: string | null; email: string | null; start: string; end: string; memberType: string | null }) {
  let userId = p.userId;
  const { email, start, end } = p;
  const out: any = { window: { start, end }, memberType: p.memberType };

  // Resolve the member's APP-ACCOUNT user_id from their EMAIL. Email is the reliable key when a coach
  // opens a review (trial board / members grid), so it is AUTHORITATIVE: if we find a members row for
  // this email, use its id even if a (possibly wrong) memberUserId was passed in. Without the right
  // id, every by-user_id section below (workouts, habits, goals, PBs, photos, nutrition) reads 0.
  if (email) {
    try {
      const { data: mem } = await db.from("members").select("id, email");
      const target = normEmail(email);
      const hit = (mem ?? []).find((m: any) => normEmail(m.email) === target)?.id ?? null;
      if (hit) userId = hit;   // override any incorrect id passed by the caller
    } catch (_) { /* keep whatever userId we had */ }
  }
  out.appUserId = userId;   // handy for the client / debugging (confirms who we resolved)

  // ── Bookings (by email) — coached PT vs classes, cancelled excluded ──────────
  try {
    if (email) {
      const { data } = await db.from("member_bookings").select("session_type, session_at, status")
        .eq("email", email).gte("session_at", startTs(start)).lte("session_at", endTs(end));
      const live = (data ?? []).filter((b: any) => b.status !== "cancelled");
      const isCoached = (t: any) => /semi private pt/i.test(String(t || ""));
      const now = new Date().toISOString();
      out.coachedUsed = live.filter((b: any) => isCoached(b.session_type) && b.session_at <= now).length;
      out.coachedUpcoming = live.filter((b: any) => isCoached(b.session_type) && b.session_at > now).length;
      out.coachedTotal = 12; // trial PT allowance
      out.classesCount = live.filter((b: any) => !isCoached(b.session_type)).length;
      out.sessionDates = live.map((b: any) => dayOf(b.session_at));
    }
  } catch (e) { out._bookingsError = (e as Error).message; }

  // ── Workouts logged (by user_id) — volume + count + active dates ─────────────
  try {
    if (userId) {
      const { data } = await db.from("workout_history").select("date, volume")
        .eq("user_id", userId).gte("date", startTs(start)).lte("date", endTs(end));
      out.loggedSessions = (data ?? []).length;
      out.totalVolumeKg = Math.round((data ?? []).reduce((s: number, w: any) => s + (Number(w.volume) || 0), 0));
      out.workoutDates = (data ?? []).map((w: any) => dayOf(w.date));
    }
  } catch (e) { out._workoutsError = (e as Error).message; }

  // ── Gym visits (entry scans, by resolved gym_members.id) — the open-gym signal ─
  try {
    // Resolve this member's roster id (member_ref): confirmed link first, else normalised email.
    let memberRef: string | null = null;
    if (userId) {
      const { data: link } = await db.from("member_links").select("member_id").eq("user_id", userId).maybeSingle();
      if (link?.member_id) memberRef = String(link.member_id);
    }
    if (!memberRef && email) {
      const { data: all } = await db.from("gym_members").select("id, email");
      memberRef = (all ?? []).find((g: any) => normEmail(g.email) === normEmail(email))?.id ?? null;
    }
    if (memberRef) {
      const { data } = await db.from("scan_events").select("ts, result")
        .eq("member_ref", memberRef).eq("result", "granted")
        .gte("ts", startTs(start)).lte("ts", endTs(end));
      const rows = data ?? [];
      out.gymVisitDates = Array.from(new Set(rows.map((r: any) => dayOf(r.ts)))).sort();
      out.gymVisits = out.gymVisitDates.length;   // distinct days visited (the metric)
      out.gymScansTotal = rows.length;             // raw scan count
    } else {
      out.gymVisits = 0; out.gymVisitDates = [];
    }
  } catch (e) { out._gymError = (e as Error).message; }

  // Consistency calendar = union of coached-session days, logged-workout days, and gym-visit days.
  out.activeDates = Array.from(new Set([
    ...(out.sessionDates ?? []), ...(out.workoutDates ?? []), ...(out.gymVisitDates ?? []),
  ])).sort();

  // ── PBs (by user_id) — earliest→latest weight per exercise in window ─────────
  try {
    if (userId) {
      const { data } = await db.from("personal_records").select("exercise, weight, date")
        .eq("user_id", userId).gte("date", start).lte("date", end).order("date", { ascending: true });
      const byEx: Record<string, { start: number; now: number }> = {};
      for (const r of data ?? []) {
        const k = String(r.exercise);
        const w = Number(r.weight) || 0;
        if (!byEx[k]) byEx[k] = { start: w, now: w };
        else byEx[k].now = w;
      }
      out.prs = Object.entries(byEx)
        .map(([exercise, v]) => ({ exercise, start: v.start, now: v.now, gain: Math.round((v.now - v.start) * 10) / 10 }))
        .filter((r) => r.gain > 0)
        .sort((a, b) => b.gain - a.gain)
        .slice(0, 3);
    }
  } catch (e) { out._prsError = (e as Error).message; }

  // ── Bodyweight (by user_id) — first vs latest in window ──────────────────────
  try {
    if (userId) {
      const { data } = await db.from("bodyweight_history").select("date, weight")
        .eq("user_id", userId).gte("date", start).lte("date", end).order("date", { ascending: true });
      const rows = (data ?? []).filter((r: any) => r.weight != null);
      if (rows.length >= 2) {
        out.weightStart = Number(rows[0].weight);
        out.weightNow = Number(rows[rows.length - 1].weight);
        out.weightDelta = Math.round((out.weightNow - out.weightStart) * 10) / 10;
      }
    }
  } catch (e) { out._bwError = (e as Error).message; }

  // ── Photos (by member_id = user_id) — before (baseline/earliest) + after ─────
  try {
    if (userId) {
      const { data } = await db.from("member_photos").select("*")
        .eq("member_id", userId).order("created_at", { ascending: true });
      const rows = data ?? [];
      if (rows.length) {
        const before = rows.find((r: any) => r.is_baseline) ?? rows[0];
        const after = rows[rows.length - 1];
        if (before && after && before.id !== after.id) { out.beforePhoto = before; out.afterPhoto = after; }
        // Full list (newest first) so the member screen + coach panel can show a thumbnail strip
        // even with a single photo (coach can't read member_photos directly under RLS).
        out.photos = rows.slice().reverse().map((r: any) => ({ id: r.id, url: r.url, created_at: r.created_at, is_baseline: r.is_baseline, phase: r.phase }));
      }
    }
  } catch (e) { out._photoError = (e as Error).message; }

  // ── Habits (by member_id) — best streak, habits built, total check-ins ───────
  try {
    if (userId) {
      const { data } = await db.from("habit_checkins").select("date, habit_id")
        .eq("member_id", userId).gte("date", start).lte("date", end);
      const rows = data ?? [];
      out.totalCheckins = rows.length;
      const perHabit: Record<string, number> = {};
      for (const r of rows) perHabit[String(r.habit_id)] = (perHabit[String(r.habit_id)] || 0) + 1;
      out.habitsBuilt = Object.values(perHabit).filter((n) => n >= 5).length;
      out.bestStreak = longestStreak(Array.from(new Set(rows.map((r: any) => dayOf(r.date)))));
    }
  } catch (e) { out._habitError = (e as Error).message; }

  // ── Chosen habits (the list they actually picked) — by member_id, active only ─
  try {
    if (userId) {
      const { data } = await db.from("member_habits")
        .select("habit_id, status, position, habits(name)")
        .eq("member_id", userId).eq("status", "active")
        .order("position", { ascending: true });
      out.chosenHabits = (data ?? []).map((r: any) => ({
        habit_id: r.habit_id,
        name: r.habits?.name ?? null,
        position: r.position,
      }));
    }
  } catch (e) { out._chosenHabitsError = (e as Error).message; }

  // ── Review booked? (from GHL, by email) ──────────────────────────────────────
  try {
    if (email) {
      const { data } = await db.from("review_bookings").select("appointment_at, status").eq("email", email).limit(1);
      const r = (data ?? [])[0];
      out.reviewBooked = !!r && (r.status === "booked" || r.status === "completed");
      out.reviewStatus = r?.status ?? "none";
      out.reviewAt = r?.appointment_at ?? null;
    }
  } catch (e) { out._reviewError = (e as Error).message; }

  // ── Trial goals (induction targets) + progress-vs-target ─────────────────────
  try {
    if (userId) {
      // A member has member_goals; a trialist has trial_goals. Use whichever exists.
      const tg = await db.from("trial_goals").select("*").eq("member_id", userId).limit(1);
      const mg = await db.from("member_goals").select("*").eq("member_id", userId).limit(1);
      const g = (tg.data ?? [])[0] ?? (mg.data ?? [])[0];
      if (g) {
        out.goals = g;
        // sessions/week actual = attended sessions ÷ weeks elapsed in the window
        const weeks = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000 / 7));
        const attended = (out.coachedUsed ?? 0) + (out.classesCount ?? 0);
        out.sessionsPerWeekActual = Math.round((attended / weeks) * 10) / 10;
        // if a start weight was agreed at induction, prefer it as the baseline for weight change
        if (g.start_weight != null && out.weightNow != null) {
          out.weightStart = Number(g.start_weight);
          out.weightDelta = Math.round((out.weightNow - out.weightStart) * 10) / 10;
        }
      }
    }
  } catch (e) { out._goalsError = (e as Error).message; }

  // ── Nutrition (by member_id) — distinct days logged (food_diary + macro_logs) ─
  try {
    if (userId) {
      const days = new Set<string>();
      const fd = await db.from("food_diary").select("*").eq("member_id", userId);
      for (const r of fd.data ?? []) { const d = dayOf(r.date ?? r.logged_on ?? r.created_at); if (d >= start && d <= end) days.add(d); }
      const ml = await db.from("macro_logs").select("date").eq("member_id", userId).gte("date", start).lte("date", end);
      for (const r of ml.data ?? []) days.add(dayOf(r.date));
      out.daysLogged = days.size;
    }
  } catch (e) { out._nutritionError = (e as Error).message; }

  return out;
}

// Longest run of consecutive calendar days present in the set.
function longestStreak(days: string[]): number {
  if (!days.length) return 0;
  const sorted = Array.from(new Set(days)).sort();
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const cur = new Date(sorted[i] + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}
