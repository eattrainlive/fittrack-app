import { supabase } from "./supabase";

export const updateResourceSection = async (id: string, name: string) => {
  const { error } = await supabase
    .from("resource_sections")
    .update({ name: name.trim() })
    .eq("id", id);
  return { error };
};
