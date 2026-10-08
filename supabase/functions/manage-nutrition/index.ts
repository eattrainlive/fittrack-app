// Supabase Edge Function: manage-nutrition
// Deploy: create/replace a function named "manage-nutrition" and paste this in.
// Secrets (reuse the same values as manage-members, plus the GHL nudge webhook):
//   SUPABASE_URL              (usually auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role)
//   STAFF_SECRET              (same long string the admin UI sends)
//   GHL_NUDGE_WEBHOOK_URL     (GoHighLevel inbound-webhook URL for member nudges — WhatsApp/SMS)
//
// Staff-only nutrition operations, run with the service-role key (never in the browser).
// Every call MUST include { staffSecret } matching STAFF_SECRET.
// Actions:
//   { action:"list" }                                  -> all members' nutrition summary
//   { action:"setNextHabit", memberId, habitId }       -> promote a habit to active for a member
//   { action:"addNote", memberId, habitId?, note }     -> add a coach note (shows on member's check-in)
//   { action:"setCoached", memberId, coached }         -> flip the paid 1-1 coaching flag
//   { action:"nudge", memberId, message? }             -> send a WhatsApp/SMS nudge via GoHighLevel
//   { action:"history", memberId }                     -> that member's check-ins (last ~12 weeks)
//   { action:"listHabits" }                            -> the full habit library
//   { action:"updateHabit", habitId, ...fields }       -> edit a habit (e.g. video_url)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const staffSecret = Deno.env.get("STAFF_SECRET") ?? "";
    if (!url || !serviceKey) return json({ error: "Function secrets not set (SUPABASE_URL / SERVICE_ROLE_KEY)." }, 500);

    const body = await req.json();
    if (!staffSecret || body.staffSecret !== staffSecret) return json({ error: "Not authorised." }, 401);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const action = body.action;

    if (action === "list") {
      const since = daysAgoISO(6); // inclusive 7-day window
      const [{ data: nut }, { data: members }, { data: activeHabits }, { data: checkins }] = await Promise.all([
        admin.from("member_nutrition").select("member_id, goal, phase, season, coached, last_review_at, started_at"),
        admin.from("members").select("id, full_name, email"),
        admin.from("member_habits").select("member_id, habit_id, status, habits(name)").eq("status", "active"),
        admin.from("habit_checkins").select("member_id, done, date").gte("date", since),
      ]);
      const memberById: Record<string, any> = {};
      (members || []).forEach((m: any) => (memberById[m.id] = m));
      const activeByMember: Record<string, any[]> = {};
      (activeHabits || []).forEach((h: any) => ((activeByMember[h.member_id] ||= []).push(h)));
      const doneByMember: Record<string, number> = {};
      (checkins || []).forEach((c: any) => { if (c.done) doneByMember[c.member_id] = (doneByMember[c.member_id] || 0) + 1; });

      const rows = (nut || []).map((n: any) => {
        const actives = activeByMember[n.member_id] || [];
        const denom = Math.max(1, actives.length) * 7;
        const consistency = Math.round(((doneByMember[n.member_id] || 0) / denom) * 100);
        const lastCheckin = (checkins || [])
          .filter((c: any) => c.member_id === n.member_id)
          .reduce((mx: string | null, c: any) => (!mx || c.date > mx ? c.date : mx), null);
        return {
          memberId: n.member_id,
          name: memberById[n.member_id]?.full_name || memberById[n.member_id]?.email || "Member",
          email: memberById[n.member_id]?.email || "",
          goal: n.goal, phase: n.phase, season: n.season, coached: n.coached,
          activeHabits: actives.map((a: any) => a.habits?.name).filter(Boolean),
          consistency, lastCheckin,
        };
      });
      return json({ members: rows });
    }

    if (action === "setNextHabit") {
      const { error } = await admin.from("member_habits")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("member_id", body.memberId).eq("habit_id", body.habitId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "addNote") {
      const { error } = await admin.from("coach_notes").insert({
        member_id: body.memberId, habit_id: body.habitId ?? null, note: body.note, created_by: body.createdBy ?? "coach",
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "setCoached") {
      const { error } = await admin.from("member_nutrition")
        .update({ coached: !!body.coached }).eq("member_id", body.memberId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "nudge") {
      const webhook = Deno.env.get("GHL_NUDGE_WEBHOOK_URL");
      if (!webhook) return json({ error: "GHL_NUDGE_WEBHOOK_URL not set." }, 500);
      const { data: m } = await admin.from("members").select("full_name, email").eq("id", body.memberId).maybeSingle();
      if (!m) return json({ error: "Member not found." }, 404);
      const first = (m.full_name || "there").split(" ")[0];
      const message = body.message ||
        `Hey ${first}, saw it's been a busy few days — fancy ticking off one habit today? Small wins add up, and I'm in your corner.`;
      const resp = await fetch(webhook, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: m.full_name, email: m.email, message, action: "nutrition_nudge" }),
      });
      if (!resp.ok) return json({ error: `GHL webhook returned ${resp.status}` }, 502);
      return json({ ok: true });
    }

    if (action === "history") {
      const { data, error } = await admin.from("habit_checkins")
        .select("habit_id, date, done, count_value, habits(name)")
        .eq("member_id", body.memberId)
        .gte("date", daysAgoISO(84)) // ~12 weeks
        .order("date", { ascending: true });
      if (error) throw error;
      return json({ checkins: data || [] });
    }

    if (action === "listHabits") {
      const { data, error } = await admin.from("habits").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return json({ habits: data || [] });
    }

    if (action === "updateHabit") {
      const allowed = ["name", "category", "phase", "coaching_cue", "practice_label", "checkin_type", "count_unit", "count_target", "why", "video_url", "active"];
      const patch: Record<string, any> = {};
      for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k];
      if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400);
      const { data, error } = await admin.from("habits").update(patch).eq("id", body.habitId).select();
      if (error) throw error;
      if (!data?.length) throw new Error("No habit row updated for id " + body.habitId);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});
