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

  // Group exercises by blockType
  const groupedExercises: Record<string, any[]> = {};
  workout.exercises.forEach((ex: any) => {
    const block = ex.blockType || "Strength";
    if (!groupedExercises[block]) groupedExercises[block] = [];
    groupedExercises[block].push(ex);
  });

  const blockOrder = ["Warm Up", "Mobility", "Activation", "Strength", "Cardio", "Cool Down"];
  const sortedBlocks = Object.keys(groupedExercises).sort((a, b) => {
    const indexA = blockOrder.indexOf(a);
    const indexB = blockOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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

      <div className="flex-1 grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {sortedBlocks.map(blockType => (
          <Card key={blockType} className="bg-card border-2 border-border overflow-hidden flex flex-col">
            <div className="bg-primary/10 border-b-2 border-border p-4">
              <h3 className="text-2xl font-heading font-bold uppercase tracking-widest text-primary">{blockType}</h3>
            </div>
            <CardContent className="p-0 flex-1">
              <div className="divide-y-2 divide-border/50">
                {groupedExercises[blockType].map((ex: any, idx: number) => {
                  const libEx = exercises.find(e => e.id === ex.name);
                  const exName = libEx ? libEx.name : ex.name;
                  const movement = libEx?.movementType;
                  
                  return (
                    <div key={idx} className="p-6 flex items-center justify-between bg-muted/20">
                      <div className="space-y-1">
                        <h4 className="text-2xl font-bold">{exName}</h4>
                        {movement && (
                          <span className="inline-block px-3 py-1 bg-muted rounded-md text-sm font-medium border border-border/50">
                            {movement}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-heading font-bold text-primary tabular-nums">
                          {ex.sets} <span className="text-2xl text-muted-foreground">×</span> {ex.reps}
                        </div>
                        {ex.weight > 0 && (
                          <div className="text-xl text-muted-foreground font-medium mt-1">
                            @ {ex.weight}kg
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TVDisplay;
