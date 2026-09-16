import { Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/** A Coaching-hub tile that opens the in-app class timetable at /schedule. */
export const ScheduleCard = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/schedule")}
      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 text-left shadow-sm hover:border-primary/40 active:scale-[0.99] transition"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <Calendar className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Timetable
        </p>
        <p className="font-heading text-lg tracking-wide uppercase leading-none">
          Class Schedule
        </p>
        <p className="text-xs text-muted-foreground truncate">
          View &amp; book upcoming classes
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-primary shrink-0" />
    </button>
  );
};

export default ScheduleCard;
