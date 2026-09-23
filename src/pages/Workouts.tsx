import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PbModal } from "@/components/PbModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dumbbell,
  Plus,
  Trash2,
  PlayCircle,
  History,
  Timer,
  X,
  Play,
  Pause,
  RotateCcw,
  Link2,
  Link2Off,
  Heading,
  List,
  Check,
  Search,
  ArrowLeft,
  RefreshCw,
  Trophy,
  CheckCircle2,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  ChevronDown,
  ChevronRight,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useState, useEffect, useMemo } from "react";
import {
  getExercises,
  getExerciseEnrichment,
  getPrograms,
  saveWorkoutToHistory,
  getLastExerciseStats,
  getActiveProgram,
  saveActiveProgram,
  getHabits,
  detectAndSavePBs,
  saveCommunityPost,
  getPersonalRecords,
  getPreferredDays,
  savePreferredDays,
  getWorkoutHistory,
  getWorkoutsOfWeek,
  getWowResults,
  saveWowResult,
  getExerciseHistory,
} from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { ConditioningTimer } from "@/components/ConditioningTimer";
import { AdLibLogSheet } from "@/components/AdLibLogSheet";

import {
  PROGRESSION_OPTIONS,
  REWARD_ITEMS,
  playPing,
} from "@/lib/workoutConstants";
import {
  Stepper,
  TimeStepper,
  columnsFor,
  fmtSet,
  fmtLastTime,
  weekLabel,
  sessionTitle,
  getCoverImage,
  sectionIndexToBlockIndex,
} from "@/lib/workoutHelpers";
import { trackingOf } from "@/lib/tracking";
import { WorkoutOverviewSections } from "@/components/WorkoutOverviewSections";
import { PickOneSelector } from "@/components/PickOneSelector";
import { exercisesForSave } from "@/lib/pickOneFilter";
import {
  pickOneOptionsForBlock,
  skippedPickOneBlocks,
  nextVisibleBlock,
  prevVisibleBlock,
  visibleBlockCount,
  visibleBlockPosition,
} from "@/lib/pickOneBlocks";
import { useViewModeGuard } from "@/lib/workoutRestore";
import { normaliseReps, buildDefaultSetsData } from "@/lib/repsNormalise";
import {
  buildSavedExercises,
  computeTotalVolume,
  computeEarnedReward,
} from "@/lib/workoutSaveHelpers";
import { SessionOverviewView } from "@/components/SessionOverviewView";
import {
  WorkoutNavFooter,
  getNextVisible,
  getPrevVisible,
} from "@/components/WorkoutNavFooter";

const Workouts = () => {
  const navigate = useNavigate();
  const [viewMode, setViewModeState] = useState<
    "browse" | "detail" | "session-overview" | "active" | "wow-detail"
  >("browse");
  const [viewDirection, setViewDirection] = useState<"forward" | "backward">(
    "forward",
  );

  const setViewMode = (
    newMode: "browse" | "detail" | "session-overview" | "active" | "wow-detail",
  ) => {
    const depths = {
      browse: 0,
      detail: 1,
      "session-overview": 2,
      active: 3,
      "wow-detail": 1,
    };
    setViewDirection(
      depths[newMode] > depths[viewMode] ? "forward" : "backward",
    );
    setViewModeState(newMode);
  };
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<any[]>([
    {
      id: 1,
      blockType: "Strength",
      name: "",
      setsData: [
        {
          id: "1",
          reps: 10,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          completed: false,
        },
        {
          id: "2",
          reps: 10,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          completed: false,
        },
        {
          id: "3",
          reps: 10,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          completed: false,
        },
      ],
      rest: 0,
      linkedToNext: false,
      eachSide: false,
    },
  ]);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, any>>({});
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [altSearch, setAltSearch] = useState("");
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [rewardModal, setRewardModal] = useState<{
    name: string;
    emoji: string;
    volume: number;
    count?: number;
    displayName?: string;
  } | null>(null);
  const [pbModal, setPbModal] = useState<any[] | null>(null);
  const [adLibOpen, setAdLibOpen] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [quickOverviewWorkout, setQuickOverviewWorkout] = useState<any>(null);
  const [templateForChooser, setTemplateForChooser] = useState<any>(null);
  const [videoTutorial, setVideoTutorial] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [showSectionSlide, setShowSectionSlide] = useState(false);
  const [lastSeenSectionId, setLastSeenSectionId] = useState<number | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [pastLiftsModal, setPastLiftsModal] = useState<{ name: string } | null>(
    null,
  );
  const [openProg, setOpenProg] = useState<string | null>(null);
  const [activeWorkoutMeta, setActiveWorkoutMeta] = useState<{
    programId?: string;
    week?: number;
    day?: number;
    stream?: string;
    title?: string;
  }>({});
  const [conditioningResults, setConditioningResults] = useState<
    Record<string, any>
  >({});
  // pickOne finisher: sectionId -> chosen option index (within the section's option blocks). null = no choice yet.
  const [pickOneChoices, setPickOneChoices] = useState<
    Record<string, number | null>
  >({});
  // Sections the member chose to skip (by section-header exercise id).
  const [skippedSectionIds, setSkippedSectionIds] = useState<
    Set<string | number>
  >(new Set());
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
            type: currentGroup.length > 1 ? "superset" : "single",
            exercises: currentGroup,
            section: currentSection,
          });
          currentGroup = [];
        }
      }
    });

    if (currentGroup.length > 0) {
      result.push({
        id: `block-end`,
        type: currentGroup.length > 1 ? "superset" : "single",
        exercises: currentGroup,
        section: currentSection,
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
  const [wowLeaderboardFilter, setWowLeaderboardFilter] = useState<
    "Overall" | "Male" | "Female"
  >("Overall");

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let currentWow = wows.find((w: any) => w.week_start <= todayStr);
  if (!currentWow && wows.length > 0) currentWow = wows[wows.length - 1];

  const handleLogWow = async () => {
    if (!currentWow) return;

    let score = 0;
    if (currentWow.score_type === "time") {
      const mins = parseInt(wowLogScore) || 0;
      const secs = parseInt(wowLogScoreSecs) || 0;
      score = mins * 60 + secs;
      if (score <= 0) {
        toast.error("Please enter a valid time");
        return;
      }
    } else {
      score = parseFloat(wowLogScore) || 0;
      if (score <= 0) {
        toast.error("Please enter a valid score");
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("members")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const { data: macros } = await supabase
      .from("member_macros")
      .select("sex")
      .eq("member_id", user.id)
      .maybeSingle();

    const fullName =
      profile?.full_name || (user.user_metadata as any)?.full_name || "";
    const displayName = fullName.trim().split(" ")[0] || "Member";
    const gender = macros?.sex || "unknown";

    const result = {
      id: `wow_res_${Date.now()}`,
      wow_id: currentWow.id,
      member_id: user.id,
      display_name: displayName,
      gender: gender,
      score: score,
      scaled: wowLogScaled,
    };

    const existing = wowResults.find((r) => r.member_id === user.id);
    if (existing) {
      if (currentWow.score_type === "time" && existing.score <= score) {
        toast.info("Your existing score is better!");
        setShowWowLogger(false);
        return;
      }
      if (currentWow.score_type !== "time" && existing.score >= score) {
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
      toast.error(`Failed to log score: ${error?.message || "Unknown error"}`);
    }
  };

  const bucketOf = (p: any) =>
    p.type === "GroupPT" ? "Group PT" : p.stream || p.name || "Workout";

  useEffect(() => {
    const loadLibrary = async () => {
      const lib = await getExercises();
      setExerciseLibrary(lib);
      setEnrichment(await getExerciseEnrichment());
      setWorkoutTemplates(getPrograms());
      setActiveProgram(getActiveProgram());
      setPreferredDays(getPreferredDays());

      const wowsData = await getWorkoutsOfWeek();
      setWows(wowsData);

      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      let currentWow = wowsData.find((w: any) => w.week_start <= todayStr);
      if (!currentWow && wowsData.length > 0)
        currentWow = wowsData[wowsData.length - 1];

      if (currentWow) {
        const results = await getWowResults(currentWow.id);
        setWowResults(results);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("members")
          .select("allowed_access")
          .eq("id", user.id)
          .maybeSingle();
        setAllowedAccess(
          data?.allowed_access ?? [
            "Foundations",
            "Stronger",
            "Fusion",
            "Performance",
          ],
        );
      } else {
        setAllowedAccess(["Foundations", "Stronger", "Fusion", "Performance"]);
      }
    };

    loadLibrary();
    // Re-read from localStorage after sync completes — fixes blank page on fresh sessions
    // where the library wasn't in localStorage at first mount.
    const onSynced = () => {
      setExerciseLibrary(getExercises());
      setWorkoutTemplates(getPrograms());
      setActiveProgram(getActiveProgram());
    };
    window.addEventListener("fittrack_synced", onSynced);
    return () => window.removeEventListener("fittrack_synced", onSynced);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("wow") === "true") {
      setViewMode("wow-detail");
      // Clean up URL
      window.history.replaceState({}, "", "/workouts");
    }
  }, []);

  // Restore active workout session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fittrack_active_workout");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.workoutName) setWorkoutName(parsed.workoutName);
        if (parsed.exercises && parsed.exercises.length > 0)
          setExercises(parsed.exercises);
        if (parsed.pickOneChoices !== undefined)
          setPickOneChoices(parsed.pickOneChoices);
        if (parsed.currentBlockIndex !== undefined)
          setCurrentBlockIndex(parsed.currentBlockIndex);
        if (parsed.lastSeenSectionId !== undefined)
          setLastSeenSectionId(parsed.lastSeenSectionId);
        if (parsed.showSectionSlide !== undefined)
          setShowSectionSlide(parsed.showSectionSlide);
        if (parsed.restEndsAt !== undefined) setRestEndsAt(parsed.restEndsAt);
        if (parsed.pausedTimeLeft !== undefined)
          setPausedTimeLeft(parsed.pausedTimeLeft);
        if (parsed.viewMode === "active") setViewMode("active");
        else setViewMode("browse");
        if (parsed.startTime !== undefined) setStartTime(parsed.startTime);
        if (parsed.activeWorkoutMeta !== undefined)
          setActiveWorkoutMeta(parsed.activeWorkoutMeta);
      } catch (e) {
        console.error("Failed to parse saved workout", e);
      }
    }
  }, []);

  // Belt-and-braces: reset to browse if the current mode's required data is missing.
  useViewModeGuard(
    viewMode,
    setViewMode,
    selectedTemplate,
    quickOverviewWorkout,
    currentWow,
  );

  // Persist active workout session
  useEffect(() => {
    const saveActiveWorkout = () => {
      const hasActiveContent =
        workoutName ||
        exercises.length > 1 ||
        (exercises.length === 1 && exercises[0].name);
      if (viewMode === "active" || hasActiveContent) {
        localStorage.setItem(
          "fittrack_active_workout",
          JSON.stringify({
            workoutName,
            exercises,
            pickOneChoices,
            currentBlockIndex,
            lastSeenSectionId,
            showSectionSlide,
            restEndsAt,
            pausedTimeLeft,
            viewMode,
            startTime,
            activeWorkoutMeta,
          }),
        );
      } else {
        localStorage.removeItem("fittrack_active_workout");
      }
    };

    saveActiveWorkout();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveActiveWorkout();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    workoutName,
    exercises,
    pickOneChoices,
    currentBlockIndex,
    lastSeenSectionId,
    showSectionSlide,
    restEndsAt,
    pausedTimeLeft,
    viewMode,
    startTime,
  ]);

  useEffect(() => {
    if (blocks.length > 0 && currentBlockIndex >= blocks.length) {
      setCurrentBlockIndex(Math.max(0, blocks.length - 1));
    }
  }, [blocks.length, currentBlockIndex]);

  useEffect(() => {
    if (
      viewMode === "active" &&
      blocks.length > 0 &&
      currentBlockIndex < blocks.length
    ) {
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
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startTimer = (seconds: number) => {
    setRestEndsAt(Date.now() + seconds * 1000);
    setPausedTimeLeft(null);
  };

  const toggleTimer = () => {
    if (restEndsAt) {
      setPausedTimeLeft(
        Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)),
      );
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

  const currentRemaining = restEndsAt
    ? Math.max(0, Math.ceil((restEndsAt - now) / 1000))
    : pausedTimeLeft || 0;
  const isTimerVisible = restEndsAt !== null || pausedTimeLeft !== null;

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: Date.now(),
        blockType: "Strength",
        name: "",
        setsData: [
          {
            id: Date.now().toString(),
            reps: 10,
            weight: 0,
            distance: 0,
            timeMins: 0,
            timeSecs: 0,
            completed: false,
          },
        ],
        rest: 0,
        linkedToNext: false,
        eachSide: false,
      },
    ]);
  };

  const removeExercise = (id: number) => {
    setExercises(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: number, field: string, value: any) => {
    setExercises(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  };

  const openTemplateDetail = (template: any) => {
    if (template.workouts && !activeProgram) {
      setTemplateForChooser(template);
    } else {
      setSelectedTemplate(template);
      setViewMode("detail");
    }
  };

  const buildDayPreview = (template: any, days: number) => {
    if (!template || !template.workouts) return "";
    const weeks = Array.from(
      new Set(template.workouts.map((w: any) => w.week)),
    ).sort();
    const firstWeek = weeks[0] || 1;
    const weekWorkouts = template.workouts.filter(
      (w: any) => w.week === firstWeek,
    );
    const validSessions = weekWorkouts.filter((w: any) =>
      w.dayCounts
        ? w.dayCounts.includes(days)
        : !w.minDays || w.minDays <= days,
    );
    return validSessions
      .map((w: any) =>
        w.name &&
        !w.name.toLowerCase().startsWith("week ") &&
        !w.name.toLowerCase().startsWith("day ")
          ? w.name
          : `Day ${w.day}`,
      )
      .join(" + ");
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
      weekNotes: template.weekNotes,
    };
    setActiveProgram(newActive);
    await saveActiveProgram(newActive);

    setSelectedTemplate(template);
    setViewMode("detail");
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
      weekNotes: template.weekNotes,
    };
    setActiveProgram(newActive);
    saveActiveProgram(newActive);

    setWorkoutName(sessionTitle(template, session));
    setExercises(
      session.exercises.map((ex: any, idx: number) => ({
        id: Date.now() + idx,
        ...ex,
        eachSide: normaliseReps(ex).eachSide || ex.eachSide,
        setsData: ex.setsData || buildDefaultSetsData(ex),
      })),
    );
    setCurrentBlockIndex(0);
    setLastSeenSectionId(null);
    setShowSectionSlide(false);
    const resolvedStream =
      template.stream || (template.type === "GroupPT" ? "Group PT" : "Workout");
    setActiveWorkoutMeta({
      programId: template.id,
      week: session.week,
      day: session.day,
      stream: resolvedStream,
      title: sessionTitle(template, session),
    });
    setStartTime(Date.now());
    toast.success(`Started program: ${template.name}`);
    setViewMode("active");
  };

  const startTemplate = (template: any) => {
    if (template.workouts && template.workouts.length > 0) {
      activateProgram(template, preferredDays);
    } else {
      setWorkoutName(template.name);
      setExercises(
        template.exercises.map((ex: any, idx: number) => ({
          id: Date.now() + idx,
          ...ex,
          eachSide: normaliseReps(ex).eachSide || ex.eachSide,
          setsData: ex.setsData || buildDefaultSetsData(ex),
        })),
      );
      setCurrentBlockIndex(0);
      setLastSeenSectionId(null);
      setShowSectionSlide(false);
      setStartTime(Date.now());
      setViewMode("active");
    }
  };

  const resumeActiveProgram = () => {
    if (activeProgram && activeProgram.workouts) {
      const hasActiveContent =
        workoutName ||
        exercises.length > 1 ||
        (exercises.length === 1 && exercises[0].name);
      if (!hasActiveContent) {
        const currentWorkout =
          activeProgram.workouts[activeProgram.currentIndex];
        if (currentWorkout && currentWorkout.exercises) {
          const resolvedTitle = sessionTitle(activeProgram, currentWorkout);
          if (!activeWorkoutMeta?.title) setWorkoutName(resolvedTitle);
          setActiveWorkoutMeta((m) => ({
            ...m,
            title: m?.title || resolvedTitle,
            stream:
              m?.stream ||
              activeProgram.stream ||
              (activeProgram.type === "GroupPT" ? "Group PT" : "Workout"),
          }));
          setExercises(
            currentWorkout.exercises.map((ex: any, idx: number) => ({
              id: Date.now() + idx,
              blockType: ex.blockType || "Strength",
              ...ex,
              eachSide: normaliseReps(ex).eachSide || ex.eachSide,
              setsData: ex.setsData || buildDefaultSetsData(ex),
            })),
          );
          setCurrentBlockIndex(0);
          setLastSeenSectionId(null);
          setShowSectionSlide(false);
        }
      }
    }
    setViewMode("active");
  };

  const handleSaveWorkout = async () => {
    if (!workoutName) {
      toast.error("Please enter a workout name");
      return;
    }

    setIsSaving(true);

    // Only save/log the chosen option of any pickOne section, and drop
    // explicitly-skipped sections. Conditioning results are attached.
    const exercisesWithResults = buildSavedExercises(
      exercises,
      pickOneChoices,
      skippedSectionIds,
      conditioningResults,
    );
    const savedExercises = exercisesWithResults;
    let duration = 45;
    if (startTime) {
      duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    }

    const totalVolume = computeTotalVolume(savedExercises);
    const earnedReward = computeEarnedReward(totalVolume);

    // Generate an ID before saving so we can dedupe
    const sessionWorkoutId = Date.now().toString();

    const { success, error } = await saveWorkoutToHistory({
      id: sessionWorkoutId,
      name: activeWorkoutMeta?.title || workoutName,
      exercises: exercisesWithResults,
      volume: totalVolume,
      duration: duration,
      reward: earnedReward || null,
      programId: activeWorkoutMeta.programId,
      week: activeWorkoutMeta.week,
      day: activeWorkoutMeta.day,
      stream: activeWorkoutMeta.stream,
    });

    setIsSaving(false);

    if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 50]);

    if (success) {
      toast.success("Workout saved successfully!");
    } else {
      // Failure must be unmissable — do NOT advance to Up Next automatically
      toast.error("Saved on device — will retry syncing");
      console.error("Cloud sync error:", error);
    }

    const newPBs = await detectAndSavePBs(savedExercises);
    if (newPBs.length > 0) {
      setPbModal(newPBs);
    } else if (earnedReward && totalVolume > 0) {
      setRewardModal({ ...earnedReward, volume: totalVolume });
    }

    if (success && activeProgram) {
      const nextIndex = activeProgram.currentIndex + 1;
      if (nextIndex < activeProgram.workouts.length) {
        const updatedProgram = { ...activeProgram, currentIndex: nextIndex };
        setActiveProgram(updatedProgram);
        saveActiveProgram(updatedProgram);
        // Delay the Up Next toast so it doesn't cover the save result
        setTimeout(
          () =>
            toast.info(`Up next: ${activeProgram.workouts[nextIndex].name}`),
          1400,
        );
      } else {
        setTimeout(
          () =>
            toast.success(
              `Congratulations! You completed ${activeProgram.name}!`,
            ),
          1400,
        );
        setActiveProgram(null);
        saveActiveProgram(null);
      }
    }

    setWorkoutName("");
    setExercises([
      {
        id: Date.now(),
        name: "",
        setsData: [
          {
            id: Date.now().toString(),
            reps: 10,
            weight: 0,
            distance: 0,
            timeMins: 0,
            timeSecs: 0,
            completed: false,
          },
        ],
        rest: 0,
        linkedToNext: false,
        eachSide: false,
      },
    ]);
    setCurrentBlockIndex(0);
    setLastSeenSectionId(null);
    setShowSectionSlide(false);
    setViewMode("browse");
    localStorage.removeItem("fittrack_active_workout");
  };

  // Loading guard: if the library hasn't synced yet (only the tiny default set or empty),
  // show a brief loading state instead of a blank/empty page.
  const libraryReady = exerciseLibrary.length > 20;
  if (!libraryReady && viewMode === "browse") {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <div className="p-8 text-center text-muted-foreground">
          <div className="animate-pulse">Loading your programme…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full relative">
      {viewMode === "browse" && (
        <div className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-heading tracking-wider uppercase">
              Browse
            </h2>
          </div>

          {/* Compact strips at top: Resume + WOW */}
          <div className="space-y-3">
            {activeProgram &&
              allowedAccess &&
              allowedAccess.includes(bucketOf(activeProgram)) && (
                <button
                  onClick={resumeActiveProgram}
                  className="w-full flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-primary fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Resume
                    </p>
                    <p className="font-heading text-xl tracking-wider uppercase leading-none">
                      {activeProgram.stream || activeProgram.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Workout {activeProgram.currentIndex + 1} of{" "}
                      {activeProgram.workouts.length}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 bg-primary text-primary-foreground font-bold text-xs px-3 py-2 rounded-lg">
                    Resume
                  </span>
                </button>
              )}

            {currentWow &&
              activeTab === "All" &&
              !searchQuery &&
              (() => {
                const myScore = wowResults.find(
                  (r) =>
                    r.member_id ===
                    localStorage.getItem("fittrack_current_uid"),
                );
                const sorted = [...wowResults].sort((a, b) =>
                  currentWow.score_type === "time"
                    ? a.score - b.score
                    : b.score - a.score,
                );
                const myRank =
                  sorted.findIndex(
                    (r) =>
                      r.member_id ===
                      localStorage.getItem("fittrack_current_uid"),
                  ) + 1;
                const typeLabel =
                  currentWow.score_type === "time"
                    ? "For Time"
                    : currentWow.score_type === "reps"
                      ? "Total Reps"
                      : currentWow.score_type === "distance"
                        ? "For Distance"
                        : "For Calories";
                const scoreText = myScore
                  ? currentWow.score_type === "time"
                    ? `${Math.floor((myScore.score || 0) / 60)}:${((myScore.score || 0) % 60).toString().padStart(2, "0")}`
                    : `${myScore.score}`
                  : null;
                return (
                  <button
                    onClick={() => setViewMode("wow-detail")}
                    className="w-full flex items-center gap-3 bg-[#14170f] border border-[#23291b] rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Workout of the Week
                      </p>
                      <p className="font-heading text-xl tracking-wider uppercase leading-none text-white">
                        {currentWow.name
                          .replace(/^workout of the week\s*/i, "")
                          .trim() || currentWow.name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {typeLabel}
                        {myScore
                          ? ` · Rank ${myRank} · ${scoreText}`
                          : ` · ${wowResults.length} logged · tap to view`}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 border border-primary/50 text-primary font-bold text-xs px-3 py-2 rounded-lg">
                      {myScore ? "View" : "Log"}{" "}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })()}
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Workouts", "Programs"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                className={
                  activeTab === tab
                    ? "bg-primary text-primary-foreground font-bold rounded-full"
                    : "rounded-full font-medium"
                }
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
                .filter(
                  (t) =>
                    !t.workouts ||
                    !allowedAccess ||
                    allowedAccess.includes(bucketOf(t)),
                )
                .filter(
                  (t) =>
                    activeTab === "All" ||
                    (activeTab === "Programs" && t.workouts) ||
                    (activeTab === "Workouts" && !t.workouts),
                )
                .filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()),
                );

              // If searching or filtering Workouts, show flat list. Otherwise, group programs by category folders.
              if (searchQuery || activeTab === "Workouts") {
                return filtered.map((template) => (
                  <div
                    key={template.id}
                    className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                    onClick={() => openTemplateDetail(template)}
                  >
                    <div className="absolute inset-0 bg-muted">
                      <img
                        src={getCoverImage(template)}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                      <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1">
                        {template.workouts
                          ? `${template.weeks || 4} WEEK PROGRAMME`
                          : "SINGLE WORKOUT"}
                      </span>
                      <h3 className="text-white font-heading text-3xl uppercase leading-tight">
                        {template.name}
                      </h3>
                    </div>
                  </div>
                ));
              }

              // Folder view for programs
              const categories = [
                "Foundations",
                "Stronger",
                "Fusion",
                "Performance",
                "Group PT",
              ];
              const singleWorkouts = filtered.filter((t) => !t.workouts);

              return (
                <>
                  {categories.map((cat) => {
                    if (!allowedAccess?.includes(cat)) return null;
                    const catProgs = filtered.filter(
                      (t) => t.workouts && bucketOf(t) === cat,
                    );
                    if (catProgs.length === 0) return null;

                    catProgs.sort((a, b) => {
                      const dateA = a.start_date || a.created_at || "";
                      const dateB = b.start_date || b.created_at || "";
                      return dateB.localeCompare(dateA);
                    });

                    const d = new Date();
                    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    let currentProg = catProgs.find(
                      (p) => (p.start_date || p.created_at || "") <= todayStr,
                    );
                    if (!currentProg)
                      currentProg = catProgs[catProgs.length - 1]; // earliest upcoming if all in future

                    return (
                      <div
                        key={cat}
                        className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                        onClick={() => openTemplateDetail(currentProg)}
                      >
                        <div className="absolute inset-0 bg-muted">
                          <img
                            src={getCoverImage(currentProg, cat)}
                            alt={cat}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                          <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1 bg-primary/20 w-fit px-2 py-0.5 rounded-full backdrop-blur-sm">
                            This Week
                          </span>
                          <h3 className="text-white font-heading text-3xl uppercase leading-tight">
                            {currentProg.name}
                          </h3>
                        </div>
                      </div>
                    );
                  })}

                  {singleWorkouts.length > 0 && (
                    <div className="pt-4 space-y-4">
                      <h3 className="font-heading tracking-wider text-xl uppercase">
                        Single Workouts
                      </h3>
                      {singleWorkouts.map((template) => (
                        <div
                          key={template.id}
                          className="relative overflow-hidden rounded-2xl aspect-[16/9] cursor-pointer active:scale-[0.98] transition-transform shadow-md"
                          onClick={() => openTemplateDetail(template)}
                        >
                          <div className="absolute inset-0 bg-muted">
                            <img
                              src={getCoverImage(template)}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                            <span className="text-primary font-bold text-xs tracking-wider uppercase mb-1">
                              SINGLE WORKOUT
                            </span>
                            <h3 className="text-white font-heading text-3xl uppercase leading-tight">
                              {template.name}
                            </h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {viewMode === "detail" && selectedTemplate && (
        <div className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24 overflow-x-hidden">
          <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md -mx-4 -mt-6 rounded-t-none md:mx-0 md:mt-0 md:rounded-t-2xl">
            <img
              src={getCoverImage(selectedTemplate)}
              alt={selectedTemplate.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>

            <div className="absolute top-4 left-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("browse")}
                className="shrink-0 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10">
              <h2 className="text-3xl font-heading tracking-wider uppercase text-white leading-tight">
                {selectedTemplate.name}
              </h2>
            </div>
          </div>

          <div className="space-y-4 px-4 md:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {selectedTemplate.workouts ? "Programme" : "Workout"}
              </span>
              {selectedTemplate.weeks && (
                <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {selectedTemplate.weeks} Weeks
                </span>
              )}
              {selectedTemplate.daysPerWeek &&
                selectedTemplate.stream !== "Stronger" && (
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
            <p className="text-muted-foreground leading-relaxed">
              {selectedTemplate.description || "No description provided."}
            </p>
          </div>

          <div className="px-4 md:px-0 pt-2">
            {activeProgram &&
            activeProgram.programId === selectedTemplate.id &&
            (!allowedAccess ||
              allowedAccess.includes(bucketOf(selectedTemplate))) ? (
              <div className="space-y-3">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Workout {activeProgram.currentIndex + 1} of{" "}
                  {activeProgram.workouts.length}
                </div>
                <Button
                  onClick={resumeActiveProgram}
                  className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg"
                >
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
              <Button
                onClick={() => setTemplateForChooser(selectedTemplate)}
                className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg"
              >
                <Play className="h-5 w-5 fill-current" /> Switch to this plan
              </Button>
            ) : (
              <Button
                onClick={() => startTemplate(selectedTemplate)}
                className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg"
              >
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
                  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  let latestWeek = 1;
                  let latestDate = "";

                  Object.entries(weekNotes).forEach(
                    ([weekNum, notes]: [string, any]) => {
                      if (notes?.start_date && notes.start_date <= todayStr) {
                        if (!latestDate || notes.start_date > latestDate) {
                          latestDate = notes.start_date;
                          latestWeek = parseInt(weekNum, 10);
                        }
                      }
                    },
                  );

                  if (latestDate) {
                    currentWeek = latestWeek;
                  } else if (selectedTemplate.start_date) {
                    const start = new Date(
                      selectedTemplate.start_date,
                    ).getTime();
                    const now = new Date().getTime();
                    currentWeek = Math.max(
                      1,
                      Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1,
                    );
                  }
                  if (selectedTemplate.weeks)
                    currentWeek = Math.min(currentWeek, selectedTemplate.weeks);

                  const renderWorkoutCard = (
                    w: any,
                    globalIdx: number,
                    dayIdx: number,
                  ) => {
                    const isCompleted =
                      activeProgram &&
                      activeProgram.programId === selectedTemplate.id &&
                      globalIdx < activeProgram.currentIndex;
                    const isActive =
                      activeProgram &&
                      activeProgram.programId === selectedTemplate.id &&
                      globalIdx === activeProgram.currentIndex;
                    return (
                      <div
                        key={globalIdx}
                        onClick={() => {
                          setQuickOverviewWorkout({
                            workout: w,
                            index: globalIdx,
                            template: selectedTemplate,
                          });
                          setViewMode("session-overview");
                        }}
                        className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-colors ${isActive ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">
                                {dayIdx + 1}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                              {weekLabel(selectedTemplate, w.week)} · Day{" "}
                              {w.day}
                            </div>
                            <div className="font-bold leading-tight">
                              {w.name &&
                              !w.name.toLowerCase().startsWith("week ") &&
                              !w.name.toLowerCase().startsWith("day ")
                                ? w.name
                                : `Day ${w.day}`}
                            </div>
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
                    .filter(
                      (x: any) =>
                        x.w.week === currentWeek &&
                        (x.w.dayCounts
                          ? x.w.dayCounts.includes(preferredDays)
                          : !x.w.minDays || x.w.minDays <= preferredDays),
                    )
                    .sort((a: any, b: any) => a.w.day - b.w.day); // Ensure day order

                  const processedWorkouts = thisWeekWorkouts.map((x: any) => {
                    const isCompleted = history.some(
                      (h: any) =>
                        h.programId === selectedTemplate.id &&
                        h.week === x.w.week &&
                        h.day === x.w.day,
                    );
                    return { ...x, isCompleted };
                  });

                  const nextUpIndex = processedWorkouts.findIndex(
                    (x) => !x.isCompleted,
                  );
                  const isWeekComplete =
                    nextUpIndex === -1 && processedWorkouts.length > 0;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground">
                          Sessions
                        </h3>
                        <Select
                          value={preferredDays.toString()}
                          onValueChange={(v) => {
                            const days = parseInt(v, 10);
                            setPreferredDays(days);
                            savePreferredDays(days);
                          }}
                        >
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
                                <h4 className="font-heading text-xl tracking-wider text-foreground">
                                  Week Complete!
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  You've finished all your sessions for this
                                  week.
                                </p>
                              </div>
                            ) : (
                              <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                                  Next up — Session {nextUpIndex + 1} of{" "}
                                  {processedWorkouts.length}
                                </h4>
                                {renderWorkoutCard(
                                  processedWorkouts[nextUpIndex].w,
                                  processedWorkouts[nextUpIndex].i,
                                  nextUpIndex,
                                )}
                              </div>
                            )}

                            {processedWorkouts.length > 1 && (
                              <div className="space-y-2 pt-4 border-t border-border/50">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                  All Sessions
                                </h4>
                                {processedWorkouts.map(
                                  (x: any, idx: number) => {
                                    if (!isWeekComplete && idx === nextUpIndex)
                                      return null;
                                    return (
                                      <div key={idx} className="relative">
                                        {x.isCompleted && (
                                          <div className="absolute -left-2 -top-2 z-10 bg-background rounded-full p-0.5">
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                          </div>
                                        )}
                                        <div
                                          className={
                                            x.isCompleted ? "opacity-60" : ""
                                          }
                                        >
                                          {renderWorkoutCard(x.w, x.i, idx)}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No sessions scheduled for this week with{" "}
                            {preferredDays} days/week.
                          </p>
                        )}
                      </div>

                      <div className="pt-8 space-y-6">
                        <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground mb-4">
                          Full Library
                        </h3>
                        {Array.from({
                          length: selectedTemplate.weeks || 1,
                        }).map((_, weekIdx) => {
                          const weekWorkouts = selectedTemplate.workouts
                            .map((w: any, i: number) => ({ w, i }))
                            .filter(
                              (x: any) =>
                                x.w.week === weekIdx + 1 &&
                                (x.w.dayCounts
                                  ? x.w.dayCounts.includes(preferredDays)
                                  : !x.w.minDays ||
                                    x.w.minDays <= preferredDays),
                            );

                          if (weekWorkouts.length === 0) return null;

                          return (
                            <div key={weekIdx} className="space-y-3">
                              <h4 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">
                                {weekLabel(selectedTemplate, weekIdx + 1)}
                              </h4>
                              <div className="space-y-2">
                                {weekWorkouts.map((x: any, dayIdx: number) =>
                                  renderWorkoutCard(x.w, x.i, dayIdx),
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Past Weeks in Category */}
                      {(() => {
                        const cat = bucketOf(selectedTemplate);
                        const catProgs = workoutTemplates.filter(
                          (t) =>
                            t.workouts &&
                            bucketOf(t) === cat &&
                            t.id !== selectedTemplate.id,
                        );
                        if (catProgs.length === 0) return null;

                        catProgs.sort((a, b) => {
                          const dateA = a.start_date || a.created_at || "";
                          const dateB = b.start_date || b.created_at || "";
                          return dateB.localeCompare(dateA);
                        });

                        return (
                          <div className="pt-8 space-y-4">
                            <h3 className="font-heading text-2xl tracking-wider uppercase text-foreground mb-4">
                              Past Weeks ({cat})
                            </h3>
                            <div className="space-y-3">
                              {catProgs.map((prog) => (
                                <div
                                  key={prog.id}
                                  className="p-4 rounded-xl border border-border bg-card flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    setSelectedTemplate(prog);
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }}
                                >
                                  <div>
                                    <div className="font-bold text-lg">
                                      {prog.name}
                                    </div>
                                    {prog.start_date && (
                                      <div className="text-sm text-muted-foreground">
                                        W/C{" "}
                                        {new Date(
                                          prog.start_date,
                                        ).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    View
                                  </Button>
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
                <h3 className="font-heading text-xl tracking-wider uppercase text-muted-foreground">
                  Exercises
                </h3>
                <div className="space-y-2">
                  {selectedTemplate.exercises?.map((ex: any, idx: number) => {
                    const libEx = exerciseLibrary.find(
                      (e) => String(e.id) === String(ex.name),
                    );
                    const setsCount = ex.setsData?.length || ex.sets || 3;
                    const firstSet = ex.setsData?.[0] || ex || {};
                    const rawTrack =
                      ex.trackingType ?? libEx?.trackingType ?? "Weight & Reps";
                    const trackingArray = (
                      Array.isArray(rawTrack)
                        ? rawTrack
                        : String(rawTrack).split(/[;,]/)
                    )
                      .map((s) => s.trim())
                      .filter(Boolean);
                    const dist = firstSet.distance || ex.distance || 0;
                    const mins = firstSet.timeMins || ex.timeMins || 0;
                    const secs = firstSet.timeSecs || ex.timeSecs || 0;
                    const cals =
                      firstSet.calories ||
                      ex.calories ||
                      (trackingArray.includes("Calories")
                        ? firstSet.reps || ex.reps || 0
                        : 0);
                    const reps = firstSet.reps || ex.reps || 0;
                    let details = [];
                    // Trust entered values over trackingType.
                    if ((firstSet.weight || ex.weight || 0) > 0)
                      details.push(`${firstSet.weight || ex.weight}kg`);
                    if (dist) details.push(`${dist}m`);
                    if (mins || secs)
                      details.push(
                        `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                      );
                    if (cals) details.push(`${cals} cals`);
                    if (details.length === 0 && reps)
                      details.push(`${reps} reps`);
                    const detailStr = details.join(", ");
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-border bg-card flex justify-between items-center"
                      >
                        <div className="font-bold">
                          {libEx ? libEx.name : ex.name || "Unknown"}
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          {setsCount} sets {detailStr ? `× ${detailStr}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {viewMode === "wow-detail" && currentWow && (
        <div className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24 overflow-x-hidden">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("browse")}
              className="w-fit -ml-4 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex flex-col gap-1">
              <span className="text-primary font-bold text-xs tracking-wider uppercase">
                Workout of the Week
              </span>
              <h2 className="text-4xl font-heading tracking-wider uppercase text-foreground leading-none">
                {currentWow.name
                  .replace(/^workout of the week\s*/i, "")
                  .trim() || currentWow.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
                <Badge variant="outline" className="bg-background">
                  {currentWow.score_type === "time"
                    ? "For Time"
                    : currentWow.score_type === "reps"
                      ? "Total Reps"
                      : currentWow.score_type === "distance"
                        ? "For Distance/Metres"
                        : "For Calories"}
                </Badge>
                <span>·</span>
                <span>{wowResults.length} logged</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              const exercises = currentWow.exercises || [];
              const sections: { section: any; exercises: any[] }[] = [];
              let currentSection: any = null;
              let currentGroup: any[] = [];

              exercises.forEach((ex: any) => {
                if (ex.isSection) {
                  if (currentSection || currentGroup.length > 0) {
                    sections.push({
                      section: currentSection,
                      exercises: currentGroup,
                    });
                  }
                  currentSection = ex;
                  currentGroup = [];
                } else {
                  currentGroup.push(ex);
                }
              });
              if (currentSection || currentGroup.length > 0) {
                sections.push({
                  section: currentSection,
                  exercises: currentGroup,
                });
              }

              return sections.map((sec, idx) => (
                <Card
                  key={idx}
                  className="bg-card border-border overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="bg-muted/50 p-3 border-b border-border">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-sm tracking-wider uppercase">
                          {sec.section ? sec.section.name : `Block ${idx + 1}`}
                        </span>
                        {sec.exercises.length > 0 && (
                          <span className="text-xs text-muted-foreground font-medium shrink-0">
                            {sec.exercises.length}{" "}
                            {sec.exercises.length === 1
                              ? "exercise"
                              : "exercises"}
                          </span>
                        )}
                      </div>
                      {sec.section?.description && (
                        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                          {sec.section.description}
                        </p>
                      )}
                    </div>
                    {sec.exercises.length > 0 && (
                      <div className="p-3 space-y-3">
                        {sec.exercises.map((ex: any, exIdx: number) => {
                          const libEx = exerciseLibrary.find(
                            (e) => String(e.id) === String(ex.name),
                          );

                          const rawTrack =
                            ex.trackingType ??
                            libEx?.trackingType ??
                            "Weight & Reps";
                          const trackingArray = (
                            Array.isArray(rawTrack)
                              ? rawTrack
                              : String(rawTrack).split(/[;,]/)
                          )
                            .map((s) => s.trim())
                            .filter(Boolean);

                          const dist = ex.distance || 0;
                          const mins = ex.timeMins || 0;
                          const secs = ex.timeSecs || 0;
                          const cals =
                            ex.calories ||
                            (trackingArray.includes("Calories")
                              ? ex.reps || 0
                              : 0);
                          const reps = ex.reps || 0;

                          let metrics = [];
                          // Trust entered values over trackingType so a stray
                          // type never hides a real prescription.
                          if ((ex.weight || 0) > 0)
                            metrics.push(`${ex.weight}kg`);
                          if (dist) metrics.push(`${dist}m`);
                          if (mins || secs)
                            metrics.push(
                              `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                            );
                          if (cals) metrics.push(`${cals} cals`);
                          // Only show reps if there's no time/dist/cals and reps is real.
                          if (!metrics.length && reps)
                            metrics.push(`${reps} reps`);

                          let detailText = "";
                          if (metrics.length > 0) {
                            detailText =
                              ex.sets && ex.sets > 1
                                ? `${ex.sets} × ${metrics.join(", ")}`
                                : metrics.join(", ");
                          } else {
                            detailText = `${ex.sets || 1} sets`;
                          }

                          const isSupersetItem =
                            ex.linkedToNext ||
                            (exIdx > 0 &&
                              sec.exercises[exIdx - 1].linkedToNext);

                          return (
                            <div
                              key={exIdx}
                              className="flex gap-3 items-center group cursor-pointer"
                              onClick={() => {
                                if (libEx?.videoUrl) {
                                  setVideoTutorial(libEx.videoUrl);
                                  setVideoTitle(libEx.name);
                                }
                              }}
                            >
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
                                <p className="font-bold text-sm truncate">
                                  {libEx?.name || ex.name || "Unknown Exercise"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {detailText}
                                  </span>
                                  {isSupersetItem && (
                                    <Badge
                                      variant="outline"
                                      className="text-[8px] px-1 py-0 h-4 uppercase bg-primary/10 text-primary border-primary/20"
                                    >
                                      Superset
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ));
            })()}
          </div>

          {/* Leaderboard block */}
          <div className="space-y-3">
            {(() => {
              const uid = localStorage.getItem("fittrack_current_uid");
              const genderOf = (r: any) => (r.gender || "").toLowerCase();
              const filtered = wowResults.filter((r) =>
                wowLeaderboardFilter === "Overall"
                  ? true
                  : genderOf(r) === wowLeaderboardFilter.toLowerCase(),
              );
              const sorted = [...filtered].sort((a, b) =>
                currentWow.score_type === "time"
                  ? a.score - b.score
                  : b.score - a.score,
              );
              const fmt = (s: number) =>
                currentWow.score_type === "time"
                  ? `${Math.floor((s || 0) / 60)}:${((s || 0) % 60).toString().padStart(2, "0")}`
                  : `${s}`;
              const myIndex = sorted.findIndex((r) => r.member_id === uid);
              const top = sorted.slice(0, 5);
              const showMeSeparately = myIndex >= 5;
              return (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-xl tracking-wider uppercase">
                      Leaderboard
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {filtered.length} logged
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {(["Overall", "Male", "Female"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setWowLeaderboardFilter(f)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                          wowLeaderboardFilter === f
                            ? "bg-[#14170f] text-primary border-[#14170f]"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    {top.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No scores yet — be the first.
                      </p>
                    )}
                    {top.map((r, i) => (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between px-3 py-2.5 text-sm border-b border-border last:border-b-0 ${r.member_id === uid ? "bg-primary/10" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-heading text-lg text-primary w-5 shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">
                            {r.display_name}
                            {r.member_id === uid && " (You)"}
                          </span>
                          {r.scaled && (
                            <Badge
                              variant="outline"
                              className="text-[8px] px-1 h-4 shrink-0"
                            >
                              Scaled
                            </Badge>
                          )}
                        </div>
                        <span className="font-bold tabular-nums shrink-0">
                          {fmt(r.score)}
                        </span>
                      </div>
                    ))}
                    {showMeSeparately && (
                      <div className="flex items-center justify-between px-3 py-2.5 text-sm bg-primary/10 border-t border-border">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-heading text-lg text-primary w-5 shrink-0">
                            {myIndex + 1}
                          </span>
                          <span className="truncate">
                            {sorted[myIndex].display_name} (You)
                          </span>
                        </div>
                        <span className="font-bold tabular-nums shrink-0">
                          {fmt(sorted[myIndex].score)}
                        </span>
                      </div>
                    )}
                  </div>

                  {filtered.length > top.length && (
                    <button
                      onClick={() => setShowWowLeaderboard(true)}
                      className="w-full text-center text-xs font-bold text-primary py-2"
                    >
                      View all {filtered.length} ›
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Sticky bottom CTA */}
          {(() => {
            const mine = wowResults.find(
              (r) =>
                r.member_id === localStorage.getItem("fittrack_current_uid"),
            );
            return (
              <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-background/95 backdrop-blur border-t border-border">
                <Button
                  className="w-full h-12 font-bold tracking-wide rounded-xl"
                  onClick={() => setShowWowLogger(true)}
                >
                  {mine ? "Update Your Score" : "Log Your Score"}
                </Button>
              </div>
            );
          })()}
        </div>
      )}

      {viewMode === "session-overview" && quickOverviewWorkout && (
        <SessionOverviewView
          quickOverviewWorkout={quickOverviewWorkout}
          exerciseLibrary={exerciseLibrary}
          skippedSectionIds={skippedSectionIds}
          onStartWorkout={() =>
            startTargetSession(
              quickOverviewWorkout.template,
              quickOverviewWorkout.workout,
              quickOverviewWorkout.index,
            )
          }
          onStartHere={(sectionIndex) => {
            // Always load the session into state first (exactly like "Start
            // Workout"), so the live logger has real exercises — otherwise it
            // opens an empty "Block 1 of 1 / Select Exercise". Then jump to the
            // chosen block. We compute the block index directly from the raw
            // session exercises (sectionIndexToBlockIndex) rather than the
            // `blocks` useMemo, which is still stale (empty) right after
            // setExercises, so it would clamp to 0.
            const sessionExercises =
              quickOverviewWorkout.workout.exercises || [];
            const target = sectionIndexToBlockIndex(
              sessionExercises,
              sectionIndex,
            );
            startTargetSession(
              quickOverviewWorkout.template,
              quickOverviewWorkout.workout,
              quickOverviewWorkout.index,
            );
            setCurrentBlockIndex(target);
            setShowSectionSlide(true);
            setViewMode("active");
          }}
          onToggleSkip={(sectionId) => {
            setSkippedSectionIds((prev) => {
              const next = new Set(prev);
              if (next.has(sectionId)) next.delete(sectionId);
              else next.add(sectionId);
              return next;
            });
          }}
          onBack={() => setViewMode("detail")}
        />
      )}

      {viewMode === "active" && (
        <div className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24">
          <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md border-b border-border/50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading tracking-wider uppercase text-sm truncate">
                {workoutName || "Workout"}
              </p>
              {activeProgram && (
                <p className="text-[11px] text-muted-foreground truncate">
                  Workout {activeProgram.currentIndex + 1} of{" "}
                  {activeProgram.workouts.length}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground shrink-0"
              onClick={() => setViewMode("browse")}
            >
              Cancel
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {blocks.length > 0 &&
                  (() => {
                    const currentBlock = blocks[currentBlockIndex];
                    if (!currentBlock) return null;

                    if (showSectionSlide && currentBlock.section) {
                      const sectionIndex = exercises.findIndex(
                        (e) => e.id === currentBlock.section.id,
                      );
                      const sectionExercises = [];
                      if (sectionIndex !== -1) {
                        for (
                          let i = sectionIndex + 1;
                          i < exercises.length;
                          i++
                        ) {
                          const ex = exercises[i];
                          if (ex.isSection) break;
                          if (ex.name) {
                            const libEx = exerciseLibrary.find(
                              (le) => String(le.id) === String(ex.name),
                            );
                            const name = libEx ? libEx.name : ex.name;

                            const setsCount =
                              ex.setsData?.length || ex.sets || 3;
                            const firstSet = ex.setsData?.[0] || ex || {};
                            const rawTrack =
                              ex.trackingType ??
                              libEx?.trackingType ??
                              "Weight & Reps";
                            const trackingArray = (
                              Array.isArray(rawTrack)
                                ? rawTrack
                                : String(rawTrack).split(/[;,]/)
                            )
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const dist = firstSet.distance || ex.distance || 0;
                            const mins = firstSet.timeMins || ex.timeMins || 0;
                            const secs = firstSet.timeSecs || ex.timeSecs || 0;
                            const cals =
                              firstSet.calories ||
                              ex.calories ||
                              (trackingArray.includes("Calories")
                                ? firstSet.reps || ex.reps || 0
                                : 0);
                            const reps = firstSet.reps || ex.reps || 0;

                            let details = [];
                            // Trust entered values over trackingType.
                            if ((firstSet.weight || ex.weight || 0) > 0)
                              details.push(`${firstSet.weight || ex.weight}kg`);
                            if (dist) details.push(`${dist}m`);
                            if (mins || secs)
                              details.push(
                                `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                              );
                            if (cals) details.push(`${cals} cals`);
                            if (details.length === 0 && reps)
                              details.push(`${reps} reps`);
                            const detailStr = details.join(", ");

                            sectionExercises.push({
                              id: ex.id || i,
                              name,
                              sets: setsCount,
                              details: detailStr,
                            });
                          }
                        }
                      }

                      return (
                        <div className="flex flex-col min-h-[70vh] animate-in fade-in duration-300">
                          <div className="pt-6">
                            <span className="text-primary font-bold tracking-widest uppercase text-[11px]">
                              Up Next
                            </span>
                            <h2 className="font-heading uppercase tracking-wider text-foreground leading-[0.9] text-4xl mt-1">
                              {currentBlock.section.name}
                            </h2>
                            <div className="flex gap-2 flex-wrap mt-3">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                                {sectionExercises.length} exercises
                              </span>
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                                {currentBlock.type === "superset"
                                  ? "Superset"
                                  : "Regular"}
                              </span>
                              {currentBlock.section?.sectionType &&
                                currentBlock.section.sectionType !== "Normal" &&
                                currentBlock.section.sectionType !==
                                  "AI Engine" &&
                                currentBlock.section.sectionType !==
                                  "Circuit" && (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                                    {currentBlock.section.sectionType}
                                    {currentBlock.section.timeCapMins
                                      ? ` · ${currentBlock.section.timeCapMins} min`
                                      : ""}
                                  </span>
                                )}
                            </div>
                          </div>

                          {currentBlock.section.description && (
                            <p className="text-muted-foreground text-sm whitespace-pre-wrap mt-4 leading-relaxed">
                              {currentBlock.section.description}
                            </p>
                          )}

                          {sectionExercises.length > 0 && (
                            <div className="mt-5">
                              {sectionExercises.map((item, i) => (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-[26px_1fr_auto] items-center gap-3 py-3 border-t border-border last:border-b"
                                >
                                  <span className="font-heading text-lg text-muted-foreground">
                                    {i + 1}
                                  </span>
                                  <span className="font-bold text-sm leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                                    {item.sets}
                                    {item.details
                                      ? ` × ${item.details}`
                                      : " sets"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto pt-8 flex flex-col gap-3">
                            <Button
                              size="lg"
                              className="w-full font-bold tracking-wide text-lg h-14"
                              onClick={() => setShowSectionSlide(false)}
                            >
                              <Play className="h-5 w-5 mr-2 fill-current" />{" "}
                              Start Section
                            </Button>
                            {currentBlockIndex > 0 && (
                              <Button
                                variant="ghost"
                                className="text-muted-foreground h-11 font-bold"
                                onClick={() => {
                                  setShowSectionSlide(false);
                                  setCurrentBlockIndex((prev) =>
                                    Math.max(0, prev - 1),
                                  );
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
                              {currentBlock.section
                                ? currentBlock.section.name
                                : `Block ${visibleBlockPosition(blocks, pickOneChoices, currentBlockIndex)} of ${visibleBlockCount(blocks, pickOneChoices)}`}
                            </span>
                            <span className="text-sm font-bold">
                              {currentBlock.type === "superset"
                                ? "Superset"
                                : "Regular"}{" "}
                              · {currentBlock.exercises.length} Exercises
                            </span>
                            {currentBlock.section?.sectionType &&
                              currentBlock.section.sectionType !== "Normal" &&
                              currentBlock.section.sectionType !==
                                "AI Engine" &&
                              currentBlock.section.sectionType !==
                                "Circuit" && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full mt-1 w-fit">
                                  {currentBlock.section.sectionType}
                                  {currentBlock.section.timeCapMins
                                    ? ` · ${currentBlock.section.timeCapMins} min`
                                    : ""}
                                </span>
                              )}
                          </div>
                          {isTimerVisible && (
                            <div
                              className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full"
                              onClick={toggleTimer}
                            >
                              <Timer className="h-4 w-4" />
                              <span className="text-sm font-bold tabular-nums">
                                {formatTime(currentRemaining)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div
                          className={
                            currentBlock.type === "superset"
                              ? "border-l-2 border-primary pl-3 space-y-4"
                              : "space-y-4"
                          }
                        >
                          {(() => {
                            const options = pickOneOptionsForBlock(
                              blocks,
                              currentBlockIndex,
                            );
                            if (!options) return null;
                            const sectionId = currentBlock.section.id;
                            const chosen = pickOneChoices[sectionId];
                            const chosenBlockIdx =
                              chosen != null && chosen < options.length
                                ? options[chosen].blockIndex
                                : null;
                            return (
                              <div className="space-y-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                    Pick one
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Choose one option to finish
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {options.map((opt, oi) => {
                                    const isChosen =
                                      chosenBlockIdx === opt.blockIndex;
                                    const firstLib = exerciseLibrary.find(
                                      (e) =>
                                        String(e.id) ===
                                        String(opt.exercises[0]?.name),
                                    );
                                    const label = firstLib
                                      ? firstLib.name
                                      : opt.label;
                                    return (
                                      <button
                                        key={opt.blockIndex}
                                        onClick={() =>
                                          setPickOneChoices((prev) => ({
                                            ...prev,
                                            [sectionId]: oi,
                                          }))
                                        }
                                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                                          isChosen
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-card hover:border-primary/40"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                              isChosen
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-muted-foreground/40"
                                            }`}
                                          >
                                            {isChosen && (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </span>
                                          <span className="font-bold text-sm uppercase tracking-wide leading-tight">
                                            {label}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
                                          {opt.exercises
                                            .map((e: any) => {
                                              const le = exerciseLibrary.find(
                                                (x) =>
                                                  String(x.id) ===
                                                  String(e.name),
                                              );
                                              return le ? le.name : e.name;
                                            })
                                            .join(" + ")}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>
                                {chosenBlockIdx !== currentBlockIndex &&
                                  chosenBlockIdx != null && (
                                    <button
                                      onClick={() =>
                                        setCurrentBlockIndex(chosenBlockIdx)
                                      }
                                      className="text-xs text-primary font-bold underline-offset-2 underline"
                                    >
                                      Switch to chosen option →
                                    </button>
                                  )}
                                {chosenBlockIdx === currentBlockIndex &&
                                  options.length > 1 && (
                                    <button
                                      onClick={() =>
                                        setPickOneChoices((prev) => ({
                                          ...prev,
                                          [sectionId]: null,
                                        }))
                                      }
                                      className="text-xs text-muted-foreground font-bold underline-offset-2 underline hover:text-foreground"
                                    >
                                      ← Switch option
                                    </button>
                                  )}
                              </div>
                            );
                          })()}
                          {currentBlock.type === "superset" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Superset
                            </span>
                          )}
                          {(() => {
                            const st = currentBlock.section?.sectionType;
                            if (
                              st === "AMRAP" ||
                              st === "For Time" ||
                              st === "EMOM"
                            ) {
                              const sectionId =
                                currentBlock.section?.id || currentBlock.id;
                              const capMins = currentBlock.section?.timeCapMins
                                ? Number(currentBlock.section.timeCapMins)
                                : undefined;
                              return (
                                <ConditioningTimer
                                  type={st as any}
                                  capMins={capMins}
                                  initialResult={conditioningResults[sectionId]}
                                  onSaveResult={(result: any) =>
                                    setConditioningResults((prev) => ({
                                      ...prev,
                                      [sectionId]: result,
                                    }))
                                  }
                                />
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            const options = pickOneOptionsForBlock(
                              blocks,
                              currentBlockIndex,
                            );
                            // Not a pickOne section → render normally.
                            if (!options) return "render";
                            const sectionId = currentBlock.section.id;
                            const chosen = pickOneChoices[sectionId];
                            const chosenBlockIdx =
                              chosen != null && chosen < options.length
                                ? options[chosen].blockIndex
                                : null;
                            // No choice yet → prompt only (don't render sets).
                            if (chosenBlockIdx == null) return null;
                            // Only render the chosen option's block.
                            return chosenBlockIdx === currentBlockIndex
                              ? "render"
                              : null;
                          })() === "render" &&
                            currentBlock.exercises.map(
                              (exercise: any, exIdx: number) => {
                                const libraryExercise = exerciseLibrary.find(
                                  (e) => String(e.id) === String(exercise.name),
                                );
                                const cols = columnsFor(
                                  exercise,
                                  exerciseLibrary,
                                );

                                return (
                                  <div
                                    key={exercise.id}
                                    className="bg-card border border-border rounded-xl p-3 sm:p-4 flex flex-col gap-3"
                                  >
                                    <div className="space-y-2 w-full">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-heading text-2xl tracking-wide leading-none uppercase">
                                            {libraryExercise
                                              ? libraryExercise.name
                                              : exercise.name ||
                                                "Select Exercise"}
                                          </span>
                                          {exercise.blockType && (
                                            <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                              {exercise.blockType}
                                            </span>
                                          )}
                                          {exercise.eachSide && (
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                              Each Side
                                            </span>
                                          )}
                                        </div>
                                        {libraryExercise?.videoUrl && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <button
                                                aria-label="Watch video"
                                                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-primary/40 text-primary shrink-0"
                                              >
                                                <PlayCircle className="h-4 w-4" />
                                              </button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[600px] bg-card border-border">
                                              <DialogHeader>
                                                <DialogTitle className="font-heading tracking-wider">
                                                  {libraryExercise.name}{" "}
                                                  Tutorial
                                                </DialogTitle>
                                              </DialogHeader>
                                              <div className="aspect-video mt-4 rounded-md overflow-hidden bg-muted">
                                                <iframe
                                                  src={getEmbedUrl(
                                                    libraryExercise.videoUrl,
                                                  )}
                                                  className="w-full h-full"
                                                  allow="autoplay; fullscreen; picture-in-picture"
                                                  allowFullScreen
                                                ></iframe>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                                        {libraryExercise && (
                                          <Dialog
                                            onOpenChange={(open) => {
                                              if (!open) setAltSearch("");
                                            }}
                                          >
                                            <DialogTrigger asChild>
                                              <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-xs font-bold shrink-0">
                                                <RefreshCw className="h-3.5 w-3.5" />{" "}
                                                Swap
                                              </button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[400px] bg-card border-border max-h-[80vh] overflow-y-auto">
                                              <DialogHeader>
                                                <DialogTitle className="font-heading tracking-wider">
                                                  Alternative Exercises
                                                </DialogTitle>
                                              </DialogHeader>
                                              {(() => {
                                                const REASONS: [
                                                  string,
                                                  string,
                                                ][] = [
                                                  ["alt_regress", "Easier"],
                                                  ["alt_progress", "Harder"],
                                                  [
                                                    "alt_joint_friendly",
                                                    "Joint-friendly",
                                                  ],
                                                  [
                                                    "alt_equipment",
                                                    "Different kit",
                                                  ],
                                                  ["alt_home", "At home"],
                                                  [
                                                    "alt_same_pattern",
                                                    "Similar",
                                                  ],
                                                ];
                                                const byName: Record<
                                                  string,
                                                  any
                                                > = {};
                                                exerciseLibrary.forEach((e) => {
                                                  byName[
                                                    String(e.name)
                                                      .toLowerCase()
                                                      .trim()
                                                  ] = e;
                                                });
                                                const resolveAlts = (
                                                  cell: string,
                                                ) =>
                                                  String(cell || "")
                                                    .split(/[,/]| or /i)
                                                    .map((s) => s.trim())
                                                    .filter(Boolean)
                                                    .map(
                                                      (tok) =>
                                                        byName[
                                                          tok.toLowerCase()
                                                        ],
                                                    )
                                                    .filter(Boolean);
                                                const STRENGTH_BLOCKLIST = [
                                                  /back squat/i,
                                                  /front squat/i,
                                                  /deadlift/i,
                                                  /bench press/i,
                                                  /overhead press/i,
                                                  /push press/i,
                                                  /clean|snatch|jerk/i,
                                                  /nordic/i,
                                                  /ghd/i,
                                                  /pull ?up|chin ?up|muscle ?up/i,
                                                  /pistol/i,
                                                  /renegade/i,
                                                  /box jump/i,
                                                  /get ?up/i,
                                                  /sled/i,
                                                ];
                                                const beginnerSafe = (
                                                  ex: any,
                                                ) =>
                                                  String(
                                                    ex.difficulty || "",
                                                  ).toLowerCase() ===
                                                    "beginner" &&
                                                  !STRENGTH_BLOCKLIST.some(
                                                    (rx) => rx.test(ex.name),
                                                  );
                                                const isFoundations =
                                                  activeProgram?.stream ===
                                                  "Foundations";
                                                const row =
                                                  enrichment[
                                                    String(libraryExercise.id)
                                                  ];
                                                const seen = new Set<string>([
                                                  String(libraryExercise.id),
                                                ]);
                                                let suggestions = row
                                                  ? REASONS.flatMap(
                                                      ([col, label]) =>
                                                        resolveAlts(
                                                          row[col],
                                                        ).map((ex) => ({
                                                          ex,
                                                          label,
                                                        })),
                                                    ).filter(
                                                      (s) =>
                                                        !seen.has(
                                                          String(s.ex.id),
                                                        ) &&
                                                        seen.add(
                                                          String(s.ex.id),
                                                        ),
                                                    )
                                                  : [];
                                                if (isFoundations) {
                                                  suggestions =
                                                    suggestions.filter(
                                                      (s) =>
                                                        s.label !== "Harder" &&
                                                        beginnerSafe(s.ex),
                                                    );
                                                }
                                                // Fallback heuristic if no enrichment suggestions
                                                if (suggestions.length === 0) {
                                                  const norm = (v: any) =>
                                                    Array.isArray(v)
                                                      ? v
                                                          .map((s: any) =>
                                                            String(s).trim(),
                                                          )
                                                          .filter(Boolean)
                                                      : String(v || "")
                                                          .split(",")
                                                          .map((s: string) =>
                                                            s.trim(),
                                                          )
                                                          .filter(Boolean);
                                                  const origCat = norm(
                                                    libraryExercise.category,
                                                  );
                                                  const origMv = norm(
                                                    libraryExercise.movementType,
                                                  );
                                                  const origTt = norm(
                                                    libraryExercise.trackingType,
                                                  ).join();
                                                  const heur = exerciseLibrary
                                                    .filter((ex) => {
                                                      if (
                                                        String(ex.id) ===
                                                        String(
                                                          libraryExercise.id,
                                                        )
                                                      )
                                                        return false;
                                                      if (
                                                        isFoundations &&
                                                        !beginnerSafe(ex)
                                                      )
                                                        return false;
                                                      if (
                                                        origCat.length &&
                                                        !norm(ex.category).some(
                                                          (c: string) =>
                                                            origCat.includes(c),
                                                        )
                                                      )
                                                        return false;
                                                      return true;
                                                    })
                                                    .map((ex) => {
                                                      let s = 0;
                                                      if (
                                                        (ex.muscle || "") ===
                                                        (libraryExercise.muscle ||
                                                          "")
                                                      )
                                                        s += 3;
                                                      if (
                                                        norm(
                                                          ex.movementType,
                                                        ).some((m: string) =>
                                                          origMv.includes(m),
                                                        )
                                                      )
                                                        s += 3;
                                                      if (
                                                        norm(
                                                          ex.trackingType,
                                                        ).join() === origTt
                                                      )
                                                        s += 2;
                                                      if (
                                                        (ex.difficulty ||
                                                          "") ===
                                                        (libraryExercise.difficulty ||
                                                          "")
                                                      )
                                                        s += 1;
                                                      if (
                                                        (ex.equipment || "") ===
                                                        (libraryExercise.equipment ||
                                                          "")
                                                      )
                                                        s += 1;
                                                      return { ex, s };
                                                    })
                                                    .filter((x) => x.s > 0)
                                                    .sort((a, b) => b.s - a.s)
                                                    .slice(0, 8)
                                                    .map((x) => ({
                                                      ex: x.ex,
                                                      label: "Similar",
                                                    }));
                                                  suggestions = heur;
                                                }
                                                return (
                                                  <>
                                                    <div className="mt-4 space-y-2">
                                                      {suggestions.length ===
                                                        0 && (
                                                        <p className="text-sm text-muted-foreground text-center py-4">
                                                          No close alternatives
                                                          found.
                                                        </p>
                                                      )}
                                                      {suggestions.map(
                                                        ({
                                                          ex: alt,
                                                          label,
                                                        }) => (
                                                          <div
                                                            key={alt.id}
                                                            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                                                          >
                                                            <div className="flex flex-col gap-1">
                                                              <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm">
                                                                  {alt.name}
                                                                </span>
                                                                <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                  {label}
                                                                </span>
                                                              </div>
                                                              <span className="text-xs text-muted-foreground">
                                                                {alt.equipment ||
                                                                  "Any equipment"}
                                                                {alt.difficulty
                                                                  ? ` · ${alt.difficulty}`
                                                                  : ""}
                                                              </span>
                                                            </div>
                                                            <Button
                                                              size="sm"
                                                              variant="secondary"
                                                              onClick={() => {
                                                                updateExercise(
                                                                  exercise.id,
                                                                  "name",
                                                                  alt.id,
                                                                );
                                                                document.dispatchEvent(
                                                                  new KeyboardEvent(
                                                                    "keydown",
                                                                    {
                                                                      key: "Escape",
                                                                    },
                                                                  ),
                                                                );
                                                              }}
                                                            >
                                                              Select
                                                            </Button>
                                                          </div>
                                                        ),
                                                      )}
                                                    </div>
                                                    <div className="pt-4 mt-2 border-t border-border">
                                                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                                        Or search all exercises
                                                      </p>
                                                      <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                          value={altSearch}
                                                          onChange={(e) =>
                                                            setAltSearch(
                                                              e.target.value,
                                                            )
                                                          }
                                                          placeholder="Search exercises…"
                                                          className="pl-9"
                                                        />
                                                      </div>
                                                      <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1">
                                                        {exerciseLibrary
                                                          .filter(
                                                            (e) =>
                                                              String(e.id) !==
                                                              String(
                                                                libraryExercise.id,
                                                              ),
                                                          )
                                                          .filter(
                                                            (e) =>
                                                              !altSearch ||
                                                              e.name
                                                                .toLowerCase()
                                                                .includes(
                                                                  altSearch.toLowerCase(),
                                                                ),
                                                          )
                                                          .slice(0, 40)
                                                          .map((e) => (
                                                            <div
                                                              key={e.id}
                                                              className="flex items-center justify-between p-2 border border-border rounded-lg hover:bg-muted/50"
                                                            >
                                                              <div className="flex flex-col">
                                                                <span className="font-bold text-sm">
                                                                  {e.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                  {e.equipment ||
                                                                    "Any equipment"}
                                                                  {e.difficulty
                                                                    ? ` · ${e.difficulty}`
                                                                    : ""}
                                                                </span>
                                                              </div>
                                                              <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => {
                                                                  updateExercise(
                                                                    exercise.id,
                                                                    "name",
                                                                    e.id,
                                                                  );
                                                                  document.dispatchEvent(
                                                                    new KeyboardEvent(
                                                                      "keydown",
                                                                      {
                                                                        key: "Escape",
                                                                      },
                                                                    ),
                                                                  );
                                                                }}
                                                              >
                                                                Select
                                                              </Button>
                                                            </div>
                                                          ))}
                                                      </div>
                                                    </div>
                                                  </>
                                                );
                                              })()}
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                        {libraryExercise &&
                                          (() => {
                                            const TRACKING_TYPES = [
                                              "Weight & Reps",
                                              "Reps Only",
                                              "Time Only",
                                              "Distance & Time",
                                              "Weight & Distance",
                                              "Calories",
                                            ];
                                            const SHORT: Record<
                                              string,
                                              string
                                            > = {
                                              "Weight & Reps": "W×R",
                                              "Reps Only": "Reps",
                                              "Time Only": "Time",
                                              "Distance & Time": "Dist",
                                              "Weight & Distance": "W×D",
                                              Calories: "Cals",
                                            };
                                            const currentTracking = trackingOf(
                                              exercise,
                                              exerciseLibrary,
                                            ).join(", ");
                                            return (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-xs font-bold shrink-0">
                                                    <SlidersHorizontal className="h-3.5 w-3.5" />{" "}
                                                    {SHORT[currentTracking] ??
                                                      currentTracking}
                                                  </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                  {TRACKING_TYPES.map((tt) => (
                                                    <DropdownMenuItem
                                                      key={tt}
                                                      onClick={() =>
                                                        updateExercise(
                                                          exercise.id,
                                                          "trackingType",
                                                          [tt],
                                                        )
                                                      }
                                                    >
                                                      {tt}
                                                      {currentTracking ===
                                                        tt && (
                                                        <Check className="h-3 w-3 ml-auto" />
                                                      )}
                                                    </DropdownMenuItem>
                                                  ))}
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      updateExercise(
                                                        exercise.id,
                                                        "trackingType",
                                                        undefined,
                                                      )
                                                    }
                                                  >
                                                    Reset to default
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            );
                                          })()}
                                        {exercise.name && (
                                          <button
                                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-xs font-bold shrink-0"
                                            onClick={() =>
                                              setPastLiftsModal({
                                                name: exercise.name,
                                              })
                                            }
                                          >
                                            <History className="h-3.5 w-3.5" />{" "}
                                            Past Lifts
                                          </button>
                                        )}
                                      </div>

                                      {exercise.coachingNotes && (
                                        <div className="text-sm text-muted-foreground italic border-l-2 border-primary/50 pl-2 py-0.5">
                                          {exercise.coachingNotes}
                                        </div>
                                      )}
                                    </div>

                                    <div className="w-full">
                                      <div
                                        className="grid items-center gap-y-2 gap-x-1"
                                        style={{
                                          gridTemplateColumns: `24px repeat(${cols.length}, minmax(0,1fr)) 32px`,
                                        }}
                                      >
                                        <div className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                                          Set
                                        </div>
                                        {cols.map((c: any, i: number) => (
                                          <div
                                            key={i}
                                            className="text-center font-bold text-[10px] text-muted-foreground uppercase tracking-wider"
                                          >
                                            {c.label}
                                          </div>
                                        ))}
                                        <div className="flex justify-center">
                                          <Check className="h-3 w-3 text-muted-foreground" />
                                        </div>

                                        {exercise.setsData?.map(
                                          (set: any, setIndex: number) => (
                                            <React.Fragment key={set.id}>
                                              <span className="text-center font-bold text-sm text-muted-foreground">
                                                {setIndex + 1}
                                              </span>
                                              {cols.map((c: any, i: number) => (
                                                <div
                                                  key={i}
                                                  className="flex justify-center w-full"
                                                >
                                                  {c.isTime ? (
                                                    <TimeStepper
                                                      mins={set.timeMins}
                                                      secs={set.timeSecs}
                                                      onChangeMins={(
                                                        v: number,
                                                      ) => {
                                                        const newSets = [
                                                          ...exercise.setsData,
                                                        ];
                                                        newSets[setIndex] = {
                                                          ...set,
                                                          timeMins: v,
                                                        };
                                                        updateExercise(
                                                          exercise.id,
                                                          "setsData",
                                                          newSets,
                                                        );
                                                      }}
                                                      onChangeSecs={(
                                                        v: number,
                                                      ) => {
                                                        const newSets = [
                                                          ...exercise.setsData,
                                                        ];
                                                        newSets[setIndex] = {
                                                          ...set,
                                                          timeSecs: v,
                                                        };
                                                        updateExercise(
                                                          exercise.id,
                                                          "setsData",
                                                          newSets,
                                                        );
                                                      }}
                                                      completed={set.completed}
                                                    />
                                                  ) : (
                                                    <Stepper
                                                      value={set[c.field]}
                                                      step={c.step}
                                                      isDecimal={c.decimal}
                                                      onChange={(v: number) => {
                                                        const newSets = [
                                                          ...exercise.setsData,
                                                        ];
                                                        newSets[setIndex] = {
                                                          ...set,
                                                          [c.field]: v,
                                                        };
                                                        updateExercise(
                                                          exercise.id,
                                                          "setsData",
                                                          newSets,
                                                        );
                                                      }}
                                                      completed={set.completed}
                                                    />
                                                  )}
                                                </div>
                                              ))}
                                              <button
                                                onClick={() => {
                                                  const newSets = [
                                                    ...exercise.setsData,
                                                  ];
                                                  const isCompleting =
                                                    !set.completed;
                                                  newSets[setIndex] = {
                                                    ...set,
                                                    completed: isCompleting,
                                                  };
                                                  updateExercise(
                                                    exercise.id,
                                                    "setsData",
                                                    newSets,
                                                  );
                                                  if (isCompleting) {
                                                    if (navigator.vibrate)
                                                      navigator.vibrate(10);
                                                    // No rest between superset movements — only after the last exercise in the group
                                                    if (
                                                      !exercise.linkedToNext
                                                    ) {
                                                      const restTime =
                                                        exercise.rest || 0;
                                                      if (restTime > 0) {
                                                        startTimer(restTime);
                                                      }
                                                    }
                                                  }
                                                }}
                                                className={`justify-self-center relative h-8 w-8 rounded-full flex items-center justify-center transition-all after:absolute after:-inset-2 after:content-[''] ${set.completed ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30 text-transparent hover:border-primary/50"}`}
                                              >
                                                <Check className="h-4 w-4" />
                                              </button>
                                            </React.Fragment>
                                          ),
                                        )}
                                      </div>

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-4 text-primary font-bold tracking-wide bg-primary/5 hover:bg-primary/10"
                                        onClick={() => {
                                          const lastSet =
                                            exercise.setsData?.[
                                              exercise.setsData.length - 1
                                            ];
                                          const newSets = [
                                            ...(exercise.setsData || []),
                                            {
                                              id: Date.now().toString(),
                                              reps: lastSet ? lastSet.reps : 10,
                                              weight: lastSet
                                                ? lastSet.weight
                                                : 0,
                                              distance: lastSet
                                                ? lastSet.distance
                                                : 0,
                                              timeMins: lastSet
                                                ? lastSet.timeMins
                                                : 0,
                                              timeSecs: lastSet
                                                ? lastSet.timeSecs
                                                : 0,
                                              completed: false,
                                            },
                                          ];
                                          updateExercise(
                                            exercise.id,
                                            "setsData",
                                            newSets,
                                          );
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                        Set
                                      </Button>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                        </div>

                        <WorkoutNavFooter
                          blocks={blocks}
                          pickOneChoices={pickOneChoices}
                          skippedSectionIds={skippedSectionIds}
                          currentBlockIndex={currentBlockIndex}
                          isSaving={isSaving}
                          onNext={() => {
                            const nxt = getNextVisible(
                              blocks,
                              pickOneChoices,
                              skippedSectionIds,
                              currentBlockIndex,
                            );
                            if (nxt != null) setCurrentBlockIndex(nxt);
                            else setCurrentBlockIndex(blocks.length - 1);
                          }}
                          onFinish={handleSaveWorkout}
                          onPrev={() => {
                            const prv = getPrevVisible(
                              blocks,
                              pickOneChoices,
                              skippedSectionIds,
                              currentBlockIndex,
                            );
                            if (prv != null) setCurrentBlockIndex(prv);
                            else setCurrentBlockIndex(0);
                          }}
                          onSkip={() => {
                            // Mark the current section as skipped, then advance.
                            const cur = blocks[currentBlockIndex];
                            const sid = cur?.section?.id;
                            if (sid != null) {
                              setSkippedSectionIds((prev) => {
                                const next = new Set(prev);
                                next.add(sid);
                                return next;
                              });
                            }
                            const nxt = getNextVisible(
                              blocks,
                              pickOneChoices,
                              skippedSectionIds,
                              currentBlockIndex,
                            );
                            if (nxt != null) {
                              setCurrentBlockIndex(nxt);
                              setShowSectionSlide(true);
                            } else {
                              // Skipping the last visible block → finish.
                              handleSaveWorkout();
                            }
                          }}
                          onEnd={() => setShowEndConfirm(true)}
                        />
                      </div>
                    );
                  })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isTimerVisible && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+144px)] left-4 right-4 bg-primary text-primary-foreground shadow-lg rounded-xl p-3 flex items-center justify-between z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <Timer className="h-5 w-5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Rest Timer
              </span>
              <span className="text-xl font-heading tabular-nums tracking-wider leading-none">
                {formatTime(currentRemaining)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={add30s}
            >
              <span className="text-xs font-bold">+30s</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={toggleTimer}
            >
              {restEndsAt ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={closeTimer}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent className="sm:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-heading tracking-wider">
              End workout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You've logged{" "}
              {visibleBlockPosition(blocks, pickOneChoices, currentBlockIndex)}{" "}
              of {visibleBlockCount(blocks, pickOneChoices)} exercises.
              Finishing now will save your progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 h-12 font-bold tracking-wide">
              Keep going
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 h-12 font-bold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSaveWorkout}
            >
              Finish & save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!rewardModal}
        onOpenChange={(open) => !open && setRewardModal(null)}
      >
        <DialogContent className="w-[92vw] max-w-sm text-center bg-card border-border max-h-[85dvh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-2xl font-heading tracking-wider text-center">
              Workout Complete!
            </DialogTitle>
          </DialogHeader>
          {rewardModal && (
            <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in duration-500 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="text-8xl animate-bounce mt-4">
                {rewardModal.emoji}
              </div>
              <h3 className="text-2xl font-bold text-primary">
                You lifted{" "}
                {rewardModal.count && rewardModal.count > 1
                  ? `${rewardModal.count.toLocaleString()} `
                  : "a "}
                {rewardModal.displayName || rewardModal.name}!
              </h3>
              <p className="text-muted-foreground text-lg break-words">
                Your total volume this session was{" "}
                <strong className="text-foreground">
                  {rewardModal.volume.toLocaleString()} kg
                </strong>
                .
                <br />
                That's roughly the weight of{" "}
                {rewardModal.count && rewardModal.count > 1
                  ? `${rewardModal.count.toLocaleString()} ${(rewardModal.displayName || rewardModal.name).toLowerCase()}`
                  : `a ${rewardModal.name.toLowerCase()}`}
                !
              </p>
              <Button
                className="mt-4 w-full text-lg h-12 font-bold tracking-wide"
                onClick={() => setRewardModal(null)}
              >
                Awesome!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PbModal
        pbModal={pbModal}
        onClose={() => setPbModal(null)}
        onShare={(pbs) =>
          saveCommunityPost({
            id: "pb_" + Date.now(),
            user: { name: "You", avatar: "ME" },
            date: new Date().toISOString(),
            type: "pb",
            pbs: pbs.map((p) => ({
              exercise: p.exercise,
              weight: p.weight,
              reps: p.reps,
            })),
            likes: 0,
            comments: 0,
          })
        }
        exerciseLibrary={exerciseLibrary}
      />

      <Dialog
        open={!!templateForChooser}
        onOpenChange={(open) => !open && setTemplateForChooser(null)}
      >
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">
              How many days a week can you train?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[2, 3, 4, 5].map((days) => {
              const previewText = buildDayPreview(templateForChooser, days);
              return (
                <Button
                  key={days}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1"
                  onClick={() => activateProgram(templateForChooser, days)}
                >
                  <span className="font-bold text-lg">{days} days</span>
                  <span className="text-sm text-muted-foreground whitespace-normal text-left leading-snug">
                    {previewText}
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWowLogger} onOpenChange={setShowWowLogger}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">
              Log Your Score
            </DialogTitle>
          </DialogHeader>
          {currentWow && (
            <div className="space-y-4 py-4">
              {currentWow.score_type === "time" ? (
                <div className="flex gap-2">
                  <div className="space-y-2 flex-1">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      value={wowLogScore}
                      onChange={(e) => setWowLogScore(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Seconds</Label>
                    <Input
                      type="number"
                      value={wowLogScoreSecs}
                      onChange={(e) => setWowLogScoreSecs(e.target.value)}
                      placeholder="00"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>
                    Score (
                    {currentWow.score_type === "reps"
                      ? "Reps"
                      : currentWow.score_type === "distance"
                        ? "Metres"
                        : "Calories"}
                    )
                  </Label>
                  <Input
                    type="number"
                    value={wowLogScore}
                    onChange={(e) => setWowLogScore(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
              {currentWow.scaled_allowed && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="scaled"
                    checked={wowLogScaled}
                    onCheckedChange={(c) => setWowLogScaled(!!c)}
                  />
                  <Label htmlFor="scaled">I did the scaled version</Label>
                </div>
              )}
              <Button className="w-full mt-4" onClick={handleLogWow}>
                Save Score
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWowLeaderboard} onOpenChange={setShowWowLeaderboard}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">
              Leaderboard
            </DialogTitle>
          </DialogHeader>
          {currentWow && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex gap-2 mb-4 shrink-0">
                {["Overall", "Male", "Female"].map((f) => (
                  <Button
                    key={f}
                    variant={wowLeaderboardFilter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWowLeaderboardFilter(f as any)}
                    className="flex-1"
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                {(() => {
                  const filtered = wowResults.filter(
                    (r) =>
                      wowLeaderboardFilter === "Overall" ||
                      r.gender.toLowerCase() ===
                        wowLeaderboardFilter.toLowerCase(),
                  );
                  filtered.sort((a, b) =>
                    currentWow.score_type === "time"
                      ? a.score - b.score
                      : b.score - a.score,
                  );

                  if (filtered.length === 0)
                    return (
                      <p className="text-center text-muted-foreground py-8">
                        No scores yet.
                      </p>
                    );

                  return filtered.map((r, i) => {
                    const isMe =
                      r.member_id ===
                      localStorage.getItem("fittrack_current_uid");
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? "bg-primary/10 border-primary" : "bg-card border-border"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-muted-foreground w-6 text-center">
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-bold">
                              {r.display_name} {isMe && "(You)"}
                            </div>
                            {r.scaled && (
                              <div className="text-[10px] text-muted-foreground uppercase">
                                Scaled
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="font-heading text-xl text-primary">
                          {currentWow.score_type === "time"
                            ? `${Math.floor((r.score || 0) / 60)}:${((r.score || 0) % 60).toString().padStart(2, "0")}`
                            : r.score}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <Button
                className="w-full mt-4 shrink-0"
                variant="outline"
                onClick={() => {
                  const myScore = wowResults.find(
                    (r) =>
                      r.member_id ===
                      localStorage.getItem("fittrack_current_uid"),
                  );
                  if (!myScore) return;
                  saveCommunityPost({
                    id: "wow_" + Date.now(),
                    user: { name: "You", avatar: "ME" },
                    date: new Date().toISOString(),
                    type: "wow",
                    wowDetails: {
                      name: currentWow.name,
                      score:
                        currentWow.score_type === "time"
                          ? `${Math.floor((myScore.score || 0) / 60)}:${((myScore.score || 0) % 60).toString().padStart(2, "0")}`
                          : (myScore.score || 0).toString(),
                      scaled: myScore.scaled,
                    },
                    likes: 0,
                    comments: 0,
                  });
                  toast.success("Shared to feed!");
                  setShowWowLeaderboard(false);
                }}
              >
                Share to Feed
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWowShare} onOpenChange={setShowWowShare}>
        <DialogContent className="sm:max-w-md bg-card border-border text-center">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-2xl uppercase">
              Score Logged!
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center">
            <Trophy className="h-16 w-16 text-primary mb-4" />
            <p className="text-muted-foreground mb-6">
              Great job crushing the Workout of the Week!
            </p>
            <div className="flex gap-4 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowWowShare(false)}
              >
                Not now
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  saveCommunityPost({
                    id: "wow_" + Date.now(),
                    user: { name: "You", avatar: "ME" },
                    date: new Date().toISOString(),
                    type: "wow",
                    wowDetails: {
                      name: currentWow.name,
                      score:
                        currentWow.score_type === "time"
                          ? `${Math.floor((wowShareResult.score || 0) / 60)}:${((wowShareResult.score || 0) % 60).toString().padStart(2, "0")}`
                          : (wowShareResult.score || 0).toString(),
                      scaled: wowShareResult.scaled,
                    },
                    likes: 0,
                    comments: 0,
                  });
                  toast.success("Shared to feed!");
                  setShowWowShare(false);
                }}
              >
                Share to feed
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!videoTutorial}
        onOpenChange={(open) => !open && setVideoTutorial(null)}
      >
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
            <h3 className="font-heading text-xl uppercase tracking-wider">
              {videoTitle}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVideoTutorial(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pastLiftsModal}
        onOpenChange={(open) => {
          if (!open) {
            setPastLiftsModal(null);
            setOpenProg(null);
          }
        }}
      >
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading tracking-wider">
              {pastLiftsModal?.name}
            </DialogTitle>
            <DialogDescription>
              Your previous lifts and ways to progress.
            </DialogDescription>
          </DialogHeader>

          {pastLiftsModal &&
            (() => {
              const past = getExerciseHistory(pastLiftsModal.name, 3);
              const libEx = exerciseLibrary.find(
                (e) => String(e.id) === String(pastLiftsModal.name),
              );
              // Override-aware: ex.trackingType ?? libEx?.trackingType ?? "Weight & Reps"
              const effTrack = (
                Array.isArray(libEx?.trackingType)
                  ? libEx?.trackingType
                  : String(libEx?.trackingType || "Weight & Reps").split(/[;,]/)
              )
                .map((s: string) => s.trim())
                .filter(Boolean);
              return (
                <div className="space-y-4">
                  {/* History — last 3 sessions, each with per-set breakdown */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {past.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No history yet for this exercise.
                      </p>
                    )}
                    {past.map((sess, i) => (
                      <div
                        key={i}
                        className="border-b border-border py-2 last:border-0"
                      >
                        <p className="text-xs font-bold text-muted-foreground">
                          {new Date(sess.date).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          })}
                          {i === 0 && " · most recent"}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {sess.sets.map((s: any, j: number) => (
                            <div
                              key={j}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                Set {j + 1}
                              </span>
                              <span className="font-medium">
                                {fmtSet(s, effTrack) || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ways to progress — guidance only */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      Ways to progress
                    </p>
                    <div className="space-y-2">
                      {PROGRESSION_OPTIONS.map((opt) => (
                        <div
                          key={opt.key}
                          className="border border-border rounded-md overflow-hidden"
                        >
                          <button
                            className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium"
                            onClick={() =>
                              setOpenProg(openProg === opt.key ? null : opt.key)
                            }
                          >
                            <span className="flex items-center gap-2">
                              {opt.icon} {opt.label}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${openProg === opt.key ? "rotate-180" : ""}`}
                            />
                          </button>
                          {openProg === opt.key && (
                            <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">
                              {opt.cue}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 font-bold"
                    onClick={() => {
                      setPastLiftsModal(null);
                      setOpenProg(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Ad-lib logging FAB */}
      <button
        onClick={() => setAdLibOpen(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
        aria-label="Log activity or workout"
      >
        <Plus className="h-6 w-6" />
      </button>
      <AdLibLogSheet
        open={adLibOpen}
        onOpenChange={setAdLibOpen}
        onPBs={(pbs) => setPbModal(pbs)}
      />
    </div>
  );
};

export default Workouts;
