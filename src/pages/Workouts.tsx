import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Plus, Trash2, PlayCircle, History, Timer, X, Play, Pause, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { getExercises, getPrograms, saveWorkoutToHistory, getLastExerciseStats, getActiveProgram, saveActiveProgram } from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";
import { toast } from "sonner";

const REWARD_ITEMS = [
  { weight: 0.2, name: "Apple", plural: "Apples", emoji: "🍎" },
  { weight: 1, name: "Chicken", plural: "Chickens", emoji: "🐔" },
  { weight: 2, name: "Brick", plural: "Bricks", emoji: "🧱" },
  { weight: 5, name: "Cat", plural: "Cats", emoji: "🐈" },
  { weight: 7, name: "Bowling Ball", plural: "Bowling Balls", emoji: "🎳" },
  { weight: 10, name: "Watermelon", plural: "Watermelons", emoji: "🍉" },
  { weight: 15, name: "Car Tire", plural: "Car Tires", emoji: "🛞" },
  { weight: 20, name: "Microwave", plural: "Microwaves", emoji: "📻" },
  { weight: 40, name: "Toilet", plural: "Toilets", emoji: "🚽" },
  { weight: 50, name: "Large Dog", plural: "Large Dogs", emoji: "🐕" },
  { weight: 100, name: "Baby Elephant", plural: "Baby Elephants", emoji: "🐘" },
  { weight: 200, name: "Motorcycle", plural: "Motorcycles", emoji: "🏍️" },
  { weight: 250, name: "Grizzly Bear", plural: "Grizzly Bears", emoji: "🐻" },
  { weight: 300, name: "Vending Machine", plural: "Vending Machines", emoji: "🥤" },
  { weight: 500, name: "Horse", plural: "Horses", emoji: "🐎" },
  { weight: 1000, name: "Great White Shark", plural: "Great White Sharks", emoji: "🦈" },
  { weight: 1500, name: "Hippopotamus", plural: "Hippopotamuses", emoji: "🦛" },
  { weight: 2000, name: "Rhinoceros", plural: "Rhinoceroses", emoji: "🦏" },
  { weight: 3000, name: "Killer Whale", plural: "Killer Whales", emoji: "🐋" },
  { weight: 4000, name: "Helicopter", plural: "Helicopters", emoji: "🚁" },
  { weight: 5000, name: "Monster Truck", plural: "Monster Trucks", emoji: "🛻" },
  { weight: 7500, name: "T-Rex", plural: "T-Rexes", emoji: "🦖" },
  { weight: 10000, name: "School Bus", plural: "School Buses", emoji: "🚌" },
  { weight: 15000, name: "Fighter Jet", plural: "Fighter Jets", emoji: "🛩️" },
  { weight: 25000, name: "Humpback Whale", plural: "Humpback Whales", emoji: "🐳" },
  { weight: 50000, name: "Space Shuttle", plural: "Space Shuttles", emoji: "🚀" },
  { weight: 150000, name: "Blue Whale", plural: "Blue Whales", emoji: "🐋" },
  { weight: 400000, name: "Boeing 747", plural: "Boeing 747s", emoji: "✈️" },
];

const Workouts = () => {
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<any[]>([{ id: 1, blockType: "Strength", name: "", sets: 3, reps: 10, weight: 0 }]);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [rewardModal, setRewardModal] = useState<{name: string, emoji: string, volume: number, count?: number, displayName?: string} | null>(null);

  useEffect(() => {
    setExerciseLibrary(getExercises());
    setWorkoutTemplates(getPrograms());
    const active = getActiveProgram();
    setActiveProgram(active);
    if (active) {
      const currentWorkout = active.workouts[active.currentIndex];
      setWorkoutName(`${active.name}: ${currentWorkout.name}`);
      setExercises(currentWorkout.exercises.map((ex: any, idx: number) => ({ 
        id: Date.now() + idx, 
        blockType: ex.blockType || "Strength",
        ...ex 
      })));
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return prev;
          }
          if (prev === 1) {
            setTimerActive(false);
            toast.success("Rest time is up!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setTimerActive(true);
  };

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now(), blockType: "Strength", name: "", sets: 3, reps: 10, weight: 0 }]);
  };

  const removeExercise = (id: number) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: number, field: string, value: any) => {
    setExercises(exercises.map((e) => e.id === id ? { ...e, [field]: value } : e));
  };

  const loadTemplate = (template: typeof workoutTemplates[0]) => {
    if (template.workouts && template.workouts.length > 0) {
      // It's a structured program
      const newActive = {
        programId: template.id,
        name: template.name,
        weeks: template.weeks,
        daysPerWeek: template.daysPerWeek,
        workouts: template.workouts,
        currentIndex: 0
      };
      setActiveProgram(newActive);
      saveActiveProgram(newActive);
      
      const firstWorkout = template.workouts[0];
      setWorkoutName(`${template.name}: ${firstWorkout.name}`);
      setExercises(firstWorkout.exercises.map((ex: any, idx: number) => ({ id: Date.now() + idx, ...ex })));
      toast.success(`Started program: ${template.name}`);
    } else {
      // It's a simple program
      setWorkoutName(template.name);
      setExercises(template.exercises.map((ex: any, idx: number) => ({ id: Date.now() + idx, ...ex })));
    }
  };

  const handleSaveWorkout = () => {
    if (!workoutName) {
      toast.error("Please enter a workout name");
      return;
    }
    
    const totalVolume = exercises.reduce((acc, ex) => acc + ((ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0)), 0);
    
    const possibleRewards = REWARD_ITEMS.filter(item => totalVolume >= item.weight);
    let earnedReward = null;
    
    if (possibleRewards.length > 0) {
      const randomItem = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
      const count = Math.floor(totalVolume / randomItem.weight);
      earnedReward = {
        name: randomItem.name,
        emoji: randomItem.emoji,
        count: count,
        displayName: count === 1 ? randomItem.name : (randomItem.plural || randomItem.name + "s")
      };
    }
    
    saveWorkoutToHistory({
      name: workoutName,
      exercises,
      volume: totalVolume,
      reward: earnedReward || null
    });
    
    toast.success("Workout saved successfully!");

    if (earnedReward && totalVolume > 0) {
      setRewardModal({ ...earnedReward, volume: totalVolume });
    }
    
    if (activeProgram) {
      const nextIndex = activeProgram.currentIndex + 1;
      if (nextIndex < activeProgram.workouts.length) {
        const updatedProgram = { ...activeProgram, currentIndex: nextIndex };
        setActiveProgram(updatedProgram);
        saveActiveProgram(updatedProgram);
        
        const nextWorkout = activeProgram.workouts[nextIndex];
        setWorkoutName(`${activeProgram.name}: ${nextWorkout.name}`);
        setExercises(nextWorkout.exercises.map((ex: any, idx: number) => ({ id: Date.now() + idx, ...ex })));
        toast.info(`Up next: ${nextWorkout.name}`);
        return;
      } else {
        toast.success(`Congratulations! You completed ${activeProgram.name}!`);
        setActiveProgram(null);
        saveActiveProgram(null);
      }
    }
    
    setWorkoutName("");
    setExercises([{ id: Date.now(), name: "", sets: 3, reps: 10, weight: 0 }]);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Log Workout</h2>
      </div>

      {activeProgram && (
        <Card className="bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="font-heading tracking-wider flex justify-between items-center">
              <span>Active Program: {activeProgram.name}</span>
              <Button variant="outline" size="sm" onClick={() => { setActiveProgram(null); saveActiveProgram(null); setWorkoutName(""); setExercises([{ id: Date.now(), name: "", sets: 3, reps: 10, weight: 0 }]); }}>
                Leave Program
              </Button>
            </CardTitle>
            <CardDescription>
              Progress: Workout {activeProgram.currentIndex + 1} of {activeProgram.workouts.length} ({activeProgram.workouts[activeProgram.currentIndex].name})
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-heading tracking-wider font-semibold">Ready-Made Programs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workoutTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary transition-colors bg-card"
              onClick={() => loadTemplate(template)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-heading tracking-wider">{template.name}</CardTitle>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-wider">Current Session</CardTitle>
          <CardDescription>Record your sets, reps, and weights.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <Input 
              id="workout-name" 
              placeholder="e.g. Upper Body Power" 
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Exercises</h3>
              <Button onClick={addExercise} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Add Exercise
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium mr-2">Quick Rest:</span>
              <Button variant="outline" size="sm" onClick={() => startTimer(30)}>30s</Button>
              <Button variant="outline" size="sm" onClick={() => startTimer(60)}>1m</Button>
              <Button variant="outline" size="sm" onClick={() => startTimer(90)}>1.5m</Button>
              <Button variant="outline" size="sm" onClick={() => startTimer(120)}>2m</Button>
              <Button variant="outline" size="sm" onClick={() => startTimer(180)}>3m</Button>
            </div>

            {exercises.map((exercise) => {
              const libraryExercise = exerciseLibrary.find(e => e.id === exercise.name);
              const lastStats = exercise.name ? getLastExerciseStats(exercise.name) : null;
              
              return (
              <Card key={exercise.id} className="bg-muted/50 border-border">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                  <div className="space-y-2 flex-1 w-full">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Label>Exercise</Label>
                        {(exercise as any).blockType && (
                          <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                            {(exercise as any).blockType}
                          </span>
                        )}
                      </div>
                      {lastStats && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <History className="h-3 w-3" /> 
                          Last: {lastStats.weight}kg x {lastStats.reps} reps
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select 
                        value={exercise.name} 
                        onValueChange={(val) => updateExercise(exercise.id, "name", val)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select exercise" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input 
                              placeholder="Search exercises..." 
                              value={exerciseSearch} 
                              onChange={e => setExerciseSearch(e.target.value)}
                              className="mb-2 h-8"
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {exerciseLibrary
                            .filter(ex => {
                              if (!(exercise as any).blockType) return true;
                              const cats = Array.isArray(ex.category) ? ex.category : [ex.category || "Strength"];
                              return cats.includes((exercise as any).blockType);
                            })
                            .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(ex => (
                              <SelectItem key={ex.id} value={ex.id}>
                                {ex.name} {ex.movementType ? `(${ex.movementType})` : ""}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {libraryExercise?.videoUrl && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" title="Watch Tutorial">
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] bg-card border-border">
                            <DialogHeader>
                              <DialogTitle className="font-heading tracking-wider">{libraryExercise.name} Tutorial</DialogTitle>
                            </DialogHeader>
                            <div className="aspect-video mt-4 rounded-md overflow-hidden bg-muted">
                              <iframe 
                                src={getEmbedUrl(libraryExercise.videoUrl)} 
                                className="w-full h-full" 
                                allow="autoplay; fullscreen; picture-in-picture" 
                                allowFullScreen
                              ></iframe>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 w-full md:w-24">
                    <Label>Sets</Label>
                    <Input 
                      type="number" 
                      value={exercise.sets} 
                      onChange={(e) => updateExercise(exercise.id, "sets", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-24">
                    <Label>Reps</Label>
                    <Input 
                      type="number" 
                      value={exercise.reps} 
                      onChange={(e) => updateExercise(exercise.id, "reps", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-24">
                    <Label>Weight (kg)</Label>
                    <Input 
                      type="number" 
                      value={exercise.weight} 
                      onChange={(e) => updateExercise(exercise.id, "weight", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeExercise(exercise.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>

          <Button onClick={handleSaveWorkout} className="w-full gap-2 text-primary-foreground font-bold tracking-wide">
            <Dumbbell className="h-4 w-4" /> Save Workout
          </Button>
        </CardContent>
      </Card>

      {timeLeft !== null && (
        <div className="fixed bottom-6 right-6 bg-card border-2 border-primary shadow-xl rounded-lg p-4 flex flex-col items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center w-full mb-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rest Timer</span>
            <button onClick={() => { setTimeLeft(null); setTimerActive(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-4xl font-heading font-bold tabular-nums tracking-wider text-primary">
            {formatTime(timeLeft)}
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTimeLeft(prev => (prev || 0) + 30)}>
              <span className="text-xs font-bold">+30</span>
            </Button>
            <Button variant={timerActive ? "outline" : "default"} size="icon" className="h-8 w-8" onClick={() => setTimerActive(!timerActive)}>
              {timerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setTimeLeft(60); setTimerActive(true); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!rewardModal} onOpenChange={(open) => !open && setRewardModal(null)}>
        <DialogContent className="sm:max-w-md text-center bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading tracking-wider text-center">Workout Complete!</DialogTitle>
          </DialogHeader>
          {rewardModal && (
            <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in duration-500">
              <div className="text-8xl animate-bounce mt-4">{rewardModal.emoji}</div>
              <h3 className="text-2xl font-bold text-primary">
                You lifted {rewardModal.count && rewardModal.count > 1 ? `${rewardModal.count.toLocaleString()} ` : 'a '}{rewardModal.displayName || rewardModal.name}!
              </h3>
              <p className="text-muted-foreground text-lg">
                Your total volume this session was <strong className="text-foreground">{rewardModal.volume.toLocaleString()} kg</strong>.
                <br/>That's roughly the weight of {rewardModal.count && rewardModal.count > 1 ? `${rewardModal.count.toLocaleString()} ${(rewardModal.displayName || rewardModal.name).toLowerCase()}` : `a ${(rewardModal.name).toLowerCase()}`}!
              </p>
              <Button className="mt-4 w-full text-lg h-12 font-bold tracking-wide" onClick={() => setRewardModal(null)}>Awesome!</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workouts;
