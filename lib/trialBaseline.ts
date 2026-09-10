import { supabase } from "./supabase";

// Quoox coached-trial plan names eligible for the 30-day progress pack.
// "21 Days For £21" is the separate gym trial and is intentionally NOT included here.
export const TRIAL_PRODUCTS = ["30 Day Trial", "Forever Strong 30 Day Trial"];

export const isTrialProduct = (product?: string | null) =>
  !!product &&
  TRIAL_PRODUCTS.some((p) => p.toLowerCase() === String(product).toLowerCase());

export const daysSince = (iso?: string | null) => {
  if (!iso) return Infinity;
  const start = new Date(iso);
  if (isNaN(start.getTime())) return Infinity;
  return Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
};

export const getSettingValue = async (key: string): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
};

export const setSettingValue = async (key: string, value: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, key, value }, { onConflict: "user_id, key" });
};

export const getTrialBaselineCapturedAt = () =>
  getSettingValue("trial_baseline_captured_at");

export const setTrialBaselineCapturedAt = () =>
  setSettingValue("trial_baseline_captured_at", new Date().toISOString());
