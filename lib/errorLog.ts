import { supabase } from "./supabase";

// ── Error logging (fire-and-forget; never breaks the app) ───────────────────
// Captures failed cloud writes / sync errors into the `error_log` table so
// staff can see breakages instantly in the Staff Hub "Sync Errors" panel.
export const logError = async (
  action: string,
  table_name: string,
  err: any,
  extra: any = {},
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("error_log").insert({
      user_email: user?.email ?? null,
      user_id: user?.id ?? null,
      action,
      table_name,
      code: String(err?.code ?? err?.status ?? "").slice(0, 20) || null,
      message: String(err?.message ?? err ?? "").slice(0, 500),
      details: err?.details ? String(err.details).slice(0, 500) : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      raw: { ...extra, err: err ? JSON.parse(JSON.stringify(err)) : null },
    });
  } catch (_) {
    /* never let logging break the app */
  }
};
