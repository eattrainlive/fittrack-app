import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dumbbell, Plus, Minus, Trash2, PlayCircle, History, Timer, X, Play, Pause, RotateCcw, Link2, Link2Off, Heading, List, Check, Search, ArrowLeft, RefreshCw, Trophy, CheckCircle2, ArrowRight, ArrowLeft as ArrowLeftIcon } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { getExercises, getPrograms, saveWorkoutToHistory, getLastExerciseStats, getActiveProgram, saveActiveProgram, getHabits, detectAndSavePBs, saveCommunityPost, getPersonalRecords, getPreferredDays, savePreferredDays, getWorkoutHistory, getWorkoutsOfWeek, getWowResults, saveWowResult } from "@/lib/store";
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
  return (Array.isArray(t) ? t : String(t).split(/[;,]/)).map((s: string) => s.trim()).filter(Boolean);
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

const weekLabel = (program: any, week: number) => {
  const wc = program?.weekNotes?.[week]?.start_date;
  if (!wc) return `Week ${week}`;
  const d = new Date(wc + 'T00:00:00');
  return `W/C ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

const sessionTitle = (program: any, workout: any) => {
  const theme = workout.name && !workout.name.toLowerCase().startsWith("week ") && !workout.name.toLowerCase().startsWith("day ") ? workout.name : `Day ${workout.day}`;
  return `${program.stream || (program.type === 'GroupPT' ? 'Group PT' : 'Workout')} · ${weekLabel(program, workout.week)} · ${theme}`;
};

const getCoverImage = (prog: any, cat?: string) => {
  if (prog?.coverImage) return prog.coverImage;
  const category = cat || (prog?.type === "GroupPT" ? "Group PT" : (prog?.stream || "Foundations"));
  if (category === "Stronger") {
    return "https://vibe.filesafe.space/1783496939163756206/attachments/537d7107-ea07-4065-b402-b1421aa5f38d.png";
  }
  if (category === "Foundations") {
    return "https://vibe.filesafe.space/1783496939163756206/attachments/26d68c54-8cd0-49cc-8c57-8add846cdfdb.png";
  }
  if (category === "Fusion") {
    return "https://vibe.filesafe.space/1783496939163756206/attachments/30e70910-c8f2-4dcf-9782-e1f57a34385d.png";
  }
  if (category === "Performance") {
    return "https://vibe.filesafe.space/1783496939163756206/attachments/1f005e60-ccc4-437f-83ce-cafa4593e109.png";
  }
  return "https://vibe.filesafe.space/1783496939163756206/assets/d81fb983-0fbc-4056-ae4e-83766de15850.png";
};

const Workouts = () => {
  const navigate = useNavigate();
  const [viewMode, setViewModeState] = useState<'browse' | 'detail' | 'session-overview' | 'active' | 'wow-detail'>('browse');
  const [viewDirection, setViewDirection] = useState<'forward' | 'backward'>('forward');

  const setViewMode = (newMode: 'browse' | 'detail' | 'session-overview' | 'active' | 'wow-detail') => {
    const depths = { browse: 0, detail: 1, 'session-overview': 2, active: 3, 'wow-detail': 1 };
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
  const [pbModal, setPbModal] = useState<any[] | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [quickOverviewWorkout, setQuickOverviewWorkout] = useState<any>(null);
  const [templateForChooser, setTemplateForChooser] = useState<any>(null);
  const [videoTutorial, setVideoTutorial] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [showSectionSlide, setShowSectionSlide] = useState(false);
  const [lastSeenSectionId, setLastSeenSectionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [activeWorkoutMeta, setActiveWorkoutMeta] = useState<{programId?: string, week?: number, day?: number, stream?: string}>({});
  const isActiveWorkout = useMemo(() => {
    if (activeProgram) return true;
    if (workoutName.trim() !== "") return true;
    if (exercises.length > 1) return true;
    if (exercises.length === 1 && exercises[0].name) return true;
    return false;
  }, [activeProgram, workoutName, exercises]);

  const [preferredDays, setPreferredDays] = useState(3);

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

  const [wows, setWows] = useState<any[]>([]);
  const [wowResults, setWowResults] = useState<any[]>([]);
  const [showWowLogger, setShowWowLogger] = useState(false);
  const [showWowShare, setShowWowShare] = useState(false);
  const [wowShareResult, setWowShareResult] = useState<any>(null);
  const [wowLogScore, setWowLogScore] = useState("");
  const [wowLogScoreSecs, setWowLogScoreSecs] = useState("");
  const [wowLogScaled, setWowLogScaled] = useState(false);
  const [showWowLeaderboard, setShowWowLeaderboard] = useState(false);
  const [wowLeaderboardFilter, setWowLeaderboardFilter] = useState<"Overall" | "Male" | "Female">("Overall");

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let currentWow = wows.find((w: any) => w.week_start <= todayStr);
  if (!currentWow && wows.length > 0) currentWow = wows[wows.length - 1];

  const handleLogWow = async () => {
    if (!currentWow) return;
    
    let score = 0;
    if (currentWow.score_type === 'time') {
      const mins = parseInt(wowLogScore) || 0;
      const secs = parseInt(wowLogScoreSecs) || 0;
      score = (mins * 60) + secs;
      if (score <= 0) { toast.error("Please enter a valid time"); return; }
    } else {
      score = parseFloat(wowLogScore) || 0;
      if (score <= 0) { toast.error("Please enter a valid score"); return; }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase.from('members').select('name, gender').eq('id', user.id).maybeSingle();
    const { data: macros } = await supabase.from('member_macros').select('sex').eq('member_id', user.id).maybeSingle();
    
    const displayName = profile?.name?.split(' ')[0] || "Member";
    const gender = profile?.gender || macros?.sex || "unknown";

    const result = {
      id: `wow_res_${Date.now()}`,
      wow_id: currentWow.id,
      member_id: user.id,
      display_name: displayName,
      gender: gender,
      score: score,
      scaled: wowLogScaled
    };

    const existing = wowResults.find(r => r.member_id === user.id);
    if (existing) {
      if (currentWow.score_type === 'time' && existing.score <= score) {
        toast.info("Your existing score is better!");
        setShowWowLogger(false);
        return;
      }
      if (currentWow.score_type !== 'time' && existing.score >= score) {
        toast.info("Your existing score is better!");
        setShowWowLogger(false);
        return;
      }
      result.id = existing.id;
    }

    const { success, error } = await saveWowResult(result);
    if (success) {
      toast.success("Score logged!");
      setWowResults(await getWowResults(currentWow.id));
      setShowWowLogger(false);
      setWowShareResult(result);
      setShowWowShare(true);
      setWowLogScore("");
      setWowLogScoreSecs("");
      setWowLogScaled(false);
    } else {
      toast.error(`Failed to log score: ${error?.message || 'Unknown error'}`);
    }
  };

  const bucketOf = (p: any) => (p.type === "GroupPT" ? "Group PT" : (p.stream || "Foundations"));

  useEffect(() => {
    const loadLibrary = async () => {
      setExerciseLibrary(getExercises());
      setWorkoutTemplates(getPrograms());
      setActiveProgram(getActiveProgram());
      setPreferredDays(getPreferredDays());
      
      const wowsData = await getWorkoutsOfWeek();
      setWows(wowsData);
      
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let currentWow = wowsData.find((w: any) => w.week_start <= todayStr);
      if (!currentWow && wowsData.length > 0) currentWow = wowsData[wowsData.length - 1];
      
      if (currentWow) {
        const results = await getWowResults(currentWow.id);
        setWowResults(results);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('members').select('allowed_access').eq('id', user.id).maybeSingle();
        setAllowedAccess(data?.allowed_access ?? ["Foundations", "Stronger", "Fusion", "Performance"]);
      } else {
        setAllowedAccess(["Foundations", "Stronger", "Fusion", "Performance"]);
      }
    };
    
    loadLibrary();
    window.addEventListener('fittrack_synced', loadLibrary);
    return () => window.removeEventListener('fittrack_synced', loadLibrary);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wow') === 'true') {
      setViewMode('wow-detail');
      // Clean up URL
      window.history.replaceState({}, '', '/workouts');
    }
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
        if (parsed.activeWorkoutMeta !== undefined) setActiveWorkoutMeta(parsed.activeWorkoutMeta);
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
          startTime,
          activeWorkoutMeta
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

  const openTemplateDetail = (template: any) => {
    if (template.workouts && !activeProgram) {
      setTemplateForChooser(template);
    } else {
      setSelectedTemplate(template);
      setViewMode('detail');
    }
  };

  const buildDayPreview = (template: any, days: number) => {
    if (!template || !template.workouts) return "";
    const weeks = Array.from(new Set(template.workouts.map((w: any) => w.week))).sort();
    const firstWeek = weeks[0] || 1;
    const weekWorkouts = template.workouts.filter((w: any) => w.week === firstWeek);
    const validSessions = weekWorkouts.filter((w: any) => w.dayCounts ? w.dayCounts.includes(days) : (!w.minDays || w.minDays <= days));
    return validSessions.map((w: any) => w.name && !w.name.toLowerCase().startsWith("week ") && !w.name.toLowerCase().startsWith("day ") ? w.name : `Day ${w.day}`).join(" + ");
  };

  const activateProgram = async (template: any, days: number) => {
    setPreferredDays(days);
    await savePreferredDays(days);
    
    const newActive = {
      programId: template.id,
      name: template.name,
      weeks: template.weeks,
      daysPerWeek: template.daysPerWeek,
      workouts: template.workouts,
      currentIndex: 0,
      stream: template.stream,
      type: template.type,
      weekNotes: template.weekNotes
    };
    setActiveProgram(newActive);
    await saveActiveProgram(newActive);
    
    setSelectedTemplate(template);
    setViewMode('detail');
    setTemplateForChooser(null);
    toast.success(`Started ${template.name}`);
  };

  const startTargetSession = (template: any, session: any, index: number) => {
    const newActive = {
      programId: template.id,
      name: template.name,
      weeks: template.weeks,
      daysPerWeek: template.daysPerWeek,
      workouts: template.workouts,
      currentIndex: index,
      stream: template.stream,
      type: template.type,
      weekNotes: template.weekNotes
    };
    setActiveProgram(newActive);
    saveActiveProgram(newActive);
    
    setWorkoutName(sessionTitle(template, session));
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
    setActiveWorkoutMeta({
      programId: template.id,
      week: session.week,
      day: session.day,
      stream: template.stream || (template.type === 'GroupPT' ? 'GroupPT' : 'Stronger')
    });
    setStartTime(Date.now());
    toast.success(`Started program: ${template.name}`);
    setViewMode('active');
  };

  const startTemplate = (template: any) => {
    if (template.workouts && template.workouts.length > 0) {
      activateProgram(template, preferredDays);
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
      setViewMode('active');
    }
  };

  const resumeActiveProgram = () => {
    if (activeProgram && activeProgram.workouts) {
      const hasActiveContent = workoutName || exercises.length > 1 || (exercises.length === 1 && exercises[0].name);
      if (!hasActiveContent) {
        const currentWorkout = activeProgram.workouts[activeProgram.currentIndex];
        if (currentWorkout && currentWorkout.exercises) {
          setWorkoutName(sessionTitle(activeProgram, currentWorkout));
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
      reward: earnedReward || null,
      programId: activeWorkoutMeta.programId,
      week: activeWorkoutMeta.week,
      day: activeWorkoutMeta.day,
      stream: activeWorkoutMeta.stream
    });
    
    setIsSaving(false);
    
    if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 50]);
    
    if (success) {
      toast.success("Workout saved successfully!");
    } else {
      toast.warning("Saved locally — cloud sync failed");
      console.error("Cloud sync error:", error);
    }

    const newPBs = await detectAndSavePBs(exercises);
    if (newPBs.length > 0) {
      setPbModal(newPBs);
    } else if (earnedReward && totalVolume > 0) {
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

          {currentWow && activeTab === "All" && !searchQuery && (
            <Card className="bg-primary/10 border-primary overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-24 h-24" />
              </div>
              <CardHeader className="relative z-10 pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-primary font-bold text-xs tracking-wider uppercase bg-primary/20 px-2 py-0.5 rounded-full">
                      Workout of the Week
                    </span>
                    <CardTitle className="text-3xl font-heading uppercase tracking-wider">{currentWow.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-foreground/80 mt-2 whitespace-pre-wrap">
                  {currentWow.description}
                </CardDescription>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                  <Badge variant="outline" className="bg-background">
                    {currentWow.score_type === 'time' ? 'For Time' : currentWow.score_type === 'reps' ? 'Total Reps' : currentWow.score_type === 'distance' ? 'For Distance/Metres' : 'For Calories'}
                  </Badge>
                  <span className="text-muted-foreground">{wowResults.length} logged</span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                {(() => {
                  const myScore = wowResults.find(r => r.member_id === localStorage.getItem('fittrack_current_uid'));
                  const sorted = [...wowResults].sort((a, b) => currentWow.score_type === 'time' ? a.score - b.score : b.score - a.score);
                  const myRank = sorted.findIndex(r => r.member_id === localStorage.getItem('fittrack_current_uid')) + 1;
                  const top3 = sorted.slice(0, 3);
                  
                  return (
                    <div className="flex flex-col gap-3 mt-2">
                      {top3.length > 0 && (
                        <div className="bg-background/50 rounded-lg border border-border p-3 space-y-2">
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Top 3 Leaderboard</p>
                          {top3.map((r, i) => (
                            <div key={r.id} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary w-4">{i + 1}.</span>
                                <span>{r.display_name}</span>
                                {r.scaled && <Badge variant="outline" className="text-[8px] px-1 h-4">Scaled</Badge>}
                              </div>
                              <span className="font-medium">
                                {currentWow.score_type === 'time' ? `${Math.floor((r.score || 0) / 60)}:${((r.score || 0) % 60).toString().padStart(2, '0')}` : r.score}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {myScore ? (
                        <div className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Your Score (Rank {myRank})</p>
                            <p className="text-xl font-heading text-primary">
                              {currentWow.score_type === 'time' ? `${Math.floor((myScore.score || 0) / 60)}:${((myScore.score || 0) % 60).toString().padStart(2, '0')}` : myScore.score}
                              {myScore.scaled && <span className="ml-2 text-xs text-muted-foreground uppercase">(Scaled)</span>}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setShowWowLogger(true)}>Update</Button>
                        </div>
                      ) : (
                        <Button className="w-full font-bold" onClick={() => setShowWowLogger(true)}>Log Your Score</Button>
                      )}
                      <div className="flex gap-2">
                        <Button className="flex-1 font-bold" onClick={() => setViewMode('wow-detail')}>View Workout</Button>
                        <Button variant="secondary" className="flex-1 font-bold" onClick={() => setShowWowLeaderboard(true)}>Leaderboard</Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

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
            {(() => {
              const filtered = workoutTemplates
                .filter(t => !t.workouts || !allowedAccess || allowedAccess.includes(bucketOf(t)))
                .filter(t => activeTab === "All" || (activeTab === "Programs" && t.workouts) || (activeTab === "Workouts" && !t.workouts))
                .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

              // If searching or filtering Workouts, show flat list. Otherwise, group programs by category folders.
              if (searchQuery || activeTab === "Workouts") {
                return filtered.map((template) => (
                  <div 
                    key={template.id} 
                    className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                    onClick={() => openTemplateDetail(template)}
                  >
                    <div className="absolute inset-0 bg-muted">
                      <img src={getCoverImage(template)} alt={template.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                      <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1">
                        {template.workouts ? `${template.weeks || 4} WEEK PROGRAMME` : 'SINGLE WORKOUT'}
                      </span>
                      <h3 className="text-white font-heading text-3xl uppercase leading-tight">{template.name}</h3>
                    </div>
                  </div>
                ));
              }

              // Folder view for programs
              const categories = ["Foundations", "Stronger", "Fusion", "Performance", "Group PT"];
              const singleWorkouts = filtered.filter(t => !t.workouts);
              
              return (
                <>
                  {categories.map(cat => {
                    if (!allowedAccess?.includes(cat)) return null;
                    const catProgs = filtered.filter(t => t.workouts && bucketOf(t) === cat);
                    if (catProgs.length === 0) return null;
                    
                    catProgs.sort((a, b) => {
                      const dateA = a.start_date || a.created_at || "";
                      const dateB = b.start_date || b.created_at || "";
                      return dateB.localeCompare(dateA);
                    });

                    const d = new Date();
                    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    let currentProg = catProgs.find(p => (p.start_date || p.created_at || "") <= todayStr);
                    if (!currentProg) currentProg = catProgs[catProgs.length - 1]; // earliest upcoming if all in future
                    
                    return (
                      <div 
                        key={cat} 
                        className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                        onClick={() => openTemplateDetail(currentProg)}
                      >
                        <div className="absolute inset-0 bg-muted">
                          <img src={getCoverImage(currentProg, cat)} alt={cat} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                          <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1 bg-primary/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm">
                            This Week
                          </span>
                          <h3 className="text-white font-heading text-3xl uppercase leading-tight">{currentProg.name}</h3>
                        </div>
                      </div>
                    );
                  })}
                  
                  {singleWorkouts.length > 0 && (
                    <div className="pt-4 space-y-4">
                      <h3 className="font-heading tracking-wider text-xl uppercase">Single Workouts</h3>
                      {singleWorkouts.map((template) => (
                        <div 
                          key={template.id} 
                          className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                          onClick={() => openTemplateDetail(template)}
                        >
                          <div className="absolute inset-0 bg-muted">
                            <img src={getCoverImage(template)} alt={template.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                            <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1">
                              SINGLE WORKOUT
                            </span>
                            <h3 className="text-white font-heading text-3xl uppercase leading-tight">{template.name}</h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
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
             <img src={getCoverImage(selectedTemplate)} alt={selectedTemplate.name} className="w-full h-full object-cover" />
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
              {selectedTemplate.daysPerWeek && selectedTemplate.stream !== "Stronger" && (
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
                  onClick={() => setTemplateForChooser(selectedTemplate)} 
                  className="w-full text-muted-foreground hover:bg-muted"
                >
                  Switch / End Plan
                </Button>
              </div>
            ) : selectedTemplate.workouts ? (
              <Button onClick={() => setTemplateForChooser(selectedTemplate)} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg">
                <Play className="h-5 w-5 fill-current" /> Switch to this plan
              </Button>
            ) : (
              <Button onClick={() => startTemplate(selectedTemplate)} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg">
                <Play className="h-5 w-5 fill-current" /> Start Workout
              </Button>
            )}
          </div>

          <div className="px-4 md:px-0 space-y-6 pt-4">
            {selectedTemplate.workouts ? (
              <div className="space-y-6">
                {(() => {
                  let currentWeek = 1;
                  const weekNotes = selectedTemplate.weekNotes || {};
                  const d = new Date();
                  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  let latestWeek = 1;
                  let latestDate = "";
                  
                  Object.entries(weekNotes).forEach(([weekNum, notes]: [string, any]) => {
                    if (notes?.start_date && notes.start_date <= todayStr) {
                      if (!latestDate || notes.start_date > latestDate) {
                        latestDate = notes.start_date;
                        latestWeek = parseInt(weekNum, 10);
                      }
                    }
                  });
                  
                  if (latestDate) {
                    currentWeek = latestWeek;
                  } else if (selectedTemplate.start_date) {
                    const start = new Date(selectedTemplate.start_date).getTime();
                    const now = new Date().getTime();
                    currentWeek = Math.max(1, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
                  }
                  if (selectedTemplate.weeks) currentWeek = Math.min(currentWeek, selectedTemplate.weeks);

                  const renderWorkoutCard = (w: any, globalIdx: number, dayIdx: number) => {
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
                              {weekLabel(selectedTemplate, w.week)} · Day {w.day}
                            </div>
                            <div className="font-bold leading-tight">{w.name && !w.name.toLowerCase().startsWith("week ") && !w.name.toLowerCase().startsWith("day ") ? w.name : `Day ${w.day}`}</div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                          {w.exercises?.length || 0} exercises
                        </div>
                      </div>
                    );
                  };

                  const history = getWorkoutHistory();
                  const thisWeekWorkouts = selectedTemplate.workouts
                    .map((w: any, i: number) => ({ w, i }))
                    .filter((x: any) => x.w.week === currentWeek && (x.w.dayCounts ? x.w.dayCounts.includes(preferredDays) : (!x.w.minDays || x.w.minDays <= preferredDays)))
                    .sort((a: any, b: any) => a.w.day - b.w.day); // Ensure day order

                  const processedWorkouts = thisWeekWorkouts.map((x: any) => {
                    const isCompleted = history.some((h: any) => 
                      h.programId === selectedTemplate.id && 
                      h.week === x.w.week && 
                      h.day === x.w.day
                    );
                    return { ...x, isCompleted };
                  });

                  const nextUpIndex = processedWorkouts.findIndex(x => !x.isCompleted);
                  const isWeekComplete = nextUpIndex === -1 && processedWorkouts.length > 0;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground">Sessions</h3>
                        <Select value={preferredDays.toString()} onValueChange={(v) => {
                          const days = parseInt(v, 10);
                          setPreferredDays(days);
                          savePreferredDays(days);
                        }}>
                          <SelectTrigger className="w-auto h-8 text-xs font-bold uppercase tracking-wider bg-muted/50 border-transparent">
                            <SelectValue placeholder="Days" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Days/Week</SelectItem>
                            <SelectItem value="3">3 Days/Week</SelectItem>
                            <SelectItem value="4">4 Days/Week</SelectItem>
                            <SelectItem value="5">5 Days/Week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-4">
                        {processedWorkouts.length > 0 ? (
                          <>
                            {isWeekComplete ? (
                              <div className="text-center py-6 bg-primary/10 rounded-xl border border-primary/20">
                                <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
                                <h4 className="font-heading text-xl tracking-wider text-foreground">Week Complete!</h4>
                                <p className="text-sm text-muted-foreground">You've finished all your sessions for this week.</p>
                              </div>
                            ) : (
                              <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Next up — Session {nextUpIndex + 1} of {processedWorkouts.length}</h4>
                                {renderWorkoutCard(processedWorkouts[nextUpIndex].w, processedWorkouts[nextUpIndex].i, nextUpIndex)}
                              </div>
                            )}
                            
                            {processedWorkouts.length > 1 && (
                              <div className="space-y-2 pt-4 border-t border-border/50">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">All Sessions</h4>
                                {processedWorkouts.map((x: any, idx: number) => {
                                  if (!isWeekComplete && idx === nextUpIndex) return null;
                                  return (
                                    <div key={idx} className="relative">
                                      {x.isCompleted && (
                                        <div className="absolute -left-2 -top-2 z-10 bg-background rounded-full p-0.5">
                                          <CheckCircle2 className="h-5 w-5 text-primary" />
                                        </div>
                                      )}
                                      <div className={x.isCompleted ? "opacity-60" : ""}>
                                        {renderWorkoutCard(x.w, x.i, idx)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No sessions scheduled for this week with {preferredDays} days/week.</p>
                        )}
                      </div>

                      <div className="pt-8 space-y-6">
                        <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground mb-4">Full Library</h3>
                        {Array.from({ length: selectedTemplate.weeks || 1 }).map((_, weekIdx) => {
                          const weekWorkouts = selectedTemplate.workouts
                            .map((w: any, i: number) => ({ w, i }))
                            .filter((x: any) => x.w.week === weekIdx + 1 && (x.w.dayCounts ? x.w.dayCounts.includes(preferredDays) : (!x.w.minDays || x.w.minDays <= preferredDays)));
                          
                          if (weekWorkouts.length === 0) return null;
                          
                          return (
                            <div key={weekIdx} className="space-y-3">
                              <h4 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">{weekLabel(selectedTemplate, weekIdx + 1)}</h4>
                              <div className="space-y-2">
                                {weekWorkouts.map((x: any, dayIdx: number) => renderWorkoutCard(x.w, x.i, dayIdx))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Past Weeks in Category */}
                      {(() => {
                        const cat = bucketOf(selectedTemplate);
                        const catProgs = workoutTemplates.filter(t => t.workouts && bucketOf(t) === cat && t.id !== selectedTemplate.id);
                        if (catProgs.length === 0) return null;
                        
                        catProgs.sort((a, b) => {
                          const dateA = a.start_date || a.created_at || "";
                          const dateB = b.start_date || b.created_at || "";
                          return dateB.localeCompare(dateA);
                        });

                        return (
                          <div className="pt-8 space-y-4">
                            <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground mb-4">Past Weeks ({cat})</h3>
                            <div className="space-y-3">
                              {catProgs.map(prog => (
                                <div 
                                  key={prog.id} 
                                  className="p-4 rounded-xl border border-border bg-card flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    setSelectedTemplate(prog);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                >
                                  <div>
                                    <div className="font-bold text-lg">{prog.name}</div>
                                    {prog.start_date && (
                                      <div className="text-sm text-muted-foreground">W/C {new Date(prog.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm">View</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">Exercises</h3>
                <div className="space-y-2">
                  {selectedTemplate.exercises?.map((ex: any, idx: number) => {
                    const libEx = exerciseLibrary.find(e => String(e.id) === String(ex.name));
                    const setsCount = ex.setsData?.length || ex.sets || 3;
                    const firstSet = ex.setsData?.[0] || ex || {};
                    const rawTrack = libEx?.trackingType ?? "Weight & Reps";
                    const trackingArray = (Array.isArray(rawTrack) ? rawTrack : String(rawTrack).split(/[;,]/)).map(s => s.trim()).filter(Boolean);
                    let details = [];
                    if (trackingArray.includes('Distance & Time') && firstSet.distance) details.push(`${firstSet.distance}m`);
                    if ((trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) && (firstSet.timeMins || firstSet.timeSecs)) {
                      const m = firstSet.timeMins || 0;
                      const s = firstSet.timeSecs || 0;
                      if (m || s) details.push(`${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim());
                    }
                    if (trackingArray.includes('Calories') && firstSet.calories) details.push(`${firstSet.calories} cals`);
                    if (details.length === 0 || trackingArray.includes('Weight & Reps')) {
                      details.push(`${firstSet.reps || 0} reps`);
                    }
                    const detailStr = details.join(', ');
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
        {viewMode === 'wow-detail' && currentWow && (
          <motion.div 
            key="wow-detail"
            custom={viewDirection}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24"
          >
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewMode('browse')} className="w-fit -ml-4 text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="flex flex-col gap-1">
                <span className="text-primary font-bold text-xs tracking-wider uppercase">
                  Workout of the Week
                </span>
                <h2 className="text-4xl font-heading tracking-wider uppercase text-foreground leading-none">
                  {currentWow.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                  <Badge variant="outline" className="bg-background">
                    {currentWow.score_type === 'time' ? 'For Time' : currentWow.score_type === 'reps' ? 'Total Reps' : currentWow.score_type === 'distance' ? 'For Distance/Metres' : 'For Calories'}
                  </Badge>
                  <span>·</span>
                  <span>{wowResults.length} logged</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const exercises = currentWow.exercises || [];
                const sections: {section: any, exercises: any[]}[] = [];
                let currentSection: any = null;
                let currentGroup: any[] = [];
                
                exercises.forEach((ex: any) => {
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
                          
                          const rawTrack = libEx?.trackingType ?? "Weight & Reps";
                          const trackingArray = (Array.isArray(rawTrack) ? rawTrack : String(rawTrack).split(/[;,]/)).map(s => s.trim()).filter(Boolean);
                          
                          let metrics = [];
                          if (trackingArray.includes('Distance & Time') && ex.distance) metrics.push(`${ex.distance}m`);
                          if ((trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) && (ex.timeMins || ex.timeSecs)) {
                            metrics.push(`${ex.timeMins ? ex.timeMins + 'm ' : ''}${ex.timeSecs ? ex.timeSecs + 's' : ''}`.trim());
                          }
                          if (trackingArray.includes('Calories') && ex.calories) metrics.push(`${ex.calories} cals`);
                          
                          let detailText = "";
                          if (metrics.length > 0) {
                            detailText = ex.sets && ex.sets > 1 ? `${ex.sets} × ${metrics.join(', ')}` : metrics.join(', ');
                          } else {
                            detailText = `${ex.sets || 1} × ${ex.reps || 0}`;
                          }

                          const isSupersetItem = ex.linkedToNext || (exIdx > 0 && sec.exercises[exIdx - 1].linkedToNext);

                          return (
                            <div key={exIdx} className="flex gap-3 items-center group cursor-pointer" onClick={() => {
                              if (libEx?.videoUrl) {
                                setVideoTutorial(libEx.videoUrl);
                                setVideoTitle(libEx.name);
                              }
                            }}>
                              <div className="relative shrink-0">
                                {isSupersetItem && (
                                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-full bg-primary rounded-full" />
                                )}
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                                  {libEx?.videoUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                      <PlayCircle className="h-5 w-5 text-primary opacity-80" />
                                    </div>
                                  ) : (
                                    <Dumbbell className="h-5 w-5 text-muted-foreground opacity-50" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{libEx?.name || ex.name || "Unknown Exercise"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground font-medium">{detailText}</span>
                                  {isSupersetItem && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 uppercase bg-primary/10 text-primary border-primary/20">
                                      Superset
                                    </Badge>
                                  )}
                                </div>
                              </div>
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
                          
                          const rawTrack = libEx?.trackingType ?? "Weight & Reps";
                          const trackingArray = (Array.isArray(rawTrack) ? rawTrack : String(rawTrack).split(/[;,]/)).map(s => s.trim()).filter(Boolean);
                          
                          let details = [];
                          if (trackingArray.includes('Distance & Time') && firstSet.distance) details.push(`${firstSet.distance}m`);
                          if ((trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) && (firstSet.timeMins || firstSet.timeSecs)) {
                            const m = firstSet.timeMins || 0;
                            const s = firstSet.timeSecs || 0;
                            if (m || s) details.push(`${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim());
                          }
                          if (trackingArray.includes('Calories') && firstSet.calories) details.push(`${firstSet.calories} cals`);
                          if (details.length === 0 || trackingArray.includes('Weight & Reps')) {
                            details.push(`${firstSet.reps || 0} reps`);
                          }
                          const detailStr = details.join(', ');

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

          {activeProgram && (!allowedAccess || allowedAccess.includes(activeProgram.type === 'GroupPT' ? 'Group PT' : (activeProgram.stream || 'Foundations'))) && (
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
                  readOnly
                  className="bg-muted/50 cursor-not-allowed focus-visible:ring-0"
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
                          
                          const rawTrack = libEx?.trackingType ?? "Weight & Reps";
                          const trackingArray = (Array.isArray(rawTrack) ? rawTrack : String(rawTrack).split(/[;,]/)).map(s => s.trim()).filter(Boolean);
                          
                          let details = [];
                          if (trackingArray.includes('Distance & Time') && firstSet.distance) details.push(`${firstSet.distance}m`);
                          if ((trackingArray.includes('Time Only') || trackingArray.includes('Distance & Time')) && (firstSet.timeMins || firstSet.timeSecs)) {
                            const m = firstSet.timeMins || 0;
                            const s = firstSet.timeSecs || 0;
                            if (m || s) details.push(`${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim());
                          }
                          if (trackingArray.includes('Calories') && firstSet.calories) details.push(`${firstSet.calories} cals`);
                          if (details.length === 0 || trackingArray.includes('Weight & Reps')) {
                            details.push(`${firstSet.reps || 0} reps`);
                          }
                          
                          const detailStr = details.join(', ');
                          
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
                          const pbStats = exercise.name ? getPersonalRecords().find((p: any) => String(p.exercise) === String(exercise.name) || String(p.exerciseId) === String(exercise.name)) : null;
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
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap bg-muted/30 p-2 rounded-md border border-border/50">
                                      <div className="flex items-center gap-1">
                                        <History className="h-3 w-3" /> 
                                        Last: {lastStats.weight}kg &times; {lastStats.reps}
                                      </div>
                                      {pbStats && (
                                        <>
                                          <span className="opacity-50">&middot;</span>
                                          <div className="flex items-center gap-1 text-primary">
                                            <Trophy className="h-3 w-3" />
                                            PB: {pbStats.weight}kg
                                          </div>
                                        </>
                                      )}
                                      {(() => {
                                        const expectedReps = parseInt(String(exercise.reps || "0").split("/")[0]) || 0;
                                        if (expectedReps > 0 && lastStats.reps >= expectedReps) {
                                          const isDumbbell = String(libraryExercise?.equipment || "").toLowerCase() === "dumbbell";
                                          const inc = isDumbbell ? 2 : 2.5;
                                          return (
                                            <>
                                              <span className="opacity-50">&middot;</span>
                                              <div className="flex items-center gap-1 font-medium">
                                                Try: {lastStats.weight + inc}kg
                                              </div>
                                            </>
                                          );
                                        } else if (expectedReps > 0) {
                                          return (
                                            <>
                                              <span className="opacity-50">&middot;</span>
                                              <div className="flex items-center gap-1 font-medium">
                                                Try: {lastStats.weight}kg
                                              </div>
                                            </>
                                          );
                                        }
                                        return null;
                                      })()}
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
                                              // No rest between superset movements — only after the last exercise in the group
                                              if (!exercise.linkedToNext) {
                                                const restTime = exercise.rest || 0;
                                                if (restTime > 0) {
                                                  startTimer(restTime);
                                                }
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
                        {/* Primary navigation: Next is the prominent CTA */}
                        {currentBlockIndex < blocks.length - 1 ? (
                          <Button
                            className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-16 text-xl shadow-lg"
                            onClick={() => setCurrentBlockIndex(prev => Math.min(blocks.length - 1, prev + 1))}
                          >
                            Next <ArrowRight className="h-5 w-5" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleSaveWorkout}
                            disabled={isSaving}
                            className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-16 text-xl shadow-lg"
                          >
                            <Check className="h-5 w-5" /> {isSaving ? "Saving..." : "Finish Workout"}
                          </Button>
                        )}
                        {/* Secondary navigation: Previous + subtle End */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 font-medium tracking-wider h-12"
                            disabled={currentBlockIndex === 0}
                            onClick={() => setCurrentBlockIndex(prev => Math.max(0, prev - 1))}
                          >
                            <ArrowLeftIcon className="h-4 w-4" /> Previous
                          </Button>
                          <span className="text-xs text-muted-foreground px-1">
                            {currentBlockIndex + 1} / {blocks.length}
                          </span>
                          <button
                            onClick={() => setShowEndConfirm(true)}
                            className="text-sm text-muted-foreground hover:text-destructive font-medium px-3 py-2 transition-colors"
                          >
                            End workout
                          </button>
                        </div>
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

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent className="sm:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-heading tracking-wider">End workout?</AlertDialogTitle>
            <AlertDialogDescription>
              You've logged {currentBlockIndex + 1} of {blocks.length} exercises. Finishing now will save your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 h-12 font-bold tracking-wide">Keep going</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-12 font-bold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveWorkout}
            >
              Finish & save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <Dialog open={!!pbModal} onOpenChange={(open) => !open && setPbModal(null)}>
        <DialogContent className="sm:max-w-md text-center bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading tracking-wider text-center">🏆 New Personal Record!</DialogTitle>
          </DialogHeader>
          {pbModal && (
            <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in duration-500">
              <div className="text-6xl mt-2 mb-4">🏆</div>
              <div className="space-y-3 w-full">
                {pbModal.map((pb, i) => {
                  const libEx = exerciseLibrary.find(e => String(e.id) === String(pb.exercise));
                  return (
                    <div key={i} className="bg-muted/50 p-3 rounded-lg border border-border">
                      <p className="font-bold text-lg">{libEx?.name || pb.exercise}</p>
                      <p className="text-primary font-heading tracking-wider text-2xl">{pb.weight}kg &times; {pb.reps}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 w-full mt-4">
                <Button className="w-full text-lg h-12 font-bold tracking-wide" onClick={() => {
                  saveCommunityPost({
                    id: 'pb_' + Date.now(),
                    user: { name: 'You', avatar: 'ME' },
                    date: new Date().toISOString(),
                    type: 'pb',
                    pbs: pbModal.map(p => ({ exercise: p.exercise, weight: p.weight, reps: p.reps })),
                    likes: 0, comments: 0,
                  });
                  toast.success("Shared to feed!");
                  setPbModal(null);
                }}>Share to feed</Button>
                <Button variant="ghost" className="w-full" onClick={() => setPbModal(null)}>Not now</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!templateForChooser} onOpenChange={(open) => !open && setTemplateForChooser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">How many days a week can you train?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[2, 3, 4, 5].map(days => {
              const previewText = buildDayPreview(templateForChooser, days);
              return (
                <Button 
                  key={days} 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1"
                  onClick={() => activateProgram(templateForChooser, days)}
                >
                  <span className="font-bold text-lg">{days} days</span>
                  <span className="text-sm text-muted-foreground whitespace-normal text-left leading-snug">{previewText}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWowLogger} onOpenChange={setShowWowLogger}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">Log Your Score</DialogTitle>
          </DialogHeader>
          {currentWow && (
            <div className="space-y-4 py-4">
              {currentWow.score_type === 'time' ? (
                <div className="flex gap-2">
                  <div className="space-y-2 flex-1">
                    <Label>Minutes</Label>
                    <Input type="number" value={wowLogScore} onChange={e => setWowLogScore(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Seconds</Label>
                    <Input type="number" value={wowLogScoreSecs} onChange={e => setWowLogScoreSecs(e.target.value)} placeholder="00" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Score ({currentWow.score_type === 'reps' ? 'Reps' : currentWow.score_type === 'distance' ? 'Metres' : 'Calories'})</Label>
                  <Input type="number" value={wowLogScore} onChange={e => setWowLogScore(e.target.value)} placeholder="0" />
                </div>
              )}
              {currentWow.scaled_allowed && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="scaled" checked={wowLogScaled} onCheckedChange={(c) => setWowLogScaled(!!c)} />
                  <Label htmlFor="scaled">I did the scaled version</Label>
                </div>
              )}
              <Button className="w-full mt-4" onClick={handleLogWow}>Save Score</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWowLeaderboard} onOpenChange={setShowWowLeaderboard}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">Leaderboard</DialogTitle>
          </DialogHeader>
          {currentWow && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex gap-2 mb-4 shrink-0">
                {["Overall", "Male", "Female"].map(f => (
                  <Button key={f} variant={wowLeaderboardFilter === f ? "default" : "outline"} size="sm" onClick={() => setWowLeaderboardFilter(f as any)} className="flex-1">
                    {f}
                  </Button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                {(() => {
                  const filtered = wowResults.filter(r => wowLeaderboardFilter === "Overall" || r.gender.toLowerCase() === wowLeaderboardFilter.toLowerCase());
                  filtered.sort((a, b) => currentWow.score_type === 'time' ? a.score - b.score : b.score - a.score);
                  
                  if (filtered.length === 0) return <p className="text-center text-muted-foreground py-8">No scores yet.</p>;

                  return filtered.map((r, i) => {
                    const isMe = r.member_id === localStorage.getItem('fittrack_current_uid');
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? 'bg-primary/10 border-primary' : 'bg-card border-border'}`}>
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-muted-foreground w-6 text-center">{i + 1}</div>
                          <div>
                            <div className="font-bold">{r.display_name} {isMe && "(You)"}</div>
                            {r.scaled && <div className="text-[10px] text-muted-foreground uppercase">Scaled</div>}
                          </div>
                        </div>
                        <div className="font-heading text-xl text-primary">
                          {currentWow.score_type === 'time' ? `${Math.floor((r.score || 0) / 60)}:${((r.score || 0) % 60).toString().padStart(2, '0')}` : r.score}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <Button className="w-full mt-4 shrink-0" variant="outline" onClick={() => {
                const myScore = wowResults.find(r => r.member_id === localStorage.getItem('fittrack_current_uid'));
                if (!myScore) return;
                saveCommunityPost({
                  id: 'wow_' + Date.now(),
                  user: { name: 'You', avatar: 'ME' },
                  date: new Date().toISOString(),
                  type: 'wow',
                  wowDetails: {
                    name: currentWow.name,
                    score: currentWow.score_type === 'time' ? `${Math.floor((myScore.score || 0) / 60)}:${((myScore.score || 0) % 60).toString().padStart(2, '0')}` : (myScore.score || 0).toString(),
                    scaled: myScore.scaled
                  },
                  likes: 0, comments: 0,
                });
                toast.success("Shared to feed!");
                setShowWowLeaderboard(false);
              }}>Share to Feed</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWowShare} onOpenChange={setShowWowShare}>
        <DialogContent className="sm:max-w-md bg-card border-border text-center">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">Score Logged!</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center">
            <Trophy className="h-16 w-16 text-primary mb-4" />
            <p className="text-muted-foreground mb-6">Great job crushing the Workout of the Week!</p>
            <div className="flex gap-4 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowWowShare(false)}>Not now</Button>
              <Button className="flex-1" onClick={() => {
                saveCommunityPost({
                  id: 'wow_' + Date.now(),
                  user: { name: 'You', avatar: 'ME' },
                  date: new Date().toISOString(),
                  type: 'wow',
                  wowDetails: {
                    name: currentWow.name,
                    score: currentWow.score_type === 'time' ? `${Math.floor((wowShareResult.score || 0) / 60)}:${((wowShareResult.score || 0) % 60).toString().padStart(2, '0')}` : (wowShareResult.score || 0).toString(),
                    scaled: wowShareResult.scaled
                  },
                  likes: 0, comments: 0,
                });
                toast.success("Shared to feed!");
                setShowWowShare(false);
              }}>Share to feed</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!videoTutorial} onOpenChange={(open) => !open && setVideoTutorial(null)}>
        <DialogContent className="sm:max-w-[800px] p-0 bg-black overflow-hidden border-none">
          <div className="aspect-video w-full">
            {videoTutorial && (
              <iframe
                src={getEmbedUrl(videoTutorial)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={videoTitle || "Exercise Tutorial"}
              />
            )}
          </div>
          <div className="p-4 bg-card border-t border-border flex justify-between items-center">
            <h3 className="font-heading text-xl uppercase tracking-wider">{videoTitle}</h3>
            <Button variant="ghost" size="sm" onClick={() => setVideoTutorial(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workouts;
