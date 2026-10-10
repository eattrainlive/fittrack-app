import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { NumberField, QLabel } from "./onboardingFields";

/**
 * Nutrition tracking block shown only when the client's approach is "tracking".
 * Gated on the live nutrition_approach so a client switched to tracking mid-programme
 * sees the block from that week on.
 */
export function TrackingBlock({
  approach,
  f,
  set,
  trackShot,
  setTrackShot,
  busy,
  week,
}: {
  approach: string | null | undefined;
  f: Record<string, any>;
  set: (k: string, v: any) => void;
  trackShot: string | null;
  setTrackShot: (url: string | null) => void;
  busy: boolean;
  week: number;
}) {
  if (approach !== "tracking") return null;

  const handleShot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const ext = file.name.split(".").pop();
      const path = `nutrition-photos/${user.id}/acc-track-w${week}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setTrackShot(data.publicUrl);
      toast.success("Screenshot added");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
      <p className="text-sm font-semibold text-primary">
        Your tracking this week
      </p>
      <p className="text-xs text-muted-foreground -mt-1">
        Open your tracking app's weekly summary — the numbers are all on that
        screen. Under a minute.
      </p>

      <div>
        <QLabel n={0}>Days logged this week</QLabel>
        <NumberField
          value={f.trackDays || ""}
          onChange={(v) => set("trackDays", v)}
          placeholder="0–7"
        />
      </div>
      <div>
        <QLabel n={0}>Average daily calories</QLabel>
        <NumberField
          value={f.trackCalories || ""}
          onChange={(v) => set("trackCalories", v)}
          placeholder="e.g. 1800"
        />
      </div>
      <div>
        <QLabel n={0}>Average daily protein (g)</QLabel>
        <NumberField
          value={f.trackProtein || ""}
          onChange={(v) => set("trackProtein", v)}
          placeholder="e.g. 140"
        />
      </div>
      <div>
        <QLabel n={0}>
          Screenshot of your app's weekly summary (optional)
        </QLabel>
        <div className="mb-1">
          <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 cursor-pointer hover:bg-muted/60 transition">
            {trackShot ? (
              <img
                src={trackShot}
                alt="tracking summary"
                className="h-24 object-cover rounded-lg"
              />
            ) : (
              <>
                <Camera className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium">Add screenshot</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleShot}
              disabled={busy}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default TrackingBlock;
