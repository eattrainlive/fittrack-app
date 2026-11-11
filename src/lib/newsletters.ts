// Newsletters — staff build issues from blocks; members/public read them.
// See supabase/sql/newsletters.sql.
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authUser";

export type BlockType =
  | "hero"
  | "heading"
  | "text"
  | "image"
  | "callout"
  | "button"
  | "quote"
  | "divider";

export interface Block {
  id: string;
  type: BlockType;
  heading?: string;
  subheading?: string;
  text?: string;
  image?: string;
  caption?: string;
  url?: string;
  label?: string;
  author?: string;
}

export interface Newsletter {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  blocks: Block[];
  published: boolean;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export const blockId = () =>
  `b_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `issue-${Date.now().toString(36)}`;

const norm = (r: any): Newsletter => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle ?? null,
  cover_image: r.cover_image ?? null,
  blocks: Array.isArray(r.blocks) ? r.blocks : [],
  published: !!r.published,
  published_at: r.published_at ?? null,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

/** Published issues, newest first (members + public). */
export const listPublishedNewsletters = async (): Promise<Newsletter[]> => {
  const { data, error } = await supabase
    .from("newsletters")
    .select("id,slug,title,subtitle,cover_image,published,published_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) {
    console.warn("listPublishedNewsletters", error);
    return [];
  }
  return (data || []).map(norm);
};

/** All issues incl. drafts (staff). */
export const listAllNewsletters = async (): Promise<Newsletter[]> => {
  const { data, error } = await supabase
    .from("newsletters")
    .select("id,slug,title,subtitle,cover_image,published,published_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("listAllNewsletters", error);
    return [];
  }
  return (data || []).map(norm);
};

/** One issue by slug (public). */
export const getNewsletter = async (
  slug: string,
): Promise<Newsletter | null> => {
  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return norm(data);
};

export const getNewsletterById = async (
  id: string,
): Promise<Newsletter | null> => {
  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return norm(data);
};

export const saveNewsletter = async (
  n: Partial<Newsletter> & { title: string; slug: string; blocks: Block[] },
): Promise<{ success: boolean; id?: string; error?: any }> => {
  const {
    data: { user },
  } = await getCurrentUser();
  const row: any = {
    slug: n.slug,
    title: n.title.trim(),
    subtitle: n.subtitle?.trim() || null,
    cover_image: n.cover_image || null,
    blocks: n.blocks,
    published: n.published ?? false,
    published_at: n.published ? n.published_at || new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (n.id) row.id = n.id;
  else row.created_by = user?.id ?? null;
  const { data, error } = await supabase
    .from("newsletters")
    .upsert(row)
    .select("id")
    .single();
  return { success: !error, id: data?.id, error };
};

export const deleteNewsletter = async (
  id: string,
): Promise<{ success: boolean; error?: any }> => {
  const { error } = await supabase.from("newsletters").delete().eq("id", id);
  return { success: !error, error };
};

/** Upload an image for a newsletter block (reuses the community-images bucket). */
export const uploadNewsletterImage = async (
  file: File,
): Promise<string | null> => {
  try {
    if (file.size > 3 * 1024 * 1024) throw new Error("Image must be under 3MB");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `newsletters/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("community-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage
      .from("community-images")
      .getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("uploadNewsletterImage", e);
    throw e;
  }
};
