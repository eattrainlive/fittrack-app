// Supabase Edge Function: workout-admin
// Lets STAFF view/edit/delete a MEMBER's past workouts (members edit their own client-side via RLS;
// coaches can't write another user's row under RLS, so this does it with the service role).
//
// Deploy as "workout-admin". Reuses STAFF_SECRET.
// Request (POST):
//   { staffSecret, action:"list",   memberUserId, limit? }              -> that member's past workouts
//   { staffSecret, action:"update", workoutId, workout }               -> replace a workout (edited sets + volume)
//   { staffSecret, action:"delete", workoutId }                        -> delete a workout

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: any, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Recompute total volume = sum(weight*reps) over every set, defensively.
function computeVolume(workout: any): number {
  let v = 0;
  for (const ex of workout?.exercises ?? []) {
    for (const s of ex?.setsData ?? []) {
      v += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }
  return Math.round(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);
    const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
    const action = body.action;

    if (action === "list") {
      const uid = String(body.memberUserId ?? "");
      if (!uid) return json({ error: "memberUserId required" }, 400);
      const { data, error } = await db.from("workout_history")
        .select("*").eq("user_id", uid).order("date", { ascending: false }).limit(Number(body.limit) || 50);
      if (error) throw error;
      return json({ workouts: data ?? [] });
    }

    if (action === "update") {
      const id = String(body.workoutId ?? "");
      const workout = body.workout;
      if (!id || !workout) return json({ error: "workoutId and workout required" }, 400);
      const volume = computeVolume(workout);
      // Keep BOTH the top-level columns and `data` in sync (matches how the app saves). No updated_at
      // column on workout_history — writing it 500s.
      const { error } = await db.from("workout_history")
        .update({
          data: workout,
          exercises: workout.exercises ?? [],
          volume,
          date: workout.date,
          name: workout.name ?? null,
          duration: workout.duration ?? null,
        })
        .eq("id", id);
      if (error) throw error;
      return json({ ok: true, volume });
    }

    if (action === "delete") {
      const id = String(body.workoutId ?? "");
      if (!id) return json({ error: "workoutId required" }, 400);
      const { error } = await db.from("workout_history").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
