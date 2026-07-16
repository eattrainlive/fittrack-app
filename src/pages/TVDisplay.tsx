import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getPrograms, getExercises } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TVDisplay = () => {
  const { programId, workoutIndex } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [program, setProgram] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [preset, setPreset] = useState<any>(null);
  
  useEffect(() => {
    const allPrograms = getPrograms();
    const allExercises = getExercises();
    
    // Parse preset from query params
    const queryParams = new URLSearchParams(location.search);
    const presetId = queryParams.get('preset');
    if (presetId) {
      const savedPresets = localStorage.getItem('fittrack_display_presets');
      if (savedPresets) {
        const presets = JSON.parse(savedPresets);
        const found = presets.find((p: any) => p.id === presetId);
        if (found) setPreset(found);
      }
    }

    const foundProgram = allPrograms.find((p: any) => p.id === programId);
    if (foundProgram && foundProgram.workouts) {
      const wIndex = parseInt(workoutIndex || "0", 10);
      const foundWorkout = foundProgram.workouts[wIndex];
      
      if (foundWorkout) {
        setProgram(foundProgram);
        setWorkout(foundWorkout);
        setExercises(allExercises);
      }
    }
  }, [programId, workoutIndex, location.search]);

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-4">Workout Not Found</h1>
        <Button onClick={() => navigate("/admin")}>Return to Staff Hub</Button>
      </div>
    );
  }

  const layout = preset?.layout || { orientation: 'landscape', showRest: true, showHeaders: true, showDuration: true, showWeek: true, showNumbers: true };
  const colors = preset?.colors || { background: '#000000', blockBackground: '#1a1a1a', opacity: 100 };
  const typography = preset?.typography || { fontSize: 'medium' };

  // Group exercises by section
  const sections: { name: string; exercises: any[] }[] = [];
  let currentSection: { name: string; exercises: any[] } | null = null;

  workout.exercises.forEach((ex: any) => {
    if (ex.isSection) {
      currentSection = { name: ex.name, exercises: [] };
      sections.push(currentSection);
    } else {
      if (!currentSection) {
        currentSection = { name: "Workout", exercises: [] };
        sections.push(currentSection);
      }
      currentSection.exercises.push(ex);
    }
  });

  // Format date if available
  let displayDate = "";
  if (workout.date) {
    const d = new Date(workout.date);
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
    const dayNum = d.getDate();
    const suffix = (dayNum % 10 === 1 && dayNum !== 11) ? 'ST' : (dayNum % 10 === 2 && dayNum !== 12) ? 'ND' : (dayNum % 10 === 3 && dayNum !== 13) ? 'RD' : 'TH';
    const month = d.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
    displayDate = `${dayName} ${dayNum}${suffix} ${month}`;
  } else {
    displayDate = program.name.toUpperCase();
  }

  const weekText = workout.week ? `WEEK ${workout.week}` : workout.name.toUpperCase();

  return (
    <div 
      className="min-h-screen p-4 md:p-6 flex flex-col" 
      style={{ 
        backgroundColor: colors.background, 
        color: '#ffffff'
      }}
    >
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold uppercase tracking-wide text-white drop-shadow-md leading-none">
            {displayDate}
          </h1>
          <h2 className="text-xl md:text-2xl font-heading font-bold uppercase tracking-wide text-primary drop-shadow-md mt-1">
            {weekText}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="font-heading font-bold text-2xl tracking-tighter leading-none">ETL</div>
              <div className="text-[9px] font-bold tracking-widest uppercase">Eat Train Live</div>
            </div>
            <div className="w-1.5 h-6 bg-primary"></div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 bg-black/50 border-white/20 hover:bg-black/80 h-7 text-xs px-2" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-3 w-3" /> Exit
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 items-start pb-4">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="rounded-lg overflow-hidden shadow-2xl flex flex-col border border-primary/20 bg-[#1a1a1a]">
            {/* Section Header */}
            <div className="bg-primary px-3 py-2 md:px-4 md:py-2">
              <h3 className="text-lg md:text-xl font-heading font-bold text-black uppercase tracking-wide">
                {section.name}
              </h3>
            </div>
            
            {/* Section Body */}
            <div className="p-3 md:p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-2 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest w-[50%]">Exercise</th>
                    <th className="pb-2 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest text-center w-[15%]">Sets</th>
                    <th className="pb-2 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest text-center w-[20%]">Reps</th>
                    <th className="pb-2 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest text-center w-[15%]">Rest</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {section.exercises.map((ex, idx) => {
                    const libEx = exercises.find(e => String(e.id) === String(ex.name));
                    const exName = libEx ? libEx.name : ex.name;
                    const isLinkedToPrev = idx > 0 && section.exercises[idx - 1].linkedToNext;
                    
                    // Format Reps/Time
                    let displayReps = "";
                    const trackingArray = Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"];
                    
                    if (trackingArray.includes('Distance & Time') && ex.distance > 0) {
                      displayReps = `${ex.distance}m`;
                    } else if ((trackingArray.includes('Distance & Time') || trackingArray.includes('Time Only')) && (ex.timeMins > 0 || ex.timeSecs > 0)) {
                      displayReps = `${ex.timeMins > 0 ? `${ex.timeMins}m ` : ''}${ex.timeSecs > 0 ? `${ex.timeSecs}sec` : ''}`;
                    } else if (trackingArray.includes('Calories') && ex.calories > 0) {
                      displayReps = `${ex.calories} cal`;
                    } else {
                      displayReps = String(ex.reps || "");
                    }

                    return (
                      <tr key={idx} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 md:py-2 pr-2 font-bold text-sm md:text-base leading-tight">
                          <div className="flex items-center gap-2">
                            {isLinkedToPrev && <span className="text-primary font-normal">└</span>}
                            <span className="line-clamp-2">{exName}</span>
                          </div>
                        </td>
                        <td className="py-1.5 md:py-2 px-2 text-center font-bold text-sm md:text-base tabular-nums">{ex.sets > 0 ? ex.sets : "-"}</td>
                        <td className="py-1.5 md:py-2 px-2 text-center font-bold text-sm md:text-base tabular-nums">{displayReps || "-"}</td>
                        <td className="py-1.5 md:py-2 pl-2 text-center font-bold text-sm md:text-base tabular-nums">{ex.rest > 0 ? ex.rest : "0"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVDisplay;
