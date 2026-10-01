import { supabase } from "./supabase";

export const isStaff = (): boolean =>
  localStorage.getItem("fittrack_is_staff") === "true";

export interface WallPost {
  id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  pinned: boolean;
  hidden: boolean;
  created_at: string;
  author_name?: string;
  reaction_count?: number;
  comment_count?: number;
  i_reacted?: boolean;
}

export interface WallComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  author_name?: string;
}

/** Resolve the current user's id + display name. */
export const getMe = async (): Promise<{
  id: string;
  name: string;
} | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const name =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Member";
  return { id: user.id, name };
};

/** Upload an image to the community-images bucket, return its public URL. */
export const uploadWallImage = async (
  file: File,
  userId: string,
): Promise<string | null> => {
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("community-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const pub = supabase.storage.from("community-images").getPublicUrl(path)
      .data.publicUrl;
    if (!pub) throw new Error("No public URL returned");
    return pub;
  } catch (e) {
    console.error("[communityWall] uploadWallImage FAILED:", e);
    return null;
  }
};

/** Load posts (pinned first, then newest). Members see non-hidden; staff see all. */
export const getWallPosts = async (userId: string): Promise<WallPost[]> => {
  try {
    const staff = isStaff();
    // Chronological (newest first). Pinned posts appear in their natural date
    // position here; they get a separate summary strip at the top of the wall.
    let q = supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!staff) q = q.eq("hidden", false);
    const { data: posts, error } = await q;
    if (error) throw error;
    if (!posts || posts.length === 0) return [];

    // Author names (join members on author_id).
    const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .in("id", authorIds);
    const nameMap = new Map<string, string>();
    for (const m of members || [])
      nameMap.set(String(m.id), m.full_name || "Member");

    // Reaction counts + whether I reacted.
    const { data: reactions } = await supabase
      .from("community_reactions")
      .select("post_id, user_id")
      .in(
        "post_id",
        posts.map((p: any) => p.id),
      );
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const r of reactions || []) {
      counts.set(r.post_id, (counts.get(r.post_id) || 0) + 1);
      if (r.user_id === userId) mine.add(r.post_id);
    }

    // Comment counts (non-hidden for members, all for staff).
    const { data: comments } = await supabase
      .from("community_comments")
      .select("post_id, hidden")
      .in(
        "post_id",
        posts.map((p: any) => p.id),
      );
    const cCounts = new Map<string, number>();
    for (const c of comments || []) {
      if (staff || !c.hidden)
        cCounts.set(c.post_id, (cCounts.get(c.post_id) || 0) + 1);
    }

    return posts.map((p: any) => ({
      id: p.id,
      author_id: p.author_id,
      body: p.body,
      image_url: p.image_url,
      pinned: p.pinned,
      hidden: p.hidden,
      created_at: p.created_at,
      author_name: nameMap.get(String(p.author_id)) || "Member",
      reaction_count: counts.get(p.id) || 0,
      comment_count: cCounts.get(p.id) || 0,
      i_reacted: mine.has(p.id),
    }));
  } catch (e) {
    console.warn("[communityWall] getWallPosts:", e);
    return [];
  }
};

/** Load comments for a post. Members see non-hidden; staff see all. */
export const getWallComments = async (
  postId: string,
): Promise<WallComment[]> => {
  try {
    const staff = isStaff();
    let q = supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (!staff) q = q.eq("hidden", false);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const authorIds = [...new Set(data.map((c: any) => c.author_id))];
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .in("id", authorIds);
    const nameMap = new Map<string, string>();
    for (const m of members || [])
      nameMap.set(String(m.id), m.full_name || "Member");

    return data.map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      author_id: c.author_id,
      body: c.body,
      hidden: c.hidden,
      created_at: c.created_at,
      author_name: nameMap.get(String(c.author_id)) || "Member",
    }));
  } catch (e) {
    console.warn("[communityWall] getWallComments:", e);
    return [];
  }
};

export const createPost = async (
  body: string,
  imageUrl: string | null,
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("community_posts")
      .insert({ body, image_url: imageUrl })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch (e) {
    console.warn("[communityWall] createPost:", e);
    return null;
  }
};

export const addComment = async (
  postId: string,
  body: string,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_comments")
      .insert({ post_id: postId, body });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] addComment:", e);
    return false;
  }
};

export const toggleReaction = async (
  postId: string,
  reacted: boolean,
): Promise<boolean> => {
  try {
    if (reacted) {
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", (await getMe())?.id ?? "");
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("community_reactions")
        .insert({ post_id: postId, type: "like" });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn("[communityWall] toggleReaction:", e);
    return false;
  }
};

export const setPostPinned = async (
  postId: string,
  pinned: boolean,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_posts")
      .update({ pinned })
      .eq("id", postId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] setPostPinned:", e);
    return false;
  }
};

export const setPostHidden = async (
  postId: string,
  hidden: boolean,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_posts")
      .update({ hidden })
      .eq("id", postId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] setPostHidden:", e);
    return false;
  }
};

export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] deletePost:", e);
    return false;
  }
};

export const setCommentHidden = async (
  commentId: string,
  hidden: boolean,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_comments")
      .update({ hidden })
      .eq("id", commentId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] setCommentHidden:", e);
    return false;
  }
};

export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("community_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[communityWall] deleteComment:", e);
    return false;
  }
};
