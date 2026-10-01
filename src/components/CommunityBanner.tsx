import { useNavigate } from "react-router-dom";
import { Users2, ChevronRight } from "lucide-react";

/**
 * Single Community banner on the home screen — replaces the old
 * Workout-of-the-Week + Leaderboards banners (which moved into Workouts).
 * Tapping it navigates to /community.
 */
export default function CommunityBanner() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/community")}
      className="w-full flex items-center gap-3 bg-[#14170f] border border-[#23291b] rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Users2 className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Community
        </p>
        <p className="font-heading text-xl tracking-wider uppercase leading-none text-white">
          Join the ETL Tribe
        </p>
        <p className="text-xs text-neutral-400 truncate">
          Facebook group · the feed · events
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 border border-primary/50 text-primary font-bold text-xs px-3 py-2 rounded-lg">
        Open <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}
