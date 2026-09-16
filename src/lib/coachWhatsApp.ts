import { supabase } from "./supabase";

export interface CoachWhatsAppSettings {
  enabledEverywhere: boolean;
  enabledOnTrial: boolean;
  number: string; // E.164 digits only, no "+"
}

const DEFAULT: CoachWhatsAppSettings = {
  enabledEverywhere: true,
  enabledOnTrial: true,
  number: "",
};

/** Members read the coach WhatsApp settings (RLS: any authenticated). */
export const getCoachWhatsAppSettings =
  async (): Promise<CoachWhatsAppSettings> => {
    try {
      const { data } = await supabase
        .from("feature_settings")
        .select("value")
        .eq("key", "coach_whatsapp")
        .maybeSingle();
      if (data?.value) {
        const parsed =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return { ...DEFAULT, ...parsed };
      }
    } catch (e) {
      console.warn("getCoachWhatsAppSettings failed", e);
    }
    return DEFAULT;
  };

/** Staff write the coach WhatsApp settings (RLS: staff only). */
export const saveCoachWhatsAppSettings = async (
  value: CoachWhatsAppSettings,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("feature_settings")
    .upsert(
      { key: "coach_whatsapp", value: JSON.stringify(value) },
      { onConflict: "key" },
    );
  return { error };
};

/** Build the wa.me URL with a pre-filled message identifying the member. */
export const buildWhatsAppUrl = (
  number: string,
  firstName: string,
  email: string,
  context: "trial" | "general",
): string | null => {
  const clean = (number || "").replace(/\D/g, "");
  if (!clean) return null;
  const msg =
    context === "trial"
      ? `Hi, it's ${firstName || "a member"}${email ? ` (${email})` : ""} — I've got a question about my 30-day trial.`
      : `Hi, it's ${firstName || "a member"}${email ? ` (${email})` : ""} — I've got a question.`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
};
