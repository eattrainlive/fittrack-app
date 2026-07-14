import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Plus, Minus, Trash2, PlayCircle, History, Timer, X, Play, Pause, RotateCcw, Link2, Link2Off, Heading, List, Check, Search, ArrowLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getExercises, getPrograms, saveWorkoutToHistory, getLastExerciseStats, getActiveProgram, saveActiveProgram } from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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

const Stepper = ({ value, onChange, step = 1, completed, isDecimal = false }: any) => (
  <div className={`flex items-center justify-between w-full max-w-[110px] h-11 rounded-md bg-background border transition-colors focus-within:ring-1 focus-within:ring-primary ${completed ? 'border-transparent bg-transparent' : 'border-border'}`}>
    <button 
      type="button"
      className={`h-full w-9 sm:w-10 shrink-0 rounded-l-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? 'opacity-0 pointer-events-none' : ''}`}
      onClick={() => onChange(Math.max(0, (value || 0) - step))}
    >
      <Minus className="h-3 w-3" />
    </button>
    <input 
      type="number" 
      inputMode={isDecimal ? "decimal" : "numeric"}
      className="w-[3ch] flex-1 min-w-0 tabular-nums text-center font-semibold text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0"
      value={value === 0 || value === undefined ? '' : value} 
      onChange={(e) => onChange(isDecimal ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
      placeholder="0"
    />
    <button 
      type="button"
      className={`h-full w-9 sm:w-10 shrink-0 rounded-r-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? 'opacity-0 pointer-events-none' : ''}`}
      onClick={() => onChange((value || 0) + step)}
    >
      <Plus className="h-3 w-3" />
    </button>
  </div>
);

const Workouts = () => {
  const navigate = useNavigate();
  const [viewMode, setViewModeState] = useState<'browse' | 'detail' | 'active'>('browse');
  const [viewDirection, setViewDirection] = useState<'forward' | 'backward'>('forward');

  const setViewMode = (newMode: 'browse' | 'detail' | 'active') => {
    const depths = { browse: 0, detail: 1, active: 2 };
    setViewDirection(depths[newMode] > depths[viewMode] ? 'forward' : 'backward');
    setViewModeState(newMode);
  };
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<any[]>([{ id: 1, blockType: "Strength", name: "", setsData: [{ id: '1', reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }, { id: '2', reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }, { id: '3', reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }], rest: 0, linkedToNext: false, eachSide: false }]);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [rewardModal, setRewardModal] = useState<{name: string, emoji: string, volume: number, count?: number, displayName?: string} | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [quickOverviewWorkout, setQuickOverviewWorkout] = useState<any>(null);
  const [showSectionSlide, setShowSectionSlide] = useState(false);
  const [lastSeenSectionId, setLastSeenSectionId] = useState<number | null>(null);


  const isActiveWorkout = useMemo(() => {
    if (activeProgram) return true;
    if (workoutName.trim() !== "") return true;
    if (exercises.length > 1) return true;
    if (exercises.length === 1 && exercises[0].name) return true;
    return false;
  }, [activeProgram, workoutName, exercises]);

  const blocks = useMemo(() => {
    const result: any[] = [];
    let currentSection: any = null;
    let currentGroup: any[] = [];

    exercises.forEach((ex, index) => {
      if (ex.isSection) {
        currentSection = ex;
      } else {
        currentGroup.push(ex);
        if (!ex.linkedToNext) {
          result.push({
            id: `block-${index}`,
            type: currentGroup.length > 1 ? 'superset' : 'single',
            exercises: currentGroup,
            section: currentSection
          });
          currentGroup = [];
        }
      }
    });
    
    if (currentGroup.length > 0) {
      result.push({
        id: `block-end`,
        type: currentGroup.length > 1 ? 'superset' : 'single',
        exercises: currentGroup,
        section: currentSection
      });
    }
    
    return result;
  }, [exercises]);

  useEffect(() => {
    const loadData = () => {
      setExerciseLibrary(getExercises());
      setWorkoutTemplates(getPrograms());
      const active = getActiveProgram();
      setActiveProgram(active);
      if (active && active.workouts) {
        const currentWorkout = active.workouts[active.currentIndex];
        if (currentWorkout && currentWorkout.exercises) {
          setWorkoutName(`${active.name}: ${currentWorkout.name}`);
          setExercises(currentWorkout.exercises.map((ex: any, idx: number) => ({ 
            id: Date.now() + idx, 
            blockType: ex.blockType || "Strength",
            ...ex,
            setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
              id: Date.now().toString() + i,
              reps: ex.reps || 10,
              weight: ex.weight || 0,
              distance: ex.distance || 0,
              timeMins: ex.timeMins || 0,
              timeSecs: ex.timeSecs || 0,
              completed: false
            }))
          })));
          setViewMode('active');
        }
      }
    };
    
    loadData();
    window.addEventListener('fittrack_synced', loadData);
    return () => window.removeEventListener('fittrack_synced', loadData);
  }, []);

  useEffect(() => {
    if (blocks.length > 0 && currentBlockIndex >= blocks.length) {
      setCurrentBlockIndex(Math.max(0, blocks.length - 1));
    }
  }, [blocks.length, currentBlockIndex]);

  useEffect(() => {
    if (viewMode === 'active' && blocks.length > 0 && currentBlockIndex < blocks.length) {
      const currentSection = blocks[currentBlockIndex].section;
      if (currentSection && currentSection.id !== lastSeenSectionId) {
        setLastSeenSectionId(currentSection.id);
        setShowSectionSlide(true);
      } else if (!currentSection && lastSeenSectionId !== null) {
        setLastSeenSectionId(null);
      }
    }
  }, [currentBlockIndex, blocks, viewMode, lastSeenSectionId]);

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
            return null;
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
    setExercises([...exercises, { id: Date.now(), blockType: "Strength", name: "", setsData: [{ id: Date.now().toString(), reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }], rest: 0, linkedToNext: false, eachSide: false }]);
  };

  const removeExercise = (id: number) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: number, field: string, value: any) => {
    setExercises(exercises.map((e) => e.id === id ? { ...e, [field]: value } : e));
  };

  const openTemplateDetail = (template: any) => {
    setSelectedTemplate(template);
    setViewMode('detail');
  };

  const startTemplate = (template: any) => {
    if (template.workouts && template.workouts.length > 0) {
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
      setExercises(firstWorkout.exercises.map((ex: any, idx: number) => ({ 
        id: Date.now() + idx, 
        ...ex,
        setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
          id: Date.now().toString() + i,
          reps: ex.reps || 10,
          weight: ex.weight || 0,
          distance: ex.distance || 0,
          timeMins: ex.timeMins || 0,
          timeSecs: ex.timeSecs || 0,
          completed: false
        }))
      })));
      setCurrentBlockIndex(0);
      setLastSeenSectionId(null);
      setShowSectionSlide(false);
      toast.success(`Started program: ${template.name}`);
    } else {
      setWorkoutName(template.name);
      setExercises(template.exercises.map((ex: any, idx: number) => ({ 
        id: Date.now() + idx, 
        ...ex,
        setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
          id: Date.now().toString() + i,
          reps: ex.reps || 10,
          weight: ex.weight || 0,
          distance: ex.distance || 0,
          timeMins: ex.timeMins || 0,
          timeSecs: ex.timeSecs || 0,
          completed: false
        }))
      })));
      setCurrentBlockIndex(0);
      setLastSeenSectionId(null);
      setShowSectionSlide(false);
    }
    setViewMode('active');
  };

  const handleSaveWorkout = () => {
    if (!workoutName) {
      toast.error("Please enter a workout name");
      return;
    }
    
    const totalVolume = exercises.reduce((acc, ex) => {
      if (ex.isSection || !ex.setsData) return acc;
      const completedSets = ex.setsData.filter((s: any) => s.completed);
      const setsToCount = completedSets.length > 0 ? completedSets : ex.setsData;
      return acc + setsToCount.reduce((setAcc: number, set: any) => 
        setAcc + ((set.reps || 0) * (ex.eachSide ? 2 : 1) * (set.weight || 0))
      , 0);
    }, 0);
    
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
    
    if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 50]);
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
        setExercises(nextWorkout.exercises.map((ex: any, idx: number) => ({ 
          id: Date.now() + idx, 
          ...ex,
          setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
            id: Date.now().toString() + i,
            reps: ex.reps || 10,
            weight: ex.weight || 0,
            distance: ex.distance || 0,
            timeMins: ex.timeMins || 0,
            timeSecs: ex.timeSecs || 0,
            completed: false
          }))
        })));
        setCurrentBlockIndex(0);
        setLastSeenSectionId(null);
        setShowSectionSlide(false);
        toast.info(`Up next: ${nextWorkout.name}`);
        return;
      } else {
        toast.success(`Congratulations! You completed ${activeProgram.name}!`);
        setActiveProgram(null);
        saveActiveProgram(null);
      }
    }
    
    setWorkoutName("");
    setExercises([{ id: Date.now(), name: "", setsData: [{ id: Date.now().toString(), reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }], rest: 0, linkedToNext: false, eachSide: false }]);
    setCurrentBlockIndex(0);
    setLastSeenSectionId(null);
    setShowSectionSlide(false);
    setViewMode('browse');
  };

  const variants: any = {
    initial: (direction: string) => ({
      x: direction === 'forward' ? "100%" : "-20%",
      opacity: direction === 'forward' ? 1 : 0.5,
      zIndex: direction === 'forward' ? 3 : 1
    }),
    animate: (direction: string) => ({ 
      x: 0, 
      opacity: 1, 
      zIndex: direction === 'forward' ? 3 : 1,
      transition: { duration: 0.25, ease: "easeOut" } 
    }),
    exit: (direction: string) => ({
      x: direction === 'forward' ? "-20%" : "100%",
      opacity: direction === 'forward' ? 0.5 : 1,
      zIndex: direction === 'forward' ? 1 : 3,
      transition: { duration: 0.25, ease: "easeIn" }
    })
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full relative">
      <AnimatePresence mode="popLayout" custom={viewDirection}>
        {viewMode === 'browse' && (
          <motion.div 
            key="browse"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24"
          >
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-heading tracking-wider font-bold uppercase">Browse</h2>
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Workouts", "Programs"].map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                className={activeTab === tab ? "bg-primary text-primary-foreground font-bold rounded-full" : "rounded-full font-medium"}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search workouts or programs..." 
              className="pl-10 h-12 bg-muted/50 border-transparent focus-visible:border-primary rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {workoutTemplates
              .filter(t => activeTab === "All" || (activeTab === "Programs" && t.workouts) || (activeTab === "Workouts" && !t.workouts))
              .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((template) => (
              <div 
                key={template.id} 
                className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                onClick={() => openTemplateDetail(template)}
              >
                <div className="absolute inset-0 bg-muted">
                  <img src={template.coverImage || "https://vibe.filesafe.space/1783496939163756206/assets/d81fb983-0fbc-4056-ae4e-83766de15850.png"} alt={template.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                  <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1">
                    {template.workouts ? `${template.weeks || 4} WEEK PROGRAMME` : 'SINGLE WORKOUT'}
                  </span>
                  <h3 className="text-white font-heading text-3xl uppercase leading-tight">{template.name}</h3>
                </div>
              </div>
            ))}
          </div>
          
          {activeProgram && (
            <div className="pt-4">
              <Button onClick={() => setViewMode('active')} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl">
                Resume {activeProgram.name}
              </Button>
            </div>
          )}
        </motion.div>
        )}

        {viewMode === 'detail' && selectedTemplate && (
          <motion.div 
            key="detail"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24"
          >
          <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md -mx-4 -mt-6 rounded-t-none md:mx-0 md:mt-0 md:rounded-t-2xl">
             <img src={selectedTemplate.coverImage || "https://vibe.filesafe.space/1783496939163756206/assets/d81fb983-0fbc-4056-ae4e-83766de15850.png"} alt={selectedTemplate.name} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
             
             <div className="absolute top-4 left-4 z-10">
               <Button variant="ghost" size="icon" onClick={() => setViewMode('browse')} className="shrink-0 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:text-white">
                 <ArrowLeft className="h-5 w-5" />
               </Button>
             </div>
             
             <div className="absolute bottom-4 left-4 right-4 z-10">
               <h2 className="text-3xl font-heading tracking-wider font-bold uppercase text-white leading-tight">{selectedTemplate.name}</h2>
             </div>
          </div>

          <div className="space-y-4 px-4 md:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedTemplate.workouts ? 'Programme' : 'Workout'}
              </span>
              {selectedTemplate.weeks && (
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTemplate.weeks} Weeks
                </span>
              )}
              {selectedTemplate.daysPerWeek && (
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTemplate.daysPerWeek} Days/Week
                </span>
              )}
              {selectedTemplate.level && (
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTemplate.level}
                </span>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">{selectedTemplate.description || "No description provided."}</p>
          </div>

          <div className="px-4 md:px-0 pt-2">
            {activeProgram && activeProgram.programId === selectedTemplate.id ? (
              <div className="space-y-3">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Workout {activeProgram.currentIndex + 1} of {activeProgram.workouts.length}
                </div>
                <Button onClick={() => setViewMode('active')} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg">
                  <Play className="h-5 w-5 fill-current" /> Continue Programme
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => { setActiveProgram(null); saveActiveProgram(null); }} 
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Leave Programme
                </Button>
              </div>
            ) : (
              <Button onClick={() => startTemplate(selectedTemplate)} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg">
                <Play className="h-5 w-5 fill-current" /> Start {selectedTemplate.workouts ? 'Programme' : 'Workout'}
              </Button>
            )}
          </div>

          <div className="px-4 md:px-0 space-y-6 pt-4">
            {selectedTemplate.workouts ? (
              <div className="space-y-6">
                {Array.from({ length: selectedTemplate.weeks || 1 }).map((_, weekIdx) => {
                  const daysPerWeek = selectedTemplate.daysPerWeek || 3;
                  const startIndex = weekIdx * daysPerWeek;
                  const weekWorkouts = selectedTemplate.workouts.slice(startIndex, startIndex + daysPerWeek);
                  
                  if (weekWorkouts.length === 0) return null;
                  
                  return (
                    <div key={weekIdx} className="space-y-3">
                      <h3 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">Week {weekIdx + 1}</h3>
                      <div className="space-y-2">
                        {weekWorkouts.map((w: any, dayIdx: number) => {
                          const globalIdx = startIndex + dayIdx;
                          const isCompleted = activeProgram && activeProgram.programId === selectedTemplate.id && globalIdx < activeProgram.currentIndex;
                          const isActive = activeProgram && activeProgram.programId === selectedTemplate.id && globalIdx === activeProgram.currentIndex;
                          
                          return (
                            <div 
                              key={globalIdx} 
                              onClick={() => {
                                setQuickOverviewWorkout({ workout: w, index: globalIdx, template: selectedTemplate });
                              }}
                              className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${isActive ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                  {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{dayIdx + 1}</span>}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Day {dayIdx + 1}</div>
                                  <div className="font-bold leading-tight">{w.name}</div>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                                {w.exercises?.length || 0} exercises
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">Exercises</h3>
                <div className="space-y-2">
                  {selectedTemplate.exercises?.map((ex: any, idx: number) => {
                    const libEx = exerciseLibrary.find(e => e.id === ex.name);
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-card flex justify-between items-center">
                        <div className="font-bold">{libEx ? libEx.name : (ex.name || "Unknown")}</div>
                        <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">{ex.sets || 3} sets</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        )}

        {viewMode === 'active' && (
          <motion.div 
            key="active"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24"
          >
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-heading tracking-wider font-bold uppercase">Log Workout</h2>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('browse')} className="text-muted-foreground">
              Cancel
            </Button>
          </div>

          {activeProgram && (
            <Card className="bg-primary/10 border-primary">
              <CardHeader>
                <CardTitle className="font-heading tracking-wider flex justify-between items-center">
                  <span>{activeProgram.name}</span>
                  <Button variant="outline" size="sm" onClick={() => { setActiveProgram(null); saveActiveProgram(null); setWorkoutName(""); setExercises([{ id: Date.now(), name: "", setsData: [{ id: Date.now().toString(), reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }], linkedToNext: false, eachSide: false }]); setViewMode('browse'); }}>
                    Leave
                  </Button>
                </CardTitle>
                <CardDescription>
                  Progress: Workout {activeProgram.currentIndex + 1} of {activeProgram.workouts.length} ({activeProgram.workouts[activeProgram.currentIndex].name})
                </CardDescription>
              </CardHeader>
            </Card>
          )}

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
                  <div className="flex gap-2">
                    <Button onClick={() => setExercises([...exercises, { id: Date.now(), isSection: true, name: "New Section", description: "" }])} variant="outline" size="sm" className="gap-2">
                      <Heading className="h-4 w-4" /> Add Section
                    </Button>
                    <Button onClick={addExercise} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Add Exercise
                    </Button>
                  </div>
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

                {blocks.length > 0 && (() => {
                  const currentBlock = blocks[currentBlockIndex];
                  if (!currentBlock) return null;
                  
                  if (showSectionSlide && currentBlock.section) {
                    const sectionIndex = exercises.findIndex(e => e.id === currentBlock.section.id);
                    const sectionExercises = [];
                    if (sectionIndex !== -1) {
                      for (let i = sectionIndex + 1; i < exercises.length; i++) {
                        const ex = exercises[i];
                        if (ex.isSection) break;
                        if (ex.name) {
                          const libEx = exerciseLibrary.find(le => le.id === ex.name);
                          const name = libEx ? libEx.name : ex.name;
                          
                          const setsCount = ex.setsData?.length || ex.sets || 3;
                          const firstSet = ex.setsData?.[0] || ex || {};
                          
                          const trackingArray = Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"];
                          
                          let details = [];
                          if (trackingArray.includes('Weight & Reps')) {
                            details.push(`${firstSet.reps || 0} reps`);
                          }
                          if (trackingArray.includes('Distance & Time')) {
                            if (firstSet.distance) details.push(`${firstSet.distance}m`);
                          }
                          if (trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) {
                            const m = firstSet.timeMins || 0;
                            const s = firstSet.timeSecs || 0;
                            if (m || s) details.push(`${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim());
                          }
                          if (trackingArray.includes('Calories')) {
                            if (firstSet.calories) details.push(`${firstSet.calories} cals`);
                          }
                          
                          const detailStr = details.length > 0 ? details.join(', ') : '';
                          
                          sectionExercises.push({
                            id: ex.id || i,
                            name,
                            sets: setsCount,
                            details: detailStr
                          });
                        }
                      }
                    }

                    return (
                      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-4">
                          <span className="text-primary font-bold tracking-wider uppercase text-sm">Entering Section</span>
                          <h2 className="text-4xl font-heading uppercase tracking-wider text-foreground">{currentBlock.section.name}</h2>
                          {currentBlock.section.description ? (
                            <p className="text-muted-foreground text-lg px-4 whitespace-pre-wrap">{currentBlock.section.description}</p>
                          ) : sectionExercises.length > 0 ? (
                            <div className="text-muted-foreground text-lg px-4 space-y-3">
                              <p className="font-bold mb-2 uppercase text-sm tracking-wider opacity-80">Up Next:</p>
                              {sectionExercises.map((item, i) => (
                                <div key={item.id} className="flex flex-col leading-tight">
                                  <span className="font-medium text-foreground">{item.name}</span>
                                  <span className="opacity-70 text-sm">
                                    {item.sets} sets {item.details ? `× ${item.details}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <Button 
                          size="lg" 
                          className="w-full max-w-[250px] font-bold tracking-wide text-lg h-14 bg-primary text-primary-foreground"
                          onClick={() => setShowSectionSlide(false)}
                        >
                          Start Section
                        </Button>
                        {currentBlockIndex > 0 && (
                          <Button 
                            variant="ghost" 
                            className="text-muted-foreground"
                            onClick={() => {
                              setShowSectionSlide(false);
                              setCurrentBlockIndex(prev => Math.max(0, prev - 1));
                            }}
                          >
                            Go Back
                          </Button>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                      <div className="flex justify-between items-center text-sm font-bold text-muted-foreground tracking-wider uppercase">
                        <span>Block {currentBlockIndex + 1} of {blocks.length}</span>
                        {currentBlock.section && <span className="text-primary">{currentBlock.section.name}</span>}
                      </div>
                      
                      {currentBlock.type === 'superset' ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-6 relative">
                          <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">
                            Superset
                          </div>
                          <p className="text-xs text-muted-foreground font-medium pt-2">
                            Perform one set of each exercise back-to-back. No rest between exercises.
                          </p>
                          
                          <div className="space-y-4 mb-6">
                            {currentBlock.exercises.map((exercise: any, exIdx: number) => {
                              const libraryExercise = exerciseLibrary.find(e => e.id === exercise.name);
                              const lastStats = exercise.name ? getLastExerciseStats(exercise.name) : null;
                              const letter = String.fromCharCode(65 + exIdx);
                              
                              return (
                                <div key={exercise.id} className="bg-background rounded-lg p-3 border border-border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{letter}</div>
                                    <div className="flex-1">
                                      <Select 
                                        value={exercise.name} 
                                        onValueChange={(val) => updateExercise(exercise.id, "name", val)}
                                      >
                                        <SelectTrigger className="h-8">
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
                                              if (!exercise.blockType) return true;
                                              const cats = Array.isArray(ex.category) ? ex.category : [ex.category || "Strength"];
                                              return cats.includes(exercise.blockType);
                                            })
                                            .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(ex => (
                                              <SelectItem key={ex.id} value={ex.id}>
                                                {ex.name} {ex.movementType ? `(${Array.isArray(ex.movementType) ? ex.movementType.join(", ") : ex.movementType})` : ""}
                                              </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {libraryExercise?.videoUrl && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Watch Tutorial">
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
                                  {exercise.name && (
                                    <div className="ml-8 text-xs text-muted-foreground flex items-center gap-1">
                                      <History className="h-3 w-3" /> 
                                      {lastStats ? `Last time: ${lastStats.weight}kg × ${lastStats.reps}` : `First time — no previous data`}
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-4">
                                      <Label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Each Side</span>
                                        <input 
                                          type="checkbox" 
                                          checked={exercise.eachSide || false}
                                          onChange={(e) => updateExercise(exercise.id, "eachSide", e.target.checked)}
                                          className="h-4 w-4 accent-primary"
                                        />
                                      </Label>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Rest (s)</span>
                                        <Input 
                                          type="number" 
                                          className="h-7 w-16 text-xs px-2" 
                                          value={exercise.rest || 0} 
                                          onChange={(e) => updateExercise(exercise.id, "rest", parseInt(e.target.value) || 0)} 
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant={exercise.linkedToNext ? "default" : "outline"} 
                                        size="sm" 
                                        className={exercise.linkedToNext ? "bg-primary text-primary-foreground h-11 w-11 px-0" : "h-11 w-11 px-0"}
                                        onClick={() => updateExercise(exercise.id, "linkedToNext", !exercise.linkedToNext)}
                                        title={exercise.linkedToNext ? "Unlink from next" : "Link to next as superset"}
                                      >
                                        {exercise.linkedToNext ? <Link2Off className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-11 w-11 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeExercise(exercise.id)}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-6">
                            {Array.from({ length: Math.max(...currentBlock.exercises.map((e: any) => e.setsData?.length || 0)) }).map((_, roundIndex) => {
                              const allTrackingTypes = currentBlock.exercises.flatMap((e: any) => {
                                const libEx = exerciseLibrary.find(le => le.id === e.name);
                                return Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"];
                              });
                              const trackingArray = Array.from(new Set(allTrackingTypes));
                              
                              const showWeight = trackingArray.includes('Weight & Reps');
                              const showReps = trackingArray.includes('Weight & Reps');
                              const showDistance = trackingArray.includes('Distance & Time');
                              const showTimeMins = trackingArray.includes('Distance & Time') || trackingArray.includes('Time Only');
                              const showTimeSecs = trackingArray.includes('Time Only');
                              const showCalories = trackingArray.includes('Calories');

                              const activeCols = [
                                showWeight && { label: 'KG', field: 'weight', step: 2.5, isDecimal: true },
                                showReps && { label: 'Reps', field: 'reps', step: 1 },
                                showDistance && { label: 'Metres', field: 'distance', step: 50 },
                                showTimeMins && { label: 'Mins', field: 'timeMins', step: 1 },
                                showTimeSecs && { label: 'Secs', field: 'timeSecs', step: 5 },
                                showCalories && { label: 'Cals', field: 'calories', step: 1 }
                              ].filter(Boolean) as any[];
                              
                              return (
                              <div key={roundIndex} className="space-y-2">
                                <h4 className="text-sm font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                                  Round {roundIndex + 1}
                                  <div className="h-px bg-border flex-1"></div>
                                </h4>
                                
                                <div 
                                  className="grid gap-1 items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1"
                                  style={{ gridTemplateColumns: `40px repeat(${Math.max(1, activeCols.length)}, 1fr) 48px` }}
                                >
                                  <div className="text-center">Ex</div>
                                  {activeCols.map((col, i) => (
                                    <div key={i} className="text-center">{col.label}</div>
                                  ))}
                                  <div className="flex justify-center"><Check className="h-3 w-3" /></div>
                                </div>
                                
                                {currentBlock.exercises.map((exercise: any, exIdx: number) => {
                                  const set = exercise.setsData?.[roundIndex];
                                  if (!set) return null;
                                  const letter = String.fromCharCode(65 + exIdx);
                                  
                                  return (
                                    <div 
                                      key={set.id} 
                                      className={`grid gap-1 items-center p-2 rounded-lg transition-colors ${set.completed ? 'bg-primary/20 border border-primary/50' : 'bg-background border border-border'}`}
                                      style={{ gridTemplateColumns: `40px repeat(${Math.max(1, activeCols.length)}, 1fr) 48px` }}
                                    >
                                      <div className="text-sm font-bold text-center text-primary shrink-0">{letter}</div>
                                      
                                      {activeCols.map((col, i) => (
                                        <div key={i} className="flex justify-center">
                                          <Stepper 
                                            value={set[col.field] || 0} 
                                            onChange={(v: number) => {
                                              const newSets = [...exercise.setsData];
                                              newSets[roundIndex] = { ...set, [col.field]: v };
                                              updateExercise(exercise.id, "setsData", newSets);
                                            }}
                                            step={col.step}
                                            isDecimal={col.isDecimal}
                                            completed={set.completed}
                                          />
                                        </div>
                                      ))}

                                      <div className="flex justify-center shrink-0">
                                          <button 
                                            onClick={() => {
                                              const newSets = [...exercise.setsData];
                                              const isCompleting = !set.completed;
                                              newSets[roundIndex] = { ...set, completed: isCompleting };
                                              updateExercise(exercise.id, "setsData", newSets);
                                              
                                              if (isCompleting) {
                                                if (navigator.vibrate) navigator.vibrate(10);
                                                if (exIdx === currentBlock.exercises.length - 1) {
                                                  const restTime = exercise.rest || 0;
                                                  if (restTime > 0) {
                                                    startTimer(restTime);
                                                  }
                                                }
                                              }
                                            }}
                                            className={`relative h-8 w-8 rounded-full flex items-center justify-center transition-all after:absolute after:-inset-2 after:content-[''] ${set.completed ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground/30 text-transparent hover:border-primary/50'}`}
                                          >
                                            <Check className="h-4 w-4" />
                                          </button>
                                      </div>
                                </div>
                              );
                            })}
                              </div>
                              );
                            })}
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-2 text-primary font-bold tracking-wide"
                            onClick={() => {
                              currentBlock.exercises.forEach((exercise: any) => {
                                const lastSet = exercise.setsData?.[exercise.setsData.length - 1];
                                const newSets = [...(exercise.setsData || []), {
                                  id: Date.now().toString() + Math.random(),
                                  reps: lastSet ? lastSet.reps : 10,
                                  weight: lastSet ? lastSet.weight : 0,
                                  distance: lastSet ? lastSet.distance : 0,
                                  timeMins: lastSet ? lastSet.timeMins : 0,
                                  timeSecs: lastSet ? lastSet.timeSecs : 0,
                                  completed: false
                                }];
                                updateExercise(exercise.id, "setsData", newSets);
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Round
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentBlock.exercises.map((exercise: any) => {
                            const libraryExercise = exerciseLibrary.find(e => e.id === exercise.name);
                            const lastStats = exercise.name ? getLastExerciseStats(exercise.name) : null;
                            
                            return (
                              <Card key={exercise.id} className="bg-muted/50 border-border">
                                <CardContent className="p-4 flex flex-col gap-4">
                                  <div className="space-y-2 w-full">
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        <Label>Exercise</Label>
                                        {exercise.blockType && (
                                          <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                            {exercise.blockType}
                                          </span>
                                        )}
                                      </div>
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
                                              if (!exercise.blockType) return true;
                                              const cats = Array.isArray(ex.category) ? ex.category : [ex.category || "Strength"];
                                              return cats.includes(exercise.blockType);
                                            })
                                            .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(ex => (
                                              <SelectItem key={ex.id} value={ex.id}>
                                                {ex.name} {ex.movementType ? `(${Array.isArray(ex.movementType) ? ex.movementType.join(", ") : ex.movementType})` : ""}
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
                                    {exercise.name && (
                                      <div className="mt-1.5 flex">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <History className="h-3 w-3" /> 
                                          {lastStats ? `Last time: ${lastStats.weight}kg × ${lastStats.reps}` : `First time — no previous data`}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="w-full">
                                    {(() => {
                                      const trackingArray = Array.isArray(libraryExercise?.trackingType) ? libraryExercise.trackingType : [libraryExercise?.trackingType || "Weight & Reps"];
                                      
                                      const showWeight = trackingArray.includes('Weight & Reps');
                                      const showReps = trackingArray.includes('Weight & Reps');
                                      const showDistance = trackingArray.includes('Distance & Time');
                                      const showTimeMins = trackingArray.includes('Distance & Time') || trackingArray.includes('Time Only');
                                      const showTimeSecs = trackingArray.includes('Time Only');
                                      const showCalories = trackingArray.includes('Calories');

                                      const activeCols = [
                                        showWeight && { label: 'KG', field: 'weight', step: 2.5, isDecimal: true },
                                        showReps && { label: 'Reps', field: 'reps', step: 1 },
                                        showDistance && { label: 'Metres', field: 'distance', step: 50 },
                                        showTimeMins && { label: 'Mins', field: 'timeMins', step: 1 },
                                        showTimeSecs && { label: 'Secs', field: 'timeSecs', step: 5 },
                                        showCalories && { label: 'Cals', field: 'calories', step: 1 }
                                      ].filter(Boolean) as any[];

                                      return (
                                        <>
                                          <div 
                                            className="grid gap-1 items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2"
                                            style={{ gridTemplateColumns: `40px repeat(${Math.max(1, activeCols.length)}, 1fr) 48px` }}
                                          >
                                            <div className="text-center">Set</div>
                                            {activeCols.map((col, i) => (
                                              <div key={i} className="text-center">{col.label}</div>
                                            ))}
                                            <div className="flex justify-center"><Check className="h-3 w-3" /></div>
                                          </div>
                                          <div className="space-y-2">
                                            {exercise.setsData?.map((set: any, setIndex: number) => (
                                              <div 
                                                key={set.id} 
                                                className={`grid gap-1 items-center p-2 rounded-lg transition-colors ${set.completed ? 'bg-primary/20 border border-primary/50' : 'bg-background border border-border'}`}
                                                style={{ gridTemplateColumns: `40px repeat(${Math.max(1, activeCols.length)}, 1fr) 48px` }}
                                              >
                                                <div className="text-sm font-bold text-center text-muted-foreground shrink-0">{setIndex + 1}</div>
                                                
                                                {activeCols.map((col, i) => (
                                                  <div key={i} className="flex justify-center">
                                                    <Stepper 
                                                      value={set[col.field] || 0} 
                                                      onChange={(v: number) => {
                                                        const newSets = [...exercise.setsData];
                                                        newSets[setIndex] = { ...set, [col.field]: v };
                                                        updateExercise(exercise.id, "setsData", newSets);
                                                      }}
                                                      step={col.step}
                                                      isDecimal={col.isDecimal}
                                                      completed={set.completed}
                                                    />
                                                  </div>
                                                ))}

                                            <div className="flex justify-center shrink-0">
                                                <button 
                                                  onClick={() => {
                                                    const newSets = [...exercise.setsData];
                                                    const isCompleting = !set.completed;
                                                    newSets[setIndex] = { ...set, completed: isCompleting };
                                                    updateExercise(exercise.id, "setsData", newSets);
                                                    if (isCompleting) {
                                                      if (navigator.vibrate) navigator.vibrate(10);
                                                      const restTime = exercise.rest || 0;
                                                      if (restTime > 0) {
                                                        startTimer(restTime);
                                                      }
                                                    }
                                                  }}
                                                  className={`relative h-8 w-8 rounded-full flex items-center justify-center transition-all after:absolute after:-inset-2 after:content-[''] ${set.completed ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground/30 text-transparent hover:border-primary/50'}`}
                                                >
                                                  <Check className="h-4 w-4" />
                                                </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  );
                                })()}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full mt-2 text-primary font-bold tracking-wide"
                                      onClick={() => {
                                        const lastSet = exercise.setsData?.[exercise.setsData.length - 1];
                                        const newSets = [...(exercise.setsData || []), {
                                          id: Date.now().toString(),
                                          reps: lastSet ? lastSet.reps : 10,
                                          weight: lastSet ? lastSet.weight : 0,
                                          distance: lastSet ? lastSet.distance : 0,
                                          timeMins: lastSet ? lastSet.timeMins : 0,
                                          timeSecs: lastSet ? lastSet.timeSecs : 0,
                                          completed: false
                                        }];
                                        updateExercise(exercise.id, "setsData", newSets);
                                      }}
                                    >
                                      <Plus className="h-4 w-4 mr-1" /> Add Set
                                    </Button>
                                  </div>

                                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-4">
                                      <Label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Each Side</span>
                                        <input 
                                          type="checkbox" 
                                          checked={exercise.eachSide || false}
                                          onChange={(e) => updateExercise(exercise.id, "eachSide", e.target.checked)}
                                          className="h-4 w-4 accent-primary"
                                        />
                                      </Label>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Rest (s)</span>
                                        <Input 
                                          type="number" 
                                          className="h-7 w-16 text-xs px-2" 
                                          value={exercise.rest || 0} 
                                          onChange={(e) => updateExercise(exercise.id, "rest", parseInt(e.target.value) || 0)} 
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        variant={exercise.linkedToNext ? "default" : "outline"} 
                                        size="sm" 
                                        className={exercise.linkedToNext ? "bg-primary text-primary-foreground h-11 w-11 px-0" : "h-11 w-11 px-0"}
                                        onClick={() => updateExercise(exercise.id, "linkedToNext", !exercise.linkedToNext)}
                                        title={exercise.linkedToNext ? "Unlink from next" : "Link to next as superset"}
                                      >
                                        {exercise.linkedToNext ? <Link2Off className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-11 w-11 px-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeExercise(exercise.id)}
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1 font-bold tracking-wider"
                          disabled={currentBlockIndex === 0}
                          onClick={() => setCurrentBlockIndex(prev => Math.max(0, prev - 1))}
                        >
                          Previous
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 font-bold tracking-wider"
                          disabled={currentBlockIndex === blocks.length - 1}
                          onClick={() => setCurrentBlockIndex(prev => Math.min(blocks.length - 1, prev + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {isActiveWorkout && (
                  <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+64px)] left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40">
                    <Button onClick={handleSaveWorkout} className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-12 text-lg shadow-lg">
                      <Check className="h-5 w-5" /> Finish Workout
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {timerActive && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+144px)] left-4 right-4 bg-primary text-primary-foreground shadow-lg rounded-xl p-3 flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Rest Timer</span>
              <span className="text-xl font-heading font-bold tabular-nums tracking-wider leading-none">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => setTimeLeft(prev => (prev || 0) + 30)}>
              <span className="text-xs font-bold">+30s</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => setTimerActive(!timerActive)}>
              {timerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => { setTimeLeft(null); setTimerActive(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <Dialog open={!!quickOverviewWorkout} onOpenChange={(open) => !open && setQuickOverviewWorkout(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border p-0 overflow-hidden">
          {quickOverviewWorkout && (
            <>
              <div className="bg-muted p-4 border-b border-border">
                <DialogHeader>
                  <DialogTitle className="text-xl font-heading tracking-wider uppercase">
                    {quickOverviewWorkout.workout.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground mt-1">
                  {quickOverviewWorkout.workout.exercises?.length || 0} exercises
                </div>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {quickOverviewWorkout.workout.exercises?.map((ex: any, idx: number) => {
                  const libEx = exerciseLibrary.find(e => e.id === ex.name);
                  return (
                    <div key={idx} className="flex justify-between items-center bg-background border border-border p-3 rounded-lg">
                      <div className="font-bold text-sm">{libEx ? libEx.name : (ex.name || "Unknown")}</div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{ex.sets || 3} sets</div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border bg-background">
                <Button 
                  className="w-full font-bold tracking-wide h-12 text-lg rounded-xl"
                  onClick={() => {
                    const template = quickOverviewWorkout.template;
                    
                    // Enroll if not already active or if on a different program
                    if (!activeProgram || activeProgram.programId !== template.id) {
                      const newActive = {
                        programId: template.id,
                        name: template.name,
                        weeks: template.weeks,
                        daysPerWeek: template.daysPerWeek,
                        workouts: template.workouts,
                        currentIndex: quickOverviewWorkout.index
                      };
                      setActiveProgram(newActive);
                      saveActiveProgram(newActive);
                      toast.success(`Started program: ${template.name}`);
                    } else if (activeProgram.currentIndex !== quickOverviewWorkout.index) {
                      // Just update the index if already enrolled
                      const updatedProgram = { ...activeProgram, currentIndex: quickOverviewWorkout.index };
                      setActiveProgram(updatedProgram);
                      saveActiveProgram(updatedProgram);
                    }
                    
                    // Setup the workout
                    const workout = quickOverviewWorkout.workout;
                    setWorkoutName(`${template.name}: ${workout.name}`);
                    setExercises(workout.exercises.map((ex: any, exIdx: number) => ({ 
                      id: Date.now() + exIdx, 
                      ...ex,
                      setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
                        id: Date.now().toString() + i,
                        reps: ex.reps || 10,
                        weight: ex.weight || 0,
                        distance: ex.distance || 0,
                        timeMins: ex.timeMins || 0,
                        timeSecs: ex.timeSecs || 0,
                        completed: false
                      }))
                    })));
                    setCurrentBlockIndex(0);
                    setQuickOverviewWorkout(null);
                    setViewMode('active');
                  }}
                >
                  <Play className="h-5 w-5 mr-2 fill-current" /> Start Workout
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
