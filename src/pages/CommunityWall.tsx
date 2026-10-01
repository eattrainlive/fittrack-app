import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  ImagePlus,
  Send,
  Pin,
  PinOff,
  EyeOff,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PinnedPostDetailDialog } from "@/components/PinnedPostDetailDialog";
import {
  getMe,
  getWallPosts,
  getWallComments,
  createPost,
  addComment,
  toggleReaction,
  setPostPinned,
  setPostHidden,
  deletePost,
  setCommentHidden,
  deleteComment,
  uploadWallImage,
  isStaff,
  type WallPost,
  type WallComment,
} from "@/lib/communityWall";

const MAX_PINS = 3;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};

const initialOf = (name: string) =>
  (name || "M").trim().charAt(0).toUpperCase();

export default function CommunityWall() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const staff = isStaff();

  // Composer
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Expanded comments
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, WallComment[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );

  // Pinned-post detail dialog (opened from the pinned summary strip)
  const [detailPost, setDetailPost] = useState<WallPost | null>(null);

  const load = async () => {
    setLoading(true);
    const meData = await getMe();
    setMe(meData);
    if (meData) setPosts(await getWallPosts(meData.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onPickImage = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large (max 2MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePost = async () => {
    if (!body.trim() && !imageFile) return;
    setPosting(true);
    let imageUrl: string | null = null;
    if (imageFile && me) {
      imageUrl = await uploadWallImage(imageFile, me.id);
      if (!imageUrl) toast.error("Image upload failed — posting text only");
    }
    const id = await createPost(body.trim(), imageUrl);
    setPosting(false);
    if (id) {
      toast.success("Posted");
      setBody("");
      clearImage();
      load();
    } else {
      toast.error("Couldn't post");
    }
  };

  const handleReact = async (post: WallPost) => {
    const ok = await toggleReaction(post.id, !!post.i_reacted);
    if (ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                i_reacted: !p.i_reacted,
                reaction_count:
                  (p.reaction_count || 0) + (p.i_reacted ? -1 : 1),
              }
            : p,
        ),
      );
    }
  };

  const toggleComments = async (postId: string) => {
    const next = new Set(openComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      const cs = await getWallComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: cs }));
    }
    setOpenComments(next);
  };

  const submitComment = async (postId: string) => {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const ok = await addComment(postId, text);
    if (ok) {
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      const cs = await getWallComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: cs }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comment_count: (p.comment_count || 0) + 1 }
            : p,
        ),
      );
    } else {
      toast.error("Couldn't comment");
    }
  };

  const refreshComments = async (postId: string) => {
    const cs = await getWallComments(postId);
    setCommentsByPost((prev) => ({ ...prev, [postId]: cs }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comment_count: cs.filter((c) => staff || !c.hidden).length }
          : p,
      ),
    );
  };

  // ── Pinned summary strip ────────────────────────────────────────────────
  const pinnedPosts = posts.filter((p) => p.pinned).slice(0, MAX_PINS);

  const handlePin = async (post: WallPost) => {
    if (!post.pinned) {
      const pinCount = posts.filter((p) => p.pinned).length;
      if (pinCount >= MAX_PINS) {
        toast.error(`You can pin up to ${MAX_PINS} posts — unpin one first.`);
        return;
      }
    }
    if (await setPostPinned(post.id, !post.pinned)) load();
  };

  // ── Detail dialog (opened from pinned summary strip) ────────────────────
  const openDetail = (post: WallPost) => setDetailPost(post);

  const closeDetail = () => setDetailPost(null);

  const snippet = (post: WallPost) => {
    const b = (post.body || "").trim();
    if (b) return b.length > 80 ? b.slice(0, 80) + "…" : b;
    return post.image_url ? "Photo" : "Post";
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/community")}
          className="p-2 -ml-2 rounded-lg hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Community Wall
        </h1>
      </div>

      {/* Composer */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share something with the tribe…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {imagePreview && (
          <div className="relative">
            <img
              src={imagePreview}
              alt="preview"
              className="rounded-xl max-h-64 object-cover"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="h-5 w-5" /> Photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
          <button
            onClick={handlePost}
            disabled={posting || (!body.trim() && !imageFile)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-40"
          >
            <Send className="h-4 w-4" /> Post
          </button>
        </div>
      </div>

      {/* Pinned summary strip (max 3) — compact cards, tap to open full post */}
      {!loading && pinnedPosts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Pin className="h-3.5 w-3.5 text-primary" /> Pinned
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pinnedPosts.map((post) => (
              <button
                key={post.id}
                onClick={() => openDetail(post)}
                className="text-left bg-card border border-primary/30 rounded-xl p-3 flex items-start gap-2.5 hover:border-primary/60 transition active:scale-[.99]"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                    {initialOf(post.author_name || "M")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-xs block truncate">
                    {post.author_name}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2 break-words leading-snug">
                    {snippet(post)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">
          Loading…
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-heading text-lg">
            Be the first to share something 👋
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Post a win, a question, or a photo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isOpen = openComments.has(post.id);
            const isOwn = me?.id === post.author_id;
            return (
              <div
                key={post.id}
                className={`bg-card border rounded-2xl overflow-hidden ${
                  post.pinned ? "border-primary/40" : "border-border"
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                      {initialOf(post.author_name || "M")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {post.author_name}
                        </span>
                        {post.pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">
                            <Pin className="h-3 w-3" /> Pinned
                          </span>
                        )}
                        {staff && post.hidden && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                            Hidden
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(post.created_at)}
                      </span>
                    </div>

                    {/* Staff / owner controls */}
                    {(staff || isOwn) && (
                      <div className="flex gap-1 shrink-0">
                        {staff && (
                          <button
                            onClick={() => handlePin(post)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            aria-label={post.pinned ? "Unpin" : "Pin"}
                            title={post.pinned ? "Unpin" : "Pin"}
                          >
                            {post.pinned ? (
                              <PinOff className="h-4 w-4" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {staff && (
                          <button
                            onClick={async () => {
                              if (await setPostHidden(post.id, !post.hidden))
                                load();
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            aria-label={post.hidden ? "Unhide" : "Hide"}
                            title={post.hidden ? "Unhide" : "Hide"}
                          >
                            {post.hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (await deletePost(post.id)) {
                              toast.success("Post deleted");
                              load();
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {post.body && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {post.body}
                    </p>
                  )}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="post"
                      loading="lazy"
                      className="w-full h-auto rounded-xl"
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => handleReact(post)}
                      className={`inline-flex items-center gap-1.5 text-sm ${
                        post.i_reacted
                          ? "text-primary font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${post.i_reacted ? "fill-current" : ""}`}
                      />
                      {post.reaction_count || 0}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.comment_count || 0}
                    </button>
                  </div>

                  {/* Comments */}
                  {isOpen && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      {(commentsByPost[post.id] || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No comments yet.
                        </p>
                      ) : (
                        (commentsByPost[post.id] || []).map((c) => {
                          const cOwn = me?.id === c.author_id;
                          return (
                            <div
                              key={c.id}
                              className="flex items-start gap-2 pt-2"
                            >
                              <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                                {initialOf(c.author_name || "M")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="bg-muted/50 rounded-xl px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs">
                                      {c.author_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {timeAgo(c.created_at)}
                                    </span>
                                    {staff && c.hidden && (
                                      <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">
                                        Hidden
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {c.body}
                                  </p>
                                </div>
                                {(staff || cOwn) && (
                                  <div className="flex gap-2 mt-1 ml-1">
                                    {staff && (
                                      <button
                                        onClick={async () => {
                                          await setCommentHidden(
                                            c.id,
                                            !c.hidden,
                                          );
                                          refreshComments(post.id);
                                        }}
                                        className="text-[11px] text-muted-foreground hover:text-foreground"
                                      >
                                        {c.hidden ? "Unhide" : "Hide"}
                                      </button>
                                    )}
                                    <button
                                      onClick={async () => {
                                        if (await deleteComment(c.id))
                                          refreshComments(post.id);
                                      }}
                                      className="text-[11px] text-muted-foreground hover:text-destructive"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitComment(post.id);
                          }}
                          placeholder="Add a comment…"
                          className="flex-1 bg-muted/40 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          className="p-2 rounded-full bg-primary text-primary-foreground"
                          aria-label="Send comment"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pinned-post detail dialog (opened from the summary strip) */}
      <PinnedPostDetailDialog
        post={detailPost}
        open={!!detailPost}
        onOpenChange={(o) => !o && closeDetail()}
        staff={staff}
        onCommentCountChange={(postId, count) =>
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, comment_count: count } : p,
            ),
          )
        }
        onReactionChange={(updated) =>
          setPosts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          )
        }
      />
    </div>
  );
}
