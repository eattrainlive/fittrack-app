import { supabase } from "./supabase";

/**
 * Stamp the current user's `members.onboarded_at` the first time they truly
 * complete setup (set a password and are signed in). Also self-heals existing
 * members on any successful sign-in: if `onboarded_at` is still null, set it
 * to now() so they flip to "On app" without a manual backfill.
 *
 * Safe to call repeatedly — it only writes when the column is null.
 * Best-effort: never throws (a failure here must not block the app).
 */
export const markOnboarded = async (): Promise<void> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return;

    // Stamp onboarded_at via a SECURITY DEFINER RPC. A direct update is blocked
    // by RLS (members have SELECT-only), so the old self-update silently wrote 0
    // rows and nobody flipped to "On app". The RPC only sets onboarded_at (when
    // null) for the caller's own row. Idempotent.
    const { error: rpcErr } = await supabase.rpc("mark_onboarded");
    if (rpcErr) {
      console.warn("[onboarded] mark_onboarded rpc failed:", rpcErr.message);
    }
  } catch (e) {
    console.warn("[onboarded] error:", e);
  }
};
