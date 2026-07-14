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

  return (
    <div className={`min-h-screen p-8 flex ${layout.orientation === 'portrait' ? 'flex-col' : 'flex-col'}`} style={{ backgroundColor: colors.background, color: '#ffffff' }}>
      <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-border">
        <div className="flex items-center gap-4">
          <Dumbbell className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-5xl font-heading tracking-wider font-bold uppercase">{program.name}</h1>
            {layout.showWeek && <h2 className="text-3xl text-muted-foreground font-heading tracking-wide mt-2">{workout.name}</h2>}
          </div>
        </div>
        <Button variant="outline" size="lg" className="gap-2" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" /> Exit TV Mode
        </Button>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full space-y-6">
        {workout.exercises.map((ex: any, idx: number) => {
          if (ex.isSection) {
            return (
              <div key={idx} className="mt-12 mb-6 border-b-4 border-primary pb-4">
                <h3 className="text-4xl font-heading font-bold uppercase tracking-widest text-primary">{ex.name}</h3>
                {ex.description && <p className="text-xl text-muted-foreground mt-2">{ex.description}</p>}
              </div>
            );
          }

          const libEx = exercises.find(e => e.id === ex.name);
          const exName = libEx ? libEx.name : ex.name;
          const movement = libEx?.movementType;
          
          const isLinkedToNext = ex.linkedToNext;
          const isLinkedToPrev = idx > 0 && workout.exercises[idx - 1].linkedToNext;

          return (
            <Card key={idx} className={`border-2 overflow-hidden flex flex-col ${isLinkedToNext ? 'border-b-0 rounded-b-none border-primary/50 relative z-10' : 'border-border'} ${isLinkedToPrev ? 'border-t-0 rounded-t-none border-primary/50 bg-primary/5 -mt-6' : ''}`} style={{ backgroundColor: colors.blockBackground, borderColor: isLinkedToNext || isLinkedToPrev ? undefined : 'rgba(255,255,255,0.1)' }}>
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  {isLinkedToPrev && (
                    <div className="text-primary text-sm uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" /> Superset
                    </div>
                  )}
                  <h4 className="text-3xl font-bold flex items-center gap-4">
                    {layout.showNumbers && <span className="text-muted-foreground opacity-50">{idx + 1}.</span>}
                    {exName}
                  </h4>
                  <div className="flex gap-2">
                    {ex.blockType && (
                      <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-bold uppercase tracking-wider">
                        {ex.blockType}
                      </span>
                    )}
                    {movement && (
                      <span className="inline-block px-3 py-1 bg-white/10 rounded-md text-sm font-medium border border-white/5">
                        {Array.isArray(movement) ? movement.join(", ") : movement}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-heading font-bold text-primary tabular-nums">
                    {(() => {
                      const trackingArray = Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"];
                      const parts = [];
                      if (trackingArray.includes('Weight & Reps')) parts.push(<span key="reps">{ex.sets} <span className="text-3xl text-white/50">×</span> {ex.reps}</span>);
                      if (trackingArray.includes('Distance & Time') && ex.distance > 0) parts.push(<span key="dist">{ex.distance}m</span>);
                      if ((trackingArray.includes('Distance & Time') || trackingArray.includes('Time Only')) && (ex.timeMins > 0 || ex.timeSecs > 0)) {
                        parts.push(<span key="time">{ex.timeMins > 0 ? `${ex.timeMins}m ` : ''}{ex.timeSecs > 0 ? `${ex.timeSecs}s` : ''}</span>);
                      }
                      if (trackingArray.includes('Calories') && ex.calories > 0) parts.push(<span key="cals">{ex.calories} cals</span>);
                      return parts.length > 0 ? parts.reduce((prev, curr) => <>{prev} <span className="text-3xl text-white/50">|</span> {curr}</>) : <>{ex.sets} <span className="text-3xl text-white/50">×</span> {ex.reps}</>;
                    })()}
                    {ex.eachSide && <span className="text-xl text-black bg-white px-2 py-1 rounded-md align-middle ml-2">E/Side</span>}
                  </div>
                  {ex.weight > 0 && (Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"]).includes('Weight & Reps') && (
                    <div className="text-2xl text-white/50 font-medium mt-2">
                      @ {ex.weight}kg
                    </div>
                  )}
                  {layout.showRest && ex.rest > 0 && (
                    <div className="text-xl text-white/40 font-medium mt-1">
                      Rest: {ex.rest}s
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TVDisplay;
