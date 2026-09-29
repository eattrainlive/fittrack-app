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

    // Only update if onboarded_at is null (idempotent self-heal).
    const { error: updErr } = await supabase
      .from("members")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("onboarded_at", null);

    if (updErr) {
      console.warn("[onboarded] self-update failed:", updErr.message);
    }
  } catch (e) {
    console.warn("[onboarded] error:", e);
  }
};
