import { supabase } from "./supabase";

export interface AccountabilitySettings {
  enabled: boolean;
  title: string;
  startDate: string;
  registerUrl: string;
  courseRoute: string;
}

const DEFAULT: AccountabilitySettings = {
  enabled: false,
  title: "6 Week Accountability Programme",
  startDate: "2026-10-12",
  registerUrl:
    "https://api.leadconnectorhq.com/widget/form/2QhFouEo6lskAJfTtvCk",
  courseRoute: "",
};

/** Members read the accountability feature settings (RLS: any authenticated). */
export const getAccountabilitySettings =
  async (): Promise<AccountabilitySettings> => {
    try {
      const { data } = await supabase
        .from("feature_settings")
        .select("value")
        .eq("key", "accountability")
        .maybeSingle();
      if (data?.value) return { ...DEFAULT, ...(data.value as any) };
    } catch (e) {
      console.warn("getAccountabilitySettings failed", e);
    }
    return DEFAULT;
  };

/** Staff write the accountability feature settings (RLS: staff only). */
export const saveAccountabilitySettings = async (
  value: AccountabilitySettings,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("feature_settings")
    .update({ value: value as any, updated_at: new Date().toISOString() })
    .eq("key", "accountability");
  return { error };
};
