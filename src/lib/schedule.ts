import { supabase } from "./supabase";

export interface ScheduleSettings {
  url: string;
}

const DEFAULT_URL = "https://eattrainlive.fitnesshub.net/schedule/?hf=1";

const DEFAULT: ScheduleSettings = { url: DEFAULT_URL };

/** Members read the schedule settings (RLS: any authenticated). */
export const getScheduleSettings = async (): Promise<ScheduleSettings> => {
  try {
    const { data } = await supabase
      .from("feature_settings")
      .select("value")
      .eq("key", "schedule")
      .maybeSingle();
    if (data?.value) {
      const v = data.value as any;
      return { url: v.url || DEFAULT_URL };
    }
  } catch (e) {
    console.warn("getScheduleSettings failed", e);
  }
  return DEFAULT;
};

/** Staff write the schedule settings (RLS: staff only). */
export const saveScheduleSettings = async (
  value: ScheduleSettings,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("feature_settings")
    .update({ value: value as any, updated_at: new Date().toISOString() })
    .eq("key", "schedule");
  return { error };
};
