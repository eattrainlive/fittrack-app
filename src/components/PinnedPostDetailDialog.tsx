import { useState } from "react";
import { Heart, MessageCircle, Pin, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addComment,
  getWallComments,
  toggleReaction,
  type WallPost,
  type WallComment,
} from "@/lib/communityWall";

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

interface Props {
  post: WallPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: boolean;
  /** Called when a comment is added so the parent can refresh counts. */
  onCommentCountChange?: (postId: string, count: number) => void;
  /** Called when the reaction toggles so the parent feed stays in sync. */
  onReactionChange?: (post: WallPost) => void;
}

export function PinnedPostDetailDialog({
  post,
  open,
  onOpenChange,
  staff,
  onCommentCountChange,
  onReactionChange,
}: Props) {
  const [comments, setComments] = useState<WallComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load comments when a post is first opened.
  if (post && !loaded) {
    setLoaded(true);
    getWallComments(post.id).then((cs) => setComments(cs));
  }

  const close = () => {
    onOpenChange(false);
    setComments([]);
    setDraft("");
    setLoaded(false);
  };

  if (!post) return null;

  const react = async () => {
    const ok = await toggleReaction(post.id, !!post.i_reacted);
    if (ok) {
      const updated: WallPost = {
        ...post,
        i_reacted: !post.i_reacted,
        reaction_count: (post.reaction_count || 0) + (post.i_reacted ? -1 : 1),
      };
      onReactionChange?.(updated);
    }
  };

  const addCmt = async () => {
    if (!draft.trim()) return;
    const ok = await addComment(post.id, draft.trim());
    if (ok) {
      setDraft("");
      const cs = await getWallComments(post.id);
      setComments(cs);
      onCommentCountChange?.(
        post.id,
        cs.filter((c) => staff || !c.hidden).length,
      );
    } else {
      toast.error("Couldn't comment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {post.pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            {post.author_name}
            <span className="text-xs font-normal text-muted-foreground">
              · {timeAgo(post.created_at)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0">
          {post.body && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {post.body}
            </p>
          )}
          {post.image_url && (
            <img
              src={post.image_url}
              alt="post"
              className="w-full h-auto rounded-xl"
            />
          )}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={react}
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
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {comments.length}
            </span>
          </div>
          <div className="space-y-3 pt-2 border-t border-border">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No comments yet.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 pt-2">
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
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCmt();
                }}
                placeholder="Add a comment…"
                className="flex-1 bg-muted/40 rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={addCmt}
                className="p-2 rounded-full bg-primary text-primary-foreground"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PinnedPostDetailDialog;
