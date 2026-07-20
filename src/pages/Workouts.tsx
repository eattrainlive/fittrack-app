import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Dumbbell, Plus, Minus, Trash2, PlayCircle, History, Timer, X, Play, Pause, RotateCcw, Link2, Link2Off, Heading, List, Check, Search, ArrowLeft, RefreshCw } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { getExercises, getPrograms, saveWorkoutToHistory, getLastExerciseStats, getActiveProgram, saveActiveProgram } from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

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

const playPing = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const Stepper = ({ value, onChange, step = 1, completed, isDecimal = false, className = "" }: any) => (
  <div className={`flex items-center justify-between w-full h-11 rounded-md bg-background border transition-colors focus-within:ring-1 focus-within:ring-primary ${completed ? 'border-transparent bg-transparent' : 'border-border'} ${className}`}>
    <button 
      type="button"
      className={`h-full w-8 shrink-0 rounded-l-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? 'opacity-0 pointer-events-none' : ''}`}
      onClick={() => onChange(Math.max(0, (value || 0) - step))}
    >
      <Minus className="h-3 w-3" />
    </button>
    <input 
      type="number" 
      inputMode={isDecimal ? "decimal" : "numeric"}
      className="flex-1 min-w-0 tabular-nums text-center font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={value === 0 || value === undefined ? '' : value} 
      onChange={(e) => onChange(isDecimal ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
      placeholder="0"
    />
    <button 
      type="button"
      className={`h-full w-8 shrink-0 rounded-r-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? 'opacity-0 pointer-events-none' : ''}`}
      onClick={() => onChange((value || 0) + step)}
    >
      <Plus className="h-3 w-3" />
    </button>
  </div>
);

const TimeStepper = ({ mins, secs, onChangeMins, onChangeSecs, completed, className = "" }: any) => (
  <div className={`flex items-center justify-center w-full h-11 rounded-md bg-background border transition-colors focus-within:ring-1 focus-within:ring-primary ${completed ? 'border-transparent bg-transparent' : 'border-border'} ${className}`}>
    <input 
      type="number" 
      inputMode="numeric"
      className="w-8 min-w-0 tabular-nums text-right font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={mins === 0 || mins === undefined ? '' : mins} 
      onChange={(e) => onChangeMins(parseInt(e.target.value) || 0)}
      placeholder="0"
    />
    <span className="text-muted-foreground font-bold mx-0.5">:</span>
    <input 
      type="number" 
      inputMode="numeric"
      className="w-8 min-w-0 tabular-nums text-left font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={secs === 0 || secs === undefined ? '' : secs.toString().padStart(2, '0')} 
      onChange={(e) => onChangeSecs(parseInt(e.target.value) || 0)}
      placeholder="00"
    />
  </div>
);

const trackingOf = (ex: any, exerciseLibrary: any[]) => {
  const libEx = exerciseLibrary.find(le => String(le.id) === String(ex.name));
  const t = ex.trackingType ?? libEx?.trackingType ?? "Weight & Reps";
  return Array.isArray(t) ? t : String(t).split(",").map((s: string) => s.trim());
};

const columnsFor = (ex: any, exerciseLibrary: any[]) => {
  const t = trackingOf(ex, exerciseLibrary);
  const libEx = exerciseLibrary.find((le: any) => String(le.id) === String(ex.name));
  const isBodyweight = String(ex.equipment ?? libEx?.equipment ?? "").trim().toLowerCase() === "bodyweight";
  const sets = Array.isArray(ex.setsData) ? ex.setsData : [];
  const usedReps = sets.some((s: any) => (+s.reps || 0) > 0);
  const usedTime = sets.some((s: any) => (+s.timeMins || 0) > 0 || (+s.timeSecs || 0) > 0);
  const usedDist = sets.some((s: any) => (+s.distance || 0) > 0);

  const canWR   = t.includes("Weight & Reps");
  const canTime = t.includes("Time Only") || t.includes("Distance & Time");
  const canDist = t.includes("Distance & Time");
  const canCals = t.includes("Calories");

  const cols: any[] = [];
  if (canWR && (usedReps || (!canTime && !canDist))) {
    if (!isBodyweight) cols.push({ field: "weight", label: "KG", step: 2.5, decimal: true });
    cols.push({ field: "reps", label: "REPS", step: 1 });
  }
  if (canDist && usedDist) cols.push({ field: "distance", label: "DIST", step: 0.1, decimal: true });
  if (canTime && (usedTime || (!canWR && !usedDist))) cols.push({ field: "time", label: "TIME", isTime: true });
  if (canCals) cols.push({ field: "calories", label: "CALS", step: 1 });

  return cols.length ? cols : [{ field: "reps", label: "REPS", step: 1 }];
};

const Workouts = () => {
  const navigate = useNavigate();
  const [viewMode, setViewModeState] = useState<'browse' | 'detail' | 'session-overview' | 'active' | 'rest-day'>('browse');
  const [viewDirection, setViewDirection] = useState<'forward' | 'backward'>('forward');

  const setViewMode = (newMode: 'browse' | 'detail' | 'session-overview' | 'active' | 'rest-day') => {
    const depths = { browse: 0, 'rest-day': 1, detail: 1, 'session-overview': 2, active: 3 };
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
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [rewardModal, setRewardModal] = useState<{name: string, emoji: string, volume: number, count?: number, displayName?: string} | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [quickOverviewWorkout, setQuickOverviewWorkout] = useState<any>(null);
  const [showSectionSlide, setShowSectionSlide] = useState(false);
  const [lastSeenSectionId, setLastSeenSectionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
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

  const [allowedAccess, setAllowedAccess] = useState<string[] | null>(null);

  const bucketOf = (p: any) => (p.type === "GroupPT" ? "Group PT" : (p.stream || "Stronger"));

  useEffect(() => {
    const loadLibrary = async () => {
      setExerciseLibrary(getExercises());
      setWorkoutTemplates(getPrograms());
      setActiveProgram(getActiveProgram());
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('allowed_access').eq('id', user.id).maybeSingle();
        setAllowedAccess(data?.allowed_access ?? ["Stronger", "Fusion", "Performance"]);
      } else {
        setAllowedAccess(["Stronger", "Fusion", "Performance"]);
      }
    };
    
    loadLibrary();
    window.addEventListener('fittrack_synced', loadLibrary);
    return () => window.removeEventListener('fittrack_synced', loadLibrary);
  }, []);

  // Restore active workout session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fittrack_active_workout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.workoutName) setWorkoutName(parsed.workoutName);
        if (parsed.exercises && parsed.exercises.length > 0) setExercises(parsed.exercises);
        if (parsed.currentBlockIndex !== undefined) setCurrentBlockIndex(parsed.currentBlockIndex);
        if (parsed.lastSeenSectionId !== undefined) setLastSeenSectionId(parsed.lastSeenSectionId);
        if (parsed.showSectionSlide !== undefined) setShowSectionSlide(parsed.showSectionSlide);
        if (parsed.restEndsAt !== undefined) setRestEndsAt(parsed.restEndsAt);
        if (parsed.pausedTimeLeft !== undefined) setPausedTimeLeft(parsed.pausedTimeLeft);
        if (parsed.viewMode) setViewMode(parsed.viewMode);
        if (parsed.startTime !== undefined) setStartTime(parsed.startTime);
      } catch (e) {
        console.error("Failed to parse saved workout", e);
      }
    }
  }, []);

  // Persist active workout session
  useEffect(() => {
    const saveActiveWorkout = () => {
      const hasActiveContent = workoutName || exercises.length > 1 || (exercises.length === 1 && exercises[0].name);
      if (viewMode === 'active' || hasActiveContent) {
        localStorage.setItem('fittrack_active_workout', JSON.stringify({
          workoutName,
          exercises,
          currentBlockIndex,
          lastSeenSectionId,
          showSectionSlide,
          restEndsAt,
          pausedTimeLeft,
          viewMode,
          startTime
        }));
      } else {
        localStorage.removeItem('fittrack_active_workout');
      }
    };

    saveActiveWorkout();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveActiveWorkout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [workoutName, exercises, currentBlockIndex, lastSeenSectionId, showSectionSlide, restEndsAt, pausedTimeLeft, viewMode, startTime]);

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
    const id = setInterval(() => setNow(Date.now()), 250);
    const onVis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { 
      clearInterval(id); 
      document.removeEventListener("visibilitychange", onVis); 
      window.removeEventListener("focus", onVis); 
    };
  }, []);

  useEffect(() => {
    if (restEndsAt !== null && now >= restEndsAt) {
      setRestEndsAt(null);
      toast.success("Rest time is up!");
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      playPing();
    }
  }, [restEndsAt, now]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = (seconds: number) => {
    setRestEndsAt(Date.now() + seconds * 1000);
    setPausedTimeLeft(null);
  };

  const toggleTimer = () => {
    if (restEndsAt) {
      setPausedTimeLeft(Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)));
      setRestEndsAt(null);
    } else if (pausedTimeLeft !== null) {
      setRestEndsAt(Date.now() + pausedTimeLeft * 1000);
      setPausedTimeLeft(null);
    }
  };

  const add30s = () => {
    if (restEndsAt) {
      setRestEndsAt(restEndsAt + 30000);
    } else if (pausedTimeLeft !== null) {
      setPausedTimeLeft(pausedTimeLeft + 30);
    }
  };

  const closeTimer = () => {
    setRestEndsAt(null);
    setPausedTimeLeft(null);
  };

  const currentRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : (pausedTimeLeft || 0);
  const isTimerVisible = restEndsAt !== null || pausedTimeLeft !== null;

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now(), blockType: "Strength", name: "", setsData: [{ id: Date.now().toString(), reps: 10, weight: 0, distance: 0, timeMins: 0, timeSecs: 0, completed: false }], rest: 0, linkedToNext: false, eachSide: false }]);
  };

  const removeExercise = (id: number) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: number, field: string, value: any) => {
    setExercises(exercises.map((e) => e.id === id ? { ...e, [field]: value } : e));
  };

  const [nextSession, setNextSession] = useState<any>(null);

  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const launchTarget = (grid: any[]) => {
    const today = localToday();
    const dated = grid.filter((c: any) => c.date);
    if (dated.length === 0) return { mode: "undated" };
    const todays = dated.filter((c: any) => c.date === today);
    if (todays.length === 0) {
      const upcoming = dated
        .filter((c: any) => c.date > today)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))[0] || null;
      return { mode: "rest", next: upcoming };
    }
    return { mode: "session", session: todays[0], index: grid.indexOf(todays[0]) };
  };

  const openTemplateDetail = (template: any) => {
    setSelectedTemplate(template);
    
    if (template.workouts && template.workouts.length > 0) {
      const target = launchTarget(template.workouts);
      if (target.mode === "session" && target.session) {
        startTargetSession(template, target.session, target.index);
        return;
      } else if (target.mode === "rest") {
        setNextSession(target.next);
        setViewMode('rest-day');
        return;
      }
    }
    
    setViewMode('detail');
  };

  const startTargetSession = (template: any, session: any, index: number) => {
    const newActive = {
      programId: template.id,
      name: template.name,
      weeks: template.weeks,
      daysPerWeek: template.daysPerWeek,
      workouts: template.workouts,
      currentIndex: index
    };
    setActiveProgram(newActive);
    saveActiveProgram(newActive);
    
    setWorkoutName(`${template.name}: ${session.name}`);
    setExercises(session.exercises.map((ex: any, idx: number) => ({ 
      id: Date.now() + idx, 
      ...ex,
      setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
        id: Date.now().toString() + i,
        reps: ex.reps !== undefined ? ex.reps : 10,
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
    setStartTime(Date.now());
    toast.success(`Started program: ${template.name}`);
    setViewMode('active');
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
          reps: ex.reps !== undefined ? ex.reps : 10,
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
      setStartTime(Date.now());
      toast.success(`Started program: ${template.name}`);
    } else {
      setWorkoutName(template.name);
      setExercises(template.exercises.map((ex: any, idx: number) => ({ 
        id: Date.now() + idx, 
        ...ex,
        setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
          id: Date.now().toString() + i,
          reps: ex.reps !== undefined ? ex.reps : 10,
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
      setStartTime(Date.now());
    }
    setViewMode('active');
  };

  const resumeActiveProgram = () => {
    if (activeProgram && activeProgram.workouts) {
      const hasActiveContent = workoutName || exercises.length > 1 || (exercises.length === 1 && exercises[0].name);
      if (!hasActiveContent) {
        const target = launchTarget(activeProgram.workouts);
        if (target.mode === "session" && target.session) {
          startTargetSession(activeProgram, target.session, target.index);
          return;
        } else if (target.mode === "rest") {
          setNextSession(target.next);
          setViewMode('rest-day');
          return;
        }
        
        const currentWorkout = activeProgram.workouts[activeProgram.currentIndex];
        if (currentWorkout && currentWorkout.exercises) {
          setWorkoutName(`${activeProgram.name}: ${currentWorkout.name}`);
          setExercises(currentWorkout.exercises.map((ex: any, idx: number) => ({ 
            id: Date.now() + idx, 
            blockType: ex.blockType || "Strength",
            ...ex,
            setsData: ex.setsData || Array.from({ length: ex.sets || 3 }).map((_, i) => ({
              id: Date.now().toString() + i,
              reps: ex.reps !== undefined ? ex.reps : 10,
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
      }
    }
    setViewMode('active');
  };

  const handleSaveWorkout = async () => {
    if (!workoutName) {
      toast.error("Please enter a workout name");
      return;
    }
    
    setIsSaving(true);
    
    // Calculate total duration (difference between start time and now)
    let duration = 45;
    if (startTime) {
      duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
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
    
    // Generate an ID before saving so we can dedupe
    const sessionWorkoutId = Date.now().toString();
    
    const { success, error } = await saveWorkoutToHistory({
      id: sessionWorkoutId,
      name: workoutName,
      exercises,
      volume: totalVolume,
      duration: duration,
      reward: earnedReward || null
    });
    
    setIsSaving(false);
    
    if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 50]);
    
    if (success) {
      toast.success("Workout saved successfully!");
    } else {
      toast.warning("Saved locally — cloud sync failed");
      console.error("Cloud sync error:", error);
    }

    if (earnedReward && totalVolume > 0) {
      setRewardModal({ ...earnedReward, volume: totalVolume });
    }
    
    if (activeProgram) {
      const nextIndex = activeProgram.currentIndex + 1;
      if (nextIndex < activeProgram.workouts.length) {
        const updatedProgram = { ...activeProgram, currentIndex: nextIndex };
        setActiveProgram(updatedProgram);
        saveActiveProgram(updatedProgram);
        toast.info(`Up next: ${activeProgram.workouts[nextIndex].name}`);
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
    localStorage.removeItem('fittrack_active_workout');
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
              .filter(t => !t.workouts || !allowedAccess || allowedAccess.includes(bucketOf(t)))
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
          
          {activeProgram && allowedAccess && allowedAccess.includes(bucketOf(activeProgram)) && (

            <div className="pt-4">
              <Button onClick={resumeActiveProgram} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl">
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
            {activeProgram && activeProgram.programId === selectedTemplate.id && (!allowedAccess || allowedAccess.includes(bucketOf(selectedTemplate))) ? (
              <div className="space-y-3">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Workout {activeProgram.currentIndex + 1} of {activeProgram.workouts.length}
                </div>
                <Button onClick={resumeActiveProgram} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg">
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
                                setViewMode('session-overview');
                              }}
                              className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${isActive ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:bg-muted/50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                  {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{dayIdx + 1}</span>}
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                                    Day {dayIdx + 1}
                                    {w.date && <span className="ml-2 px-1.5 py-0.5 bg-muted/50 rounded-sm text-[10px]">{new Date(w.date).toLocaleDateString()}</span>}
                                  </div>
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
                    const libEx = exerciseLibrary.find(e => String(e.id) === String(ex.name));
                    const setsCount = ex.setsData?.length || ex.sets || 3;
                    const firstSet = ex.setsData?.[0] || ex || {};
                    const trackingArray = Array.isArray(libEx?.trackingType) ? libEx.trackingType : [libEx?.trackingType || "Weight & Reps"];
                    let details = [];
                    if (trackingArray.includes('Weight & Reps')) details.push(`${firstSet.reps || 0} reps`);
                    if (trackingArray.includes('Distance & Time') && firstSet.distance) details.push(`${firstSet.distance}m`);
                    if (trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) {
                      const m = firstSet.timeMins || 0;
                      const s = firstSet.timeSecs || 0;
                      if (m || s) details.push(`${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim());
                    }
                    if (trackingArray.includes('Calories') && firstSet.calories) details.push(`${firstSet.calories} cals`);
                    const detailStr = details.length > 0 ? details.join(', ') : '';
                    return (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-card flex justify-between items-center">
                        <div className="font-bold">{libEx ? libEx.name : (ex.name || "Unknown")}</div>
                        <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">{setsCount} sets {detailStr ? `× ${detailStr}` : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        )}

        {viewMode === 'rest-day' && (
          <motion.div 
            key="rest-day"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24 flex flex-col items-center justify-center min-h-[70vh]"
          >
            <div className="text-center space-y-6 max-w-md mx-auto">
              <h2 className="text-4xl font-heading tracking-wider uppercase">Rest Day</h2>
              <p className="text-muted-foreground text-lg">No session scheduled for today.</p>
              {nextSession && (
                <p className="font-bold text-primary">Next up: {nextSession.name} on {new Date(nextSession.date).toLocaleDateString()}</p>
              )}
              <div className="pt-8 flex flex-col gap-4">
                <Button onClick={() => setViewMode('detail')} className="w-full h-14 text-lg font-bold tracking-wide rounded-xl">
                  View Full Programme
                </Button>
                <Button variant="outline" onClick={() => setViewMode('browse')} className="w-full h-14 text-lg font-bold tracking-wide rounded-xl">
                  Back to Library
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'session-overview' && quickOverviewWorkout && (
          <motion.div 
            key="session-overview"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24"
          >
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('detail')} className="w-fit -ml-4 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex flex-col gap-1">
                <span className="text-primary font-bold text-xs tracking-wider uppercase">
                  {quickOverviewWorkout.template.stream || "Workout"}
                </span>
                <h2 className="text-4xl font-heading tracking-wider uppercase text-foreground leading-none">
                  {quickOverviewWorkout.workout.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                  <span>~60 min</span>
                  <span>·</span>
                  <span>{quickOverviewWorkout.workout.exercises?.length || 0} exercises</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg bg-primary text-primary-foreground"
              onClick={() => {
                startTargetSession(quickOverviewWorkout.template, quickOverviewWorkout.workout, quickOverviewWorkout.index);
              }}
            >
              <Play className="h-5 w-5 mr-2 fill-current" /> Start Workout
            </Button>

            <div className="space-y-4 mt-6">
              {(() => {
                const sections: any[] = [];
                let currentSection: any = null;
                let currentGroup: any[] = [];

                quickOverviewWorkout.workout.exercises?.forEach((ex: any) => {
                  if (ex.isSection) {
                    if (currentSection || currentGroup.length > 0) {
                      sections.push({ section: currentSection, exercises: currentGroup });
                    }
                    currentSection = ex;
                    currentGroup = [];
                  } else {
                    currentGroup.push(ex);
                  }
                });
                if (currentSection || currentGroup.length > 0) {
                  sections.push({ section: currentSection, exercises: currentGroup });
                }

                return sections.map((sec, idx) => (
                  <Card key={idx} className="bg-card border-border overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center">
                        <span className="font-bold text-sm tracking-wider uppercase">
                          {sec.section ? sec.section.name : `Block ${idx + 1}`}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {sec.exercises.length} exercises
                        </span>
                      </div>
                      <div className="p-3 space-y-3">
                        {sec.exercises.map((ex: any, exIdx: number) => {
                          const libEx = exerciseLibrary.find(e => String(e.id) === String(ex.name));
                          
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

                          return (
                            <div key={exIdx} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
                                  <Dumbbell className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm leading-tight">{libEx ? libEx.name : (ex.name || "Unknown")}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {setsCount} sets {detailStr ? `× ${detailStr}` : ''}
                                  </span>
                                </div>
                              </div>
                              {ex.linkedToNext && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-sm">
                                  Superset
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()}
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

          {activeProgram && (!allowedAccess || allowedAccess.includes(activeProgram.type === 'GroupPT' ? 'Group PT' : (activeProgram.stream || 'Stronger'))) && (
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
                          const libEx = exerciseLibrary.find(le => String(le.id) === String(ex.name));
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
                      <div className="flex flex-col min-h-[60vh] space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-2 text-center pt-8">
                          <span className="text-primary font-bold tracking-wider uppercase text-sm">Entering Section</span>
                          <h2 className="text-5xl font-heading uppercase tracking-wider text-foreground leading-none">{currentBlock.section.name}</h2>
                          <div className="text-muted-foreground font-medium text-sm flex items-center justify-center gap-2">
                            <span>{sectionExercises.length} exercises</span>
                            <span>·</span>
                            <span>{currentBlock.type === 'superset' ? 'Superset' : 'Regular'}</span>
                          </div>
                        </div>

                        {currentBlock.section.description && (
                          <p className="text-muted-foreground text-center px-4 whitespace-pre-wrap">{currentBlock.section.description}</p>
                        )}

                        {sectionExercises.length > 0 && (
                          <div className="space-y-3 mt-4">
                            {sectionExercises.map((item, i) => (
                              <div key={item.id} className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl">
                                <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center shrink-0">
                                  <Dumbbell className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="font-bold text-base leading-tight">{item.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {item.sets} sets {item.details ? `× ${item.details}` : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-8 flex flex-col gap-4 mt-auto">
                          <Button 
                            size="lg" 
                            className="w-full font-bold tracking-wide text-lg h-14 bg-primary text-primary-foreground shadow-lg"
                            onClick={() => setShowSectionSlide(false)}
                          >
                            <Play className="h-5 w-5 mr-2 fill-current" /> Start Section
                          </Button>
                          {currentBlockIndex > 0 && (
                            <Button 
                              variant="ghost" 
                              className="text-muted-foreground h-14 text-lg font-bold"
                              onClick={() => {
                                setShowSectionSlide(false);
                                setCurrentBlockIndex(prev => Math.max(0, prev - 1));
                              }}
                            >
                              Go Back
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pb-2 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-border/50 mb-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {currentBlock.section ? currentBlock.section.name : `Block ${currentBlockIndex + 1} of ${blocks.length}`}
                          </span>
                          <span className="text-sm font-bold">
                            {currentBlock.type === 'superset' ? 'Superset' : 'Regular'} · {currentBlock.exercises.length} Exercises
                          </span>
                        </div>
                        {isTimerVisible && (
                          <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full" onClick={toggleTimer}>
                            <Timer className="h-4 w-4" />
                            <span className="text-sm font-bold tabular-nums">{formatTime(currentRemaining)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-6">
                        {currentBlock.exercises.map((exercise: any, exIdx: number) => {
                          const libraryExercise = exerciseLibrary.find(e => String(e.id) === String(exercise.name));
                          const lastStats = exercise.name ? getLastExerciseStats(exercise.name) : null;
                          const cols = columnsFor(exercise, exerciseLibrary);
                          
                          return (
                            <Card key={exercise.id} className="bg-card border-border overflow-hidden">
                              <CardContent className="p-4 flex flex-col gap-4">
                                <div className="space-y-2 w-full">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-heading text-xl tracking-wide leading-none uppercase">
                                          {libraryExercise ? libraryExercise.name : (exercise.name || "Select Exercise")}
                                        </span>
                                        {exercise.blockType && (
                                          <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                            {exercise.blockType}
                                          </span>
                                        )}
                                        {libraryExercise && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] uppercase tracking-wider gap-1 rounded-full">
                                                <RefreshCw className="h-3 w-3" /> Swap
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[400px] bg-card border-border max-h-[80vh] overflow-y-auto">
                                              <DialogHeader>
                                                <DialogTitle className="font-heading tracking-wider">Alternative Exercises</DialogTitle>
                                              </DialogHeader>
                                              <div className="mt-4 space-y-2">
                                                {(() => {
                                                  const norm = (v: any) => Array.isArray(v)
                                                    ? v.map((s: any) => String(s).trim()).filter(Boolean)
                                                    : String(v || "").split(",").map((s: string) => s.trim()).filter(Boolean);

                                                  const origCat = norm(libraryExercise.category);
                                                  const origMv  = norm(libraryExercise.movementType);
                                                  const origTt  = norm(libraryExercise.trackingType).join();

                                                  const alternatives = exerciseLibrary
                                                    .filter((ex) => {
                                                      if (String(ex.id) === String(libraryExercise.id)) return false;
                                                      if (origCat.length && !norm(ex.category).some((c: string) => origCat.includes(c))) return false; // same block type
                                                      return true;
                                                    })
                                                    .map((ex) => {
                                                      let s = 0;
                                                      if ((ex.muscle || "") === (libraryExercise.muscle || "")) s += 3;
                                                      if (norm(ex.movementType).some((m: string) => origMv.includes(m)))  s += 3;
                                                      if (norm(ex.trackingType).join() === origTt)                s += 2;
                                                      if ((ex.difficulty || "") === (libraryExercise.difficulty || "")) s += 1;
                                                      if ((ex.equipment  || "") === (libraryExercise.equipment  || "")) s += 1;
                                                      return { ex, s };
                                                    })
                                                    .filter((x) => x.s > 0)
                                                    .sort((a, b) => b.s - a.s)
                                                    .slice(0, 8)
                                                    .map((x) => x.ex);

                                                  if (alternatives.length === 0) {
                                                    return <p className="text-sm text-muted-foreground text-center py-4">No close alternatives found.</p>;
                                                  }
                                                  
                                                  return alternatives.map((alt, altIdx) => (
                                                    <div key={alt.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                                                      <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                          <span className="font-bold text-sm">{alt.name}</span>
                                                          {altIdx === 0 && (
                                                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                              Best match
                                                            </span>
                                                          )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{alt.equipment || "Any equipment"}</span>
                                                      </div>
                                                      <Button 
                                                        size="sm" 
                                                        variant="secondary"
                                                        onClick={() => {
                                                          updateExercise(exercise.id, "name", alt.id);
                                                          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                                        }}
                                                      >
                                                        Select
                                                      </Button>
                                                    </div>
                                                  ));
                                                })()}
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>
                                      {exercise.eachSide && (
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Each Side</span>
                                      )}
                                    </div>
                                    {libraryExercise?.videoUrl && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="icon" className="shrink-0 h-8 w-8 rounded-full" title="Watch Tutorial">
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
                                  
                                  {exercise.coachingNotes && (
                                    <div className="text-sm text-muted-foreground italic border-l-2 border-primary/50 pl-2 py-0.5">
                                      {exercise.coachingNotes}
                                    </div>
                                  )}
                                  
                                  {exercise.name && lastStats && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <History className="h-3 w-3" /> 
                                      Last time: {lastStats.weight}kg × {lastStats.reps}
                                    </div>
                                  )}
                                </div>

                                <div className="w-full mt-2">
                                  <div className="grid items-center gap-y-2 gap-x-1"
                                       style={{ gridTemplateColumns:`28px repeat(${cols.length}, minmax(0,1fr)) 40px` }}>
                                    
                                    <div className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Set</div>
                                    {cols.map((c: any, i: number) => (
                                      <div key={i} className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</div>
                                    ))}
                                    <div className="flex justify-center"><Check className="h-3 w-3 text-muted-foreground" /></div>
                                    
                                    {exercise.setsData?.map((set: any, setIndex: number) => (
                                      <React.Fragment key={set.id}>
                                        <span className="text-center font-bold text-sm text-muted-foreground">{setIndex + 1}</span>
                                        {cols.map((c: any, i: number) => (
                                          <div key={i} className="flex justify-center w-full">
                                            {c.isTime ? (
                                              <TimeStepper 
                                                mins={set.timeMins} 
                                                secs={set.timeSecs} 
                                                onChangeMins={(v: number) => {
                                                  const newSets = [...exercise.setsData];
                                                  newSets[setIndex] = { ...set, timeMins: v };
                                                  updateExercise(exercise.id, "setsData", newSets);
                                                }}
                                                onChangeSecs={(v: number) => {
                                                  const newSets = [...exercise.setsData];
                                                  newSets[setIndex] = { ...set, timeSecs: v };
                                                  updateExercise(exercise.id, "setsData", newSets);
                                                }}
                                                completed={set.completed}
                                              />
                                            ) : (
                                              <Stepper 
                                                value={set[c.field]} 
                                                step={c.step} 
                                                isDecimal={c.decimal}
                                                onChange={(v: number) => {
                                                  const newSets = [...exercise.setsData];
                                                  newSets[setIndex] = { ...set, [c.field]: v };
                                                  updateExercise(exercise.id, "setsData", newSets);
                                                }}
                                                completed={set.completed}
                                              />
                                            )}
                                          </div>
                                        ))}
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
                                          className={`justify-self-center relative h-8 w-8 rounded-full flex items-center justify-center transition-all after:absolute after:-inset-2 after:content-[''] ${set.completed ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground/30 text-transparent hover:border-primary/50'}`}
                                        >
                                          <Check className="h-4 w-4" />
                                        </button>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full mt-4 text-primary font-bold tracking-wide bg-primary/5 hover:bg-primary/10"
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
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-border">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 font-bold tracking-wider h-14 text-lg"
                            disabled={currentBlockIndex === 0}
                            onClick={() => setCurrentBlockIndex(prev => Math.max(0, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 font-bold tracking-wider h-14 text-lg"
                            disabled={currentBlockIndex === blocks.length - 1}
                            onClick={() => setCurrentBlockIndex(prev => Math.min(blocks.length - 1, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                        <Button 
                          onClick={handleSaveWorkout} 
                          disabled={isSaving} 
                          className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-14 text-lg shadow-lg"
                        >
                          <Check className="h-5 w-5" /> {isSaving ? "Saving..." : "Finish Workout"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isTimerVisible && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+144px)] left-4 right-4 bg-primary text-primary-foreground shadow-lg rounded-xl p-3 flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Rest Timer</span>
              <span className="text-xl font-heading font-bold tabular-nums tracking-wider leading-none">
                {formatTime(currentRemaining)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={add30s}>
              <span className="text-xs font-bold">+30s</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={toggleTimer}>
              {restEndsAt ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={closeTimer}>
              <X className="h-4 w-4" />
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
