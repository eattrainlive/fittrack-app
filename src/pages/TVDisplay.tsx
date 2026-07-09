import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPrograms, getExercises } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TVDisplay = () => {
  const { programId, workoutIndex } = useParams();
  const navigate = useNavigate();
  
  const [program, setProgram] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  
  useEffect(() => {
    const allPrograms = getPrograms();
    const allExercises = getExercises();
    
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
  }, [programId, workoutIndex]);

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-4">Workout Not Found</h1>
        <Button onClick={() => navigate("/admin")}>Return to Staff Hub</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col">
      <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-border">
        <div className="flex items-center gap-4">
          <Dumbbell className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-5xl font-heading tracking-wider font-bold uppercase">{program.name}</h1>
            <h2 className="text-3xl text-muted-foreground font-heading tracking-wide mt-2">{workout.name}</h2>
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
            <Card key={idx} className={`bg-card border-2 overflow-hidden flex flex-col ${isLinkedToNext ? 'border-b-0 rounded-b-none border-primary/50 relative z-10' : 'border-border'} ${isLinkedToPrev ? 'border-t-0 rounded-t-none border-primary/50 bg-primary/5 -mt-6' : ''}`}>
              <div className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  {isLinkedToPrev && (
                    <div className="text-primary text-sm uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" /> Superset
                    </div>
                  )}
                  <h4 className="text-3xl font-bold">{exName}</h4>
                  <div className="flex gap-2">
                    {ex.blockType && (
                      <span className="inline-block px-3 py-1 bg-primary/20 text-primary rounded-md text-sm font-bold uppercase tracking-wider">
                        {ex.blockType}
                      </span>
                    )}
                    {movement && (
                      <span className="inline-block px-3 py-1 bg-muted rounded-md text-sm font-medium border border-border/50">
                        {Array.isArray(movement) ? movement.join(", ") : movement}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-heading font-bold text-primary tabular-nums">
                    {ex.sets} <span className="text-3xl text-muted-foreground">×</span> {ex.reps} {ex.eachSide && <span className="text-xl text-secondary-foreground bg-secondary px-2 py-1 rounded-md align-middle ml-2">E/Side</span>}
                  </div>
                  {ex.weight > 0 && (
                    <div className="text-2xl text-muted-foreground font-medium mt-2">
                      @ {ex.weight}kg
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
