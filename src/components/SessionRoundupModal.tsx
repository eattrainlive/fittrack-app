/**
 * Session Roundup — a branded celebratory card shown after a member logs a
 * workout. Shows total volume lifted, a fun comparison ("that's 42 🐘 Baby
 * Elephants!"), any PBs hit this session, and small stats. Two share buttons:
 * share to socials (native share sheet via html-to-image PNG) and share to
 * community feed (upload PNG + createPost).
 *
 * Reuses:
 * - REWARD_ITEMS from workoutConstants.tsx
 * - detectAndSavePBs → onPBs (exercises passed in from the save path)
 * - toPng + navigator.share pattern from MemberProgressHub.tsx
 * - createPost(body, imageUrl) + uploadWallImage from communityWall.ts
 */
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Users, Download, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { REWARD_ITEMS } from "@/lib/workoutConstants";
import {
  createPost,
  uploadWallImage,
  getMe,
} from "@/lib/communityWall";

export interface SessionPB {
  exercise: string;
  weight: number;
  reps: number;
}

export interface SessionRoundupData {
  totalVolume: number;
  exerciseCount: number;
  totalSets: number;
  duration?: number;
  workoutName?: string;
  pbs: SessionPB[];
}

/** Pick the best fun comparison for a given volume. */
function pickComparison(volume: number) {
  if (volume <= 0) return null;
  const eligible = REWARD_ITEMS.filter((i) => i.weight <= volume);
  if (eligible.length === 0) {
    // volume is below the smallest item — use the smallest
    const smallest = REWARD_ITEMS[0];
    const count = Math.max(1, Math.floor(volume / smallest.weight));
    return { ...smallest, count };
  }
  // Pick the largest eligible item (most impactful "that's N of X"!)
  const best = eligible[eligible.length - 1];
  const count = Math.floor(volume / best.weight);
  return { ...best, count };
}

function SessionRoundupCard({
  data,
  cardRef,
  memberName,
}: {
  data: SessionRoundupData;
  cardRef: React.RefObject<HTMLDivElement>;
  memberName: string;
}) {
  const comparison = pickComparison(data.totalVolume);
  const vol = data.totalVolume;

  return (
    <div
      ref={cardRef}
      className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground"
      style={{ aspectRatio: "4/5", minHeight: "420px" }}
    >
      {/* Decorative glow */}
      <div
        className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-black/10 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-between gap-4 text-center">
        {/* Header */}
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            {data.workoutName || "Workout complete"}
          </p>
          <h2 className="mt-1 font-heading text-3xl font-bold tracking-wide">
            Session Roundup
          </h2>
        </div>

        {/* Volume */}
        <div className="w-full">
          <p className="text-sm text-primary-foreground/70">You moved</p>
          <p className="font-heading text-5xl font-bold tabular-nums">
            {vol.toLocaleString()}{" "}
            <span className="text-2xl font-semibold">kg</span>
          </p>
        </div>

        {/* Fun comparison */}
        {comparison && (
          <div className="w-full rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-lg font-semibold">
              That's{" "}
              {comparison.count > 1
                ? `${comparison.count.toLocaleString()}`
                : "a"}{" "}
              {comparison.emoji}{" "}
              {comparison.count > 1
                ? comparison.plural || comparison.name
                : comparison.name}
              !
            </p>
          </div>
        )}

        {/* PBs */}
        {data.pbs.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              {data.pbs.length > 1 ? "New PBs" : "New PB"}
            </p>
            {data.pbs.map((pb, i) => (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold"
              >
                <Trophy className="h-4 w-4 shrink-0" />
                <span>
                  {pb.exercise} — {pb.weight}kg × {pb.reps}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stats line */}
        <div className="mt-auto flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-primary-foreground/60">
          <span>{data.exerciseCount} exercises</span>
          <span>·</span>
          <span>{data.totalSets} sets</span>
          {data.duration ? (
            <>
              <span>·</span>
              <span>{Math.round(data.duration / 60)} min</span>
            </>
          ) : null}
        </div>

        {/* Signature */}
        <p className="w-full text-xs font-semibold tracking-wide text-primary-foreground/50">
          {memberName} · ETL FitTrack
        </p>
      </div>
    </div>
  );
}

export function SessionRoundupModal({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SessionRoundupData | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharingSocial, setSharingSocial] = useState(false);
  const [sharingFeed, setSharingFeed] = useState(false);
  const [memberName, setMemberName] = useState("Member");

  // Resolve the member's display name once (best-effort).
  useRef<null>();
  useState(() => {
    getMe().then((me) => {
      if (me) setMemberName(me.name);
    });
  });

  if (!data) return null;

  const caption = (() => {
    const comparison = pickComparison(data.totalVolume);
    let cap = `Smashed a session 💪 ${data.totalVolume.toLocaleString()} kg`;
    if (comparison && comparison.count > 1) {
      cap += ` — ${comparison.count} ${comparison.plural || comparison.name}!`;
    } else if (comparison) {
      cap += ` — a ${comparison.name}!`;
    }
    if (data.pbs.length > 0) {
      cap += ` 🏆 ${data.pbs.length} new PB${data.pbs.length > 1 ? "s" : ""}!`;
    }
    return cap;
  })();

  const renderToImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });
      return dataUrl;
    } catch (e) {
      console.error("[SessionRoundup] toPng failed:", e);
      return null;
    }
  };

  const handleShareSocials = async () => {
    setSharingSocial(true);
    try {
      const dataUrl = await renderToImage();
      if (!dataUrl) {
        toast.error("Couldn't build the image");
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "workout-roundup.png", {
        type: "image/png",
      });
      const nav = navigator as any;
      const shareData: ShareData = {
        title: "My ETL workout",
        text: caption,
      };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ ...shareData, files: [file] });
      } else if (nav.share) {
        await nav.share(shareData);
      } else {
        // Fallback: download the PNG
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "workout-roundup.png";
        a.click();
        toast.success("Saved your roundup image");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Couldn't share");
    } finally {
      setSharingSocial(false);
    }
  };

  const handleShareFeed = async () => {
    setSharingFeed(true);
    try {
      const dataUrl = await renderToImage();
      if (!dataUrl) {
        toast.error("Couldn't build the image");
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "workout-roundup.png", {
        type: "image/png",
      });
      const me = await getMe();
      if (!me) {
        toast.error("Sign in to share to the community");
        return;
      }
      const imageUrl = await uploadWallImage(file, me.id);
      if (!imageUrl) {
        toast.error("Couldn't upload the image");
        return;
      }
      const ok = await createPost(caption, imageUrl);
      if (ok) {
        toast.success("Shared to the community ✓");
      } else {
        toast.error("Couldn't post — try again");
      }
    } catch {
      toast.error("Couldn't share to the community");
    } finally {
      setSharingFeed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-md bg-card border-border max-h-[92dvh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-center font-heading text-xl tracking-wide">
            🎉 Workout Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <SessionRoundupCard
            data={data}
            cardRef={cardRef}
            memberName={memberName}
          />
        </div>

        {/* Share actions */}
        <div className="shrink-0 space-y-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleShareSocials}
              disabled={sharingSocial || sharingFeed}
              className="h-11 gap-2 text-sm font-semibold"
            >
              {sharingSocial ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share to socials
            </Button>
            <Button
              onClick={handleShareFeed}
              disabled={sharingSocial || sharingFeed}
              variant="secondary"
              className="h-11 gap-2 text-sm font-semibold"
            >
              {sharingFeed ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Share to feed
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 text-sm"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SessionRoundupModal;