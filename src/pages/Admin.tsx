import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getExercises, saveExercises, getPrograms, savePrograms, saveVimeoToken, getMembers, getMemberActivity, sendNotification, getAnthropicKey, saveAnthropicKey } from "@/lib/store";
import { Plus, Trash2, Dumbbell, PlayCircle, GripVertical, Copy, Video, Loader2, Edit, Users, History, Calendar as CalendarIcon, Bell, Send, Download, Link2, Link2Off, Heading, Upload, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import JSZip from "jszip";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Admin = () => {
  const isStaff = localStorage.getItem("fittrack_is_staff") === "true";

  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  const [exercises, setExercises] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  // New Exercise State
  const [newExName, setNewExName] = useState("");
  const [newExCategory, setNewExCategory] = useState<string[]>(["Strength"]);
  const [newExMuscle, setNewExMuscle] = useState("");
  const [newExEq, setNewExEq] = useState("Barbell");
  const [newExDiff, setNewExDiff] = useState("Beginner");
  const [newExVid, setNewExVid] = useState("");
  const [newExMovement, setNewExMovement] = useState<string[]>(["Push"]);
  const [newExTracking, setNewExTracking] = useState<string[]>(["Weight & Reps"]);

  const MOVEMENT_TYPES = ["Warm Up", "Knee", "Hip", "Push", "Pull", "Conditioning", "Core", "Carries", "Fire Up", "Accessory"];
  const TRACKING_TYPES = ["Weight & Reps", "Time Only", "Distance & Time", "Calories"];

  // Search State for Program Builder
  const [exerciseSearch, setExerciseSearch] = useState("");

  // New Program State
  const [newProgName, setNewProgName] = useState("");
  const [newProgDesc, setNewProgDesc] = useState("");
  const [newProgStream, setNewProgStream] = useState("Stronger");
  const [newProgCover, setNewProgCover] = useState("");
  const [newProgWeeks, setNewProgWeeks] = useState(4);
  const [newProgDays, setNewProgDays] = useState(5);
  const [newProgType, setNewProgType] = useState<"program" | "session_folder" | "GroupPT">("program");
  const [progWorkouts, setProgWorkouts] = useState<any[]>([]);
  const [progWeekNotes, setProgWeekNotes] = useState<Record<number, string>>({});
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [progViewMode, setProgViewMode] = useState<"day" | "full">("day");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setNewProgCover(data.publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Integrations & Settings
  const [vimeoToken, setVimeoToken] = useState(() => localStorage.getItem("fittrack_vimeo_token") || "");
  const [anthropicKey, setAnthropicKey] = useState(() => getAnthropicKey());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Edit Exercise State
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");

  // Members State
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberActivity, setMemberActivity] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Notification State
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Export State
  const [isZipping, setIsZipping] = useState(false);

  // Calendar State
  const [scheduledEvents, setScheduledEvents] = useState<any[]>(() => {
    const saved = localStorage.getItem('fittrack_scheduled_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleProgramId, setScheduleProgramId] = useState('');
  const [scheduleWorkoutId, setScheduleWorkoutId] = useState('');

  const saveScheduledEvents = (events: any[]) => {
    setScheduledEvents(events);
    localStorage.setItem('fittrack_scheduled_events', JSON.stringify(events));
  };

  // TV Display State
  const [displayPresets, setDisplayPresets] = useState<any[]>(() => {
    const saved = localStorage.getItem('fittrack_display_presets');
    return saved ? JSON.parse(saved) : [{
      id: 'default',
      name: 'Default Preset',
      layout: { orientation: 'landscape', showRest: true, showHeaders: true, showDuration: true, showWeek: true, showNumbers: true },
      colors: { background: '#000000', blockBackground: '#1a1a1a', opacity: 100 },
      typography: { fontSize: 'medium' },
      media: { url: '', type: 'image' }
    }];
  });
  const [selectedPresetId, setSelectedPresetId] = useState('default');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [selectedDisplayProgramId, setSelectedDisplayProgramId] = useState<string>('');
  const [selectedDisplayWorkoutId, setSelectedDisplayWorkoutId] = useState<string>('');

  const savePresets = (presets: any[]) => {
    setDisplayPresets(presets);
    localStorage.setItem('fittrack_display_presets', JSON.stringify(presets));
  };

  useEffect(() => {
    const handleSync = () => {
      setExercises(getExercises());
      setPrograms(getPrograms());
    };
    
    handleSync();
    loadMembers();

    window.addEventListener('fittrack_synced', handleSync);
    return () => window.removeEventListener('fittrack_synced', handleSync);
  }, []);

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const handleViewActivity = async (member: any) => {
    setSelectedMember(member);
    setIsLoadingActivity(true);
    const activity = await getMemberActivity(member.id);
    setMemberActivity(activity);
    setIsLoadingActivity(false);
  };

  const handleSyncVimeo = async () => {
    if (!vimeoToken) return;
    setIsSyncing(true);
    try {
      let addedCount = 0;
      const currentExercises = [...exercises];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(`https://api.vimeo.com/me/videos?per_page=100&page=${page}`, {
          headers: {
            "Authorization": `Bearer ${vimeoToken}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.vimeo.*+json;version=3.4"
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch videos. Check your token.");
        }
        
        const data = await response.json();
        const vimeoVideos = data.data || [];
        
        if (vimeoVideos.length === 0) {
          hasMore = false;
          break;
        }
        
        vimeoVideos.forEach((video: any) => {
          const name = video.name;
          const link = video.link;
          const id = name.toLowerCase().replace(/\s+/g, '-');
          
          if (!currentExercises.find(e => e.id === id)) {
            currentExercises.push({
              id,
              name,
              category: ["Strength"],
              muscle: "Uncategorized",
              equipment: "Bodyweight",
              difficulty: "Beginner",
              videoUrl: link,
              movementType: ["Push"]
            });
            addedCount++;
          }
        });
        
        if (data.paging && data.paging.next) {
          page++;
        } else {
          hasMore = false;
        }
      }
      
      if (addedCount > 0) {
        setExercises(currentExercises);
        saveExercises(currentExercises);
        toast.success(`Successfully synced ${addedCount} new videos as exercises!`);
      } else {
        toast.info("No new videos found to sync.");
      }
    } catch (error: any) {
      toast.error(error.message || "Error syncing with Vimeo");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddExercise = () => {
    if (!newExName || !newExMuscle) {
      toast.error("Please fill out name and muscle group.");
      return;
    }
    const newEx = {
      id: newExName.toLowerCase().replace(/\s+/g, '-'),
      name: newExName,
      category: newExCategory,
      muscle: newExMuscle,
      equipment: newExEq,
      difficulty: newExDiff,
      videoUrl: newExVid,
      movementType: newExMovement,
      trackingType: newExTracking,
    };
    const updated = [...exercises, newEx];
    setExercises(updated);
    saveExercises(updated);
    toast.success("Exercise added!");
    setNewExName("");
    setNewExMuscle("");
    setNewExVid("");
    setNewExTracking(["Weight & Reps"]);
  };

  const handleDeleteExercise = (id: string) => {
    const updated = exercises.filter(e => e.id !== id);
    setExercises(updated);
    saveExercises(updated);
    toast.success("Exercise deleted!");
  };

  const handleUpdateExercise = () => {
    if (!editingExercise) return;
    const updated = exercises.map(e => e.id === editingExercise.id ? editingExercise : e);
    setExercises(updated);
    saveExercises(updated);
    setEditingExercise(null);
    toast.success("Exercise updated!");
  };

  const handleBulkDelete = () => {
    if (!librarySearch) return;
    const filtered = exercises.filter(ex => ex.name.toLowerCase().includes(librarySearch.toLowerCase()));
    if (filtered.length === 0) return;
    
    const idsToDelete = filtered.map(e => e.id);
    const updated = exercises.filter(e => !idsToDelete.includes(e.id));
    setExercises(updated);
    saveExercises(updated);
    toast.success(`Deleted ${filtered.length} exercises!`);
    setLibrarySearch("");
  };

  const handleExportData = () => {
    try {
      if (exercises.length === 0) {
        toast.error("No exercises to export.");
        return;
      }
      
      const headers = ["ID", "Name", "Categories", "Muscle", "Equipment", "Difficulty", "Movement Types", "Video URL", "Tracking Style"];
      const csvRows = [headers.join(",")];
      
      exercises.forEach(ex => {
        const row = [
          `"${ex.id || ""}"`,
          `"${ex.name || ""}"`,
          `"${Array.isArray(ex.category) ? ex.category.join("; ") : (ex.category || "")}"`,
          `"${ex.muscle || ""}"`,
          `"${ex.equipment || ""}"`,
          `"${ex.difficulty || ""}"`,
          `"${Array.isArray(ex.movementType) ? ex.movementType.join("; ") : (ex.movementType || "")}"`,
          `"${ex.videoUrl || ""}"`,
          `"${Array.isArray(ex.trackingType) ? ex.trackingType.join("; ") : (ex.trackingType || "Weight & Reps")}"`
        ];
        csvRows.push(row.join(","));
      });
      
      const csvString = csvRows.join("\n");
      
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(csvString).catch(() => {});

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fittrack_exercises_backup.csv";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Exercises backed up! (Also copied to clipboard just in case)");
    } catch (error) {
      toast.error("Failed to export backup.");
    }
  };

  const handleExportProgramsData = () => {
    try {
      if (programs.length === 0) {
        toast.error("No programs to export.");
        return;
      }
      
      const jsonString = JSON.stringify(programs, null, 2);
      
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(jsonString).catch(() => {});

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fittrack_programs_backup.json";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Programs backed up! (Also copied to clipboard just in case)");
    } catch (error) {
      toast.error("Failed to export programs backup.");
    }
  };

  const handleGenerateWorkoutSlots = () => {
    if (newProgType === "session_folder") {
      setProgWorkouts([{
        id: `w_${Date.now()}_0`,
        name: `Session 1`,
        exercises: []
      }]);
    } else {
      const weeks = newProgType === "GroupPT" ? 12 : newProgWeeks;
      const totalWorkouts = weeks * newProgDays;
      const newWorkouts = [];
      for (let i = 0; i < totalWorkouts; i++) {
        const week = Math.floor(i / newProgDays) + 1;
        const day = (i % newProgDays) + 1;
        newWorkouts.push({
          id: `w_${Date.now()}_${i}`,
          name: `Week ${week}, Day ${day}`,
          week,
          day,
          exercises: []
        });
      }
      setProgWorkouts(newWorkouts);
    }
    setSelectedWorkoutIndex(0);
    setSelectedWeek(1);
  };

  const handleAddSession = () => {
    const updatedWorkouts = [...progWorkouts];
    updatedWorkouts.push({
      id: `w_${Date.now()}_${updatedWorkouts.length}`,
      name: `Session ${updatedWorkouts.length + 1}`,
      exercises: []
    });
    setProgWorkouts(updatedWorkouts);
    setSelectedWorkoutIndex(updatedWorkouts.length - 1);
  };

  const handleAddProgExercise = () => {
    const updatedWorkouts = [...progWorkouts];
    updatedWorkouts[selectedWorkoutIndex].exercises.push({ id: Date.now(), blockType: "Strength", name: "", sets: 3, reps: 10, weight: 0, rest: 0, linkedToNext: false, eachSide: false, coachingNotes: "" });
    setProgWorkouts(updatedWorkouts);
  };

  const handleAddProgSection = (type: string = "Normal") => {
    const updatedWorkouts = [...progWorkouts];
    let name = type === "Normal" ? "New Section" : `${type} Block`;
    let description = "";
    if (type === "AI Engine") {
      name = "AI Engine Builder";
      description = "30-60 min scalable cardio focus";
    }
    updatedWorkouts[selectedWorkoutIndex].exercises.push({ 
      id: Date.now(), 
      isSection: true, 
      name, 
      description,
      sectionType: type
    });
    setProgWorkouts(updatedWorkouts);
  };

  const handleRemoveProgExercise = (id: number) => {
    const updatedWorkouts = [...progWorkouts];
    updatedWorkouts[selectedWorkoutIndex].exercises = updatedWorkouts[selectedWorkoutIndex].exercises.filter((e: any) => e.id !== id);
    setProgWorkouts(updatedWorkouts);
  };

  const updateProgExercise = (id: number, field: string, val: any) => {
    const updatedWorkouts = [...progWorkouts];
    updatedWorkouts[selectedWorkoutIndex].exercises = updatedWorkouts[selectedWorkoutIndex].exercises.map((e: any) => e.id === id ? { ...e, [field]: val } : e);
    setProgWorkouts(updatedWorkouts);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const updatedWorkouts = [...progWorkouts];
    const items = Array.from(updatedWorkouts[selectedWorkoutIndex].exercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updatedWorkouts[selectedWorkoutIndex].exercises = items;
    setProgWorkouts(updatedWorkouts);
  };

  const handleCopyFromPrevious = () => {
    if (selectedWorkoutIndex === 0) return;
    const updatedWorkouts = [...progWorkouts];
    const previousExercises = JSON.parse(JSON.stringify(updatedWorkouts[selectedWorkoutIndex - 1].exercises));
    // Update IDs to be unique
    const newExercises = previousExercises.map((e: any) => ({ ...e, id: Date.now() + Math.random() }));
    updatedWorkouts[selectedWorkoutIndex].exercises = newExercises;
    setProgWorkouts(updatedWorkouts);
    toast.success("Copied exercises from previous workout!");
  };

  const handleDuplicateDayTo = (targetWeek: number, targetDay: number) => {
    const updatedWorkouts = [...progWorkouts];
    const currentExercises = JSON.parse(JSON.stringify(updatedWorkouts[selectedWorkoutIndex].exercises));
    const newExercises = currentExercises.map((e: any) => ({ ...e, id: Date.now() + Math.random() }));
    
    const targetIdx = updatedWorkouts.findIndex(w => w.week === targetWeek && w.day === targetDay);
    if (targetIdx >= 0) {
      updatedWorkouts[targetIdx].exercises = newExercises;
      setProgWorkouts(updatedWorkouts);
      toast.success(`Copied to Week ${targetWeek}, Day ${targetDay}!`);
    }
  };

  const handleCopyWeekFromPrevious = () => {
    if (selectedWeek <= 1) return;
    const updatedWorkouts = [...progWorkouts];
    
    for (let d = 1; d <= newProgDays; d++) {
      const sourceIdx = updatedWorkouts.findIndex(w => w.week === selectedWeek - 1 && w.day === d);
      const targetIdx = updatedWorkouts.findIndex(w => w.week === selectedWeek && w.day === d);
      
      if (sourceIdx >= 0 && targetIdx >= 0) {
        const sourceExercises = JSON.parse(JSON.stringify(updatedWorkouts[sourceIdx].exercises));
        updatedWorkouts[targetIdx].exercises = sourceExercises.map((e: any) => ({ ...e, id: Date.now() + Math.random() }));
      }
    }
    
    setProgWorkouts(updatedWorkouts);
    toast.success(`Copied all days from Week ${selectedWeek - 1}!`);
  };

  const handleDuplicateWeekTo = (targetWeek: number) => {
    const maxWeeks = newProgType === "GroupPT" ? 12 : newProgWeeks;
    if (targetWeek === selectedWeek || targetWeek < 1 || targetWeek > maxWeeks) return;
    const updatedWorkouts = [...progWorkouts];
    
    for (let d = 1; d <= newProgDays; d++) {
      const sourceIdx = updatedWorkouts.findIndex(w => w.week === selectedWeek && w.day === d);
      const targetIdx = updatedWorkouts.findIndex(w => w.week === targetWeek && w.day === d);
      
      if (sourceIdx >= 0 && targetIdx >= 0) {
        const sourceExercises = JSON.parse(JSON.stringify(updatedWorkouts[sourceIdx].exercises));
        updatedWorkouts[targetIdx].exercises = sourceExercises.map((e: any) => ({ ...e, id: Date.now() + Math.random() }));
      }
    }
    
    setProgWorkouts(updatedWorkouts);
    toast.success(`Copied Week ${selectedWeek} to Week ${targetWeek}!`);
  };

  const handleShuffleExercise = (exerciseId: number) => {
    const updatedWorkouts = [...progWorkouts];
    const currentEx = updatedWorkouts[selectedWorkoutIndex].exercises.find((e: any) => e.id === exerciseId);
    if (!currentEx || !currentEx.name) return;
    
    const libEx = exercises.find(e => String(e.id) === String(currentEx.name));
    if (!libEx) return;
    
    const matchingExercises = exercises.filter(e => 
      e.id !== libEx.id && 
      (Array.isArray(e.category) ? e.category : [e.category]).some((c: string) => (Array.isArray(libEx.category) ? libEx.category : [libEx.category]).includes(c)) &&
      (Array.isArray(e.movementType) ? e.movementType : [e.movementType]).some((m: string) => (Array.isArray(libEx.movementType) ? libEx.movementType : [libEx.movementType]).includes(m))
    );
    
    if (matchingExercises.length > 0) {
      const randomEx = matchingExercises[Math.floor(Math.random() * matchingExercises.length)];
      currentEx.name = randomEx.id;
      setProgWorkouts(updatedWorkouts);
      toast.success(`Swapped for ${randomEx.name}`);
    } else {
      toast.error("No matching exercises found to swap with.");
    }
  };

  const handleApplyToWeek = (exerciseId: number) => {
    const currentEx = progWorkouts[selectedWorkoutIndex].exercises.find((e: any) => e.id === exerciseId);
    if (!currentEx) return;

    const updatedWorkouts = [...progWorkouts];
    let appliedCount = 0;
    
    for (let d = 1; d <= newProgDays; d++) {
      if (d === selectedDay) continue;
      const targetIdx = updatedWorkouts.findIndex(w => w.week === selectedWeek && w.day === d);
      if (targetIdx >= 0) {
        // Find matching exercise by position or name
        const exIndex = updatedWorkouts[selectedWorkoutIndex].exercises.findIndex((e: any) => e.id === exerciseId);
        if (updatedWorkouts[targetIdx].exercises[exIndex]) {
          const targetEx = updatedWorkouts[targetIdx].exercises[exIndex];
          if (!targetEx.isSection) {
            targetEx.sets = currentEx.sets;
            targetEx.reps = currentEx.reps;
            targetEx.distance = currentEx.distance;
            targetEx.timeMins = currentEx.timeMins;
            targetEx.timeSecs = currentEx.timeSecs;
            targetEx.rest = currentEx.rest;
            appliedCount++;
          }
        }
      }
    }
    
    setProgWorkouts(updatedWorkouts);
    toast.success(`Applied settings to ${appliedCount} other days this week!`);
  };

  const handleShuffleAll = () => {
    // ... keep existing code
    const updatedWorkouts = [...progWorkouts];
    let shuffledCount = 0;
    
    updatedWorkouts[selectedWorkoutIndex].exercises.forEach((currentEx: any) => {
      if (currentEx.isSection || !currentEx.name) return;
      
      const libEx = exercises.find(e => String(e.id) === String(currentEx.name));
      if (!libEx) return;
      
      const matchingExercises = exercises.filter(e => 
        e.id !== libEx.id && 
        (Array.isArray(e.category) ? e.category : [e.category]).some((c: string) => (Array.isArray(libEx.category) ? libEx.category : [libEx.category]).includes(c)) &&
        (Array.isArray(e.movementType) ? e.movementType : [e.movementType]).some((m: string) => (Array.isArray(libEx.movementType) ? libEx.movementType : [libEx.movementType]).includes(m))
      );
      
      if (matchingExercises.length > 0) {
        const randomEx = matchingExercises[Math.floor(Math.random() * matchingExercises.length)];
        currentEx.name = randomEx.id;
        shuffledCount++;
      }
    });
    
    setProgWorkouts(updatedWorkouts);
    if (shuffledCount > 0) {
      toast.success(`Shuffled ${shuffledCount} exercises!`);
    } else {
      toast.error("No exercises could be shuffled.");
    }
  };

  const handleGenerateEngineWorkout = async (sectionId: number) => {
    if (!anthropicKey) {
      toast.error("Please add your Anthropic API Key in the Settings tab first.");
      return;
    }

    const updatedWorkouts = [...progWorkouts];
    const currentWorkout = updatedWorkouts[selectedWorkoutIndex];
    const sectionIndex = currentWorkout.exercises.findIndex((e: any) => e.id === sectionId);

    if (sectionIndex === -1) return;

    setIsGeneratingAI(true);
    const toastId = toast.loading("AI is analyzing your library and building a 40-min engine workout...");

    try {
      const exList = exercises.map(ex => `- ${ex.name} (ID: ${ex.id}, Category: ${Array.isArray(ex.category) ? ex.category.join(',') : ex.category}, Movement: ${Array.isArray(ex.movementType) ? ex.movementType.join(',') : ex.movementType})`).join('\n');

      const prompt = `You are an expert fitness coach. Create a 40-minute scalable engine (cardio/conditioning) workout using ONLY the following available exercises:

${exList}

The workout must be a 40-minute EMOM (Every Minute on the Minute) or AMRAP style, utilizing 4 to 6 different exercises.

Return ONLY a valid JSON array of exercise objects to be inserted into the workout. Each object must follow this exact structure:
[
  {
    "blockType": "Cardio",
    "name": "exercise_id_from_list",
    "sets": 10,
    "reps": 15,
    "weight": 0,
    "distance": 0,
    "timeMins": 1,
    "timeSecs": 0,
    "rest": 0,
    "linkedToNext": false,
    "eachSide": false,
    "staffNotes": "Brief coaching note"
  }
]
Do not include any markdown formatting, backticks, or other text outside the JSON array.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to generate workout");
      }

      const data = await response.json();
      let text = data.content[0].text.trim();
      
      // Clean up markdown if AI included it
      if (text.startsWith('```json')) text = text.replace(/```json\n?/, '');
      if (text.startsWith('```')) text = text.replace(/```\n?/, '');
      if (text.endsWith('```')) text = text.replace(/```$/, '');
      
      const newExercises = JSON.parse(text).map((ex: any, i: number) => ({
        ...ex,
        id: Date.now() + i + Math.random(),
      }));

      // Update the section to represent the generated EMOM
      currentWorkout.exercises[sectionIndex].name = "AI Engine: 40 Min EMOM";
      currentWorkout.exercises[sectionIndex].sectionType = "EMOM";
      currentWorkout.exercises[sectionIndex].description = "AI Generated 40-Min Engine Block";

      // Insert them right after the section
      currentWorkout.exercises.splice(sectionIndex + 1, 0, ...newExercises);

      setProgWorkouts(updatedWorkouts);
      toast.success("40-Min Engine Workout generated successfully!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("AI Generation failed: " + error.message, { id: toastId });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);

  const handleAddProgram = () => {
    if (!newProgName) {
      toast.error("Please provide a program name.");
      return;
    }
    const newProg = {
      id: editingProgramId || "p_" + Date.now(),
      name: newProgName,
      description: newProgDesc,
      stream: newProgStream,
      coverImage: newProgCover,
      type: newProgType,
      weeks: newProgType === "GroupPT" ? 12 : newProgWeeks,
      daysPerWeek: newProgDays,
      weekNotes: progWeekNotes,
      workouts: progWorkouts.map(w => ({
        name: w.name,
        week: w.week,
        day: w.day,
        date: w.date,
        exercises: w.exercises.map((e: any) => ({ isSection: e.isSection, sectionType: e.sectionType || "Normal", description: e.description, blockType: e.blockType || "Strength", name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, distance: e.distance, timeMins: e.timeMins, timeSecs: e.timeSecs, rest: e.rest || 0, linkedToNext: e.linkedToNext, eachSide: e.eachSide, staffNotes: e.staffNotes, coachingNotes: e.coachingNotes }))
      }))
    };
    
    let updated;
    if (editingProgramId) {
      updated = programs.map(p => p.id === editingProgramId ? newProg : p);
      toast.success("Program updated!");
    } else {
      updated = [...programs, newProg];
      toast.success("Program added!");
    }
    
    setPrograms(updated);
    savePrograms(updated);
    
    setNewProgName("");
    setNewProgDesc("");
    setNewProgStream("Stronger");
    setNewProgDays(5);
    setNewProgCover("");
    setProgWorkouts([]);
    setProgWeekNotes({});
    setEditingProgramId(null);
  };

  const handleEditProgram = (prog: any) => {
    setEditingProgramId(prog.id);
    setNewProgName(prog.name);
    setNewProgDesc(prog.description || "");
    setNewProgStream(prog.stream || "Fusion");
    setNewProgCover(prog.coverImage || "");
    setNewProgType((prog.type as "program" | "session_folder" | "GroupPT") || "program");
    setNewProgWeeks(prog.weeks || 4);
    setNewProgDays(prog.daysPerWeek || 3);
    setProgWeekNotes(prog.weekNotes || {});
    
    const workouts = prog.workouts?.length ? prog.workouts.map((w: any, idx: number) => ({
      id: `w_${Date.now()}_${idx}`,
      name: w.name,
      week: w.week,
      day: w.day,
      date: w.date,
      exercises: w.exercises.map((e: any, eIdx: number) => ({
        id: Date.now() + eIdx + Math.random(),
        isSection: e.isSection,
        sectionType: e.sectionType || "Normal",
        description: e.description,
        blockType: e.blockType || "Strength",
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight || 0,
        distance: e.distance || 0,
        timeMins: e.timeMins || 0,
        timeSecs: e.timeSecs || 0,
        rest: e.rest || 0,
        linkedToNext: e.linkedToNext || false,
        eachSide: e.eachSide || false,
        staffNotes: e.staffNotes || "",
        coachingNotes: e.coachingNotes || ""
      }))
    })) : [];
    
    setProgWorkouts(workouts);
    setSelectedWorkoutIndex(0);
    setProgViewMode("day");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProgram = (id: string) => {
    const updated = programs.filter(p => p.id !== id);
    setPrograms(updated);
    savePrograms(updated);
    toast.success("Program deleted!");
  };

  const handleDuplicateProgram = (id: string) => {
    const programToDuplicate = programs.find(p => p.id === id);
    if (!programToDuplicate) return;
    
    const newProg = {
      ...programToDuplicate,
      id: "p_" + Date.now(),
      name: `${programToDuplicate.name} (Copy)`
    };
    
    const updated = [...programs, newProg];
    setPrograms(updated);
    savePrograms(updated);
    toast.success("Program duplicated!");
  };

  const handleSendBroadcast = async () => {
    if (!notifTitle || !notifMessage) {
      toast.error("Please fill in both title and message.");
      return;
    }
    setIsSendingNotif(true);
    try {
      await sendNotification(notifTitle, notifMessage);
      toast.success("Broadcast notification sent!");
      setNotifTitle("");
      setNotifMessage("");
    } catch (error) {
      toast.error("Failed to send notification.");
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleDownloadSource = async () => {
    setIsZipping(true);
    try {
      toast.info("Bundling files... this might take a few seconds.");
      const zip = new JSZip();

      // Glob files separately to avoid Vite array glob issues
      const srcFiles = import.meta.glob('/src/**/*', { query: '?raw' });
      const publicFiles = import.meta.glob('/public/**/*', { query: '?raw' });
      const rootFiles = import.meta.glob('/*.{html,json,js,ts,md,cjs,mjs}', { query: '?raw' });
      
      const allFiles: Record<string, any> = { ...srcFiles, ...publicFiles, ...rootFiles };
      let fileCount = 0;

      for (const path in allFiles) {
        try {
          const module = await (allFiles[path] as () => Promise<{ default: string }>)();
          const content = module.default;
          const cleanPath = path.startsWith('/') ? path.slice(1) : path;
          zip.file(cleanPath, content);
          fileCount++;
        } catch (e) {
          console.warn(`Could not read ${path}`, e);
        }
      }

      if (fileCount === 0) {
        throw new Error("No files found to bundle.");
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fittrack-source.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Source code downloaded! (${fileCount} files)`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download source code.");
    } finally {
      setIsZipping(false);
    }
  };

  const autoSaveProgram = async (workoutsToSave: any[]) => {
    const progId = editingProgramId || "p_" + Date.now();
    if (!editingProgramId) {
      setEditingProgramId(progId);
    }
    const newProg = {
      id: progId,
      name: newProgName || "Untitled AI Program",
      description: newProgDesc,
      stream: newProgStream,
      coverImage: newProgCover,
      type: newProgType,
      weeks: newProgType === "GroupPT" ? 12 : newProgWeeks,
      daysPerWeek: newProgDays,
      weekNotes: progWeekNotes,
      workouts: workoutsToSave.map(w => ({
        name: w.name,
        week: w.week,
        day: w.day,
        date: w.date,
        exercises: w.exercises.map((e: any) => ({ isSection: e.isSection, sectionType: e.sectionType || "Normal", description: e.description, blockType: e.blockType || "Strength", name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, distance: e.distance, timeMins: e.timeMins, timeSecs: e.timeSecs, rest: e.rest || 0, linkedToNext: e.linkedToNext, eachSide: e.eachSide, staffNotes: e.staffNotes, coachingNotes: e.coachingNotes }))
      }))
    };
    
    let updated;
    if (editingProgramId) {
      updated = programs.map(p => p.id === progId ? newProg : p);
    } else {
      updated = [...programs, newProg];
    }
    setPrograms(updated);
    savePrograms(updated);
  };

  const [genProgress, setGenProgress] = useState<string | null>(null);

  const mergeCells = (grid: any[], cells: any[]) => {
    const next = [...grid];
    for (const c of cells) {
      const i = next.findIndex((x) => x.week === c.week && x.day === c.day);
      if (i !== -1) next[i].exercises = c.exercises;
      else next.push({ ...c, id: `w_${Date.now()}_${Math.random()}`, name: `Week ${c.week}, Day ${c.day}` });
    }
    return next;
  };

  const streamCfg = () => ({ weeks: newProgWeeks, days: newProgDays, stream: newProgStream });
  const exPayload = () => exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    category: ex.category,
    movementType: ex.movementType,
    equipment: ex.equipment
  }));

  const handleGenerateQuick = async () => {
    setIsGeneratingAI(true);
    let grid = [...progWorkouts];
    let previousWeekWorkouts: any[] = [];
    try {
      for (let w = 1; w <= newProgWeeks; w++) {
        setGenProgress(`Quick draft — week ${w}/${newProgWeeks}…`);
        const { data, error } = await supabase.functions.invoke("generate-workout", {
          body: { action: "week", program: streamCfg(), currentWorkouts: [], week: w, exercises: exPayload(), previousWeekWorkouts },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        const cells = data.workouts || [];
        grid = mergeCells(grid, cells);
        previousWeekWorkouts = cells;
        setProgWorkouts([...grid]);
      }
      await autoSaveProgram(grid);
      toast.success("Quick draft generated!");
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setIsGeneratingAI(false);
      setGenProgress(null);
    }
  };

  const handleGenerateFullAI = async () => {
    setIsGeneratingAI(true);
    let grid = [...progWorkouts];
    const byWeek = (w: number) => grid.filter((c) => c.week === w);
    
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    
    const generateCellWithRetry = async (bodyPayload: any, tries = 3) => {
      let lastErr;
      for (let i = 0; i < tries; i++) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-workout", { body: bodyPayload });
          if (error) throw new Error(error.message);
          if (data?.error) throw new Error(data.error);
          return (data.workouts || [])[0];
        } catch (e) {
          lastErr = e;
          await sleep(2000 * (i + 1));
        }
      }
      throw lastErr;
    };

    try {
      let generatedCount = 0;
      for (let w = 1; w <= newProgWeeks; w++) {
        const previousWeekWorkouts = w > 1 ? byWeek(w - 1) : [];
        for (let d = 1; d <= newProgDays; d++) {
          const existingCell = grid.find((c) => c.week === w && c.day === d);
          if (existingCell && existingCell.exercises && existingCell.exercises.length > 0) {
            continue; // Resume: skip done cells
          }
          
          setGenProgress(`Full AI plan — week ${w}, day ${d}…`);
          const cell = await generateCellWithRetry({
            action: "single", program: streamCfg(), currentWorkouts: [],
            week: w, day: d, exercises: exPayload(), previousWeekWorkouts, weekSoFar: byWeek(w),
          });
          
          if (cell) {
            grid = mergeCells(grid, [cell]);
            setProgWorkouts([...grid]);
            await autoSaveProgram(grid); // Save progress after each cell
            generatedCount++;
          }
          await sleep(600); // Ease API rate limits
        }
      }
      if (generatedCount > 0) {
        toast.success("Full AI plan generated!");
      } else {
        toast.info("Program is already fully generated.");
      }
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setIsGeneratingAI(false);
      setGenProgress(null);
    }
  };

  const handleEdgeFunctionAI = async (workoutIndex: number | null, action: "generate" | "regenerate" | "edit") => {
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          action: "single",
          program: streamCfg(),
          targetWorkoutIndex: workoutIndex,
          currentWorkouts: progWorkouts,
          exercises: exPayload()
        }
      });

      if (error) throw new Error(error.message || "Failed to generate workout");
      if (!data || !data.workouts) throw new Error("No workouts returned from AI");

      setProgWorkouts(data.workouts);
      await autoSaveProgram(data.workouts);
      toast.success(`AI successfully completed: ${action}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`AI Generation failed: ${err.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const GROUP_PT_WEEKS = 12;
  const [genCycle, setGenCycle] = useState(0);

  async function callGroupGen(body: any) {
    const { data, error } = await supabase.functions.invoke("generate-group-pt", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data.workouts;
  }

  async function generateGroupBlock() {
    setIsGeneratingAI(true);
    let current = progWorkouts;
    const previousGroupPTProgram = programs.find((p: any) => p.type === "GroupPT" && p.id !== editingProgramId);
    const previousBlock = previousGroupPTProgram?.workouts || [];

    try {
      for (let cw = 1; cw <= 4; cw++) {
        setGenCycle(cw);
        current = await callGroupGen({
          action: "week",
          program: { weeks: GROUP_PT_WEEKS, days: newProgDays },
          currentWorkouts: current,
          exercises: exPayload(),
          cycleWeek: cw,
          previousBlockWorkouts: previousBlock,
        });
        setProgWorkouts([...current]);
      }
      await autoSaveProgram(current);
      toast.success("Group PT block generated successfully!");
    } catch (e: any) {
      toast.error(`Generation failed on template week ${genCycle}: ${e.message}`);
    } finally {
      setIsGeneratingAI(false);
      setGenCycle(0);
    }
  }

  async function regenerateGroupCell(index: number) {
    setIsGeneratingAI(true);
    const previousGroupPTProgram = programs.find((p: any) => p.type === "GroupPT" && p.id !== editingProgramId);
    const previousBlock = previousGroupPTProgram?.workouts || [];

    try {
      const updated = await callGroupGen({
        action: "single",
        program: { weeks: GROUP_PT_WEEKS, days: newProgDays },
        currentWorkouts: progWorkouts,
        exercises: exPayload(),
        targetWorkoutIndex: index,
        previousBlockWorkouts: previousBlock,
      });
      setProgWorkouts(updated);
      await autoSaveProgram(updated);
      toast.success("Group PT session regenerated successfully!");
    } catch (e: any) {
      toast.error("Regenerate failed: " + e.message);
    } finally {
      setIsGeneratingAI(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Staff Hub</h2>
      </div>

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="grid w-full grid-cols-8 max-w-[1200px]">
          <TabsTrigger value="exercises">Manage Exercises</TabsTrigger>
          <TabsTrigger value="programs">Manage Programs</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="display">TV Display</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exercises" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Add New Exercise</CardTitle>
              <CardDescription>Add a new exercise to the global library.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newExName} onChange={e => setNewExName(e.target.value)} placeholder="e.g. Incline Press" />
                </div>
                <div className="space-y-2">
                  <Label>Categories (Block Types)</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {["Strength", "Cardio", "Mobility", "Activation"].map(cat => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`new-cat-${cat}`} 
                          checked={newExCategory.includes(cat)}
                          onCheckedChange={(checked) => {
                            if (checked) setNewExCategory([...newExCategory, cat]);
                            else setNewExCategory(newExCategory.filter(c => c !== cat));
                          }}
                        />
                        <label htmlFor={`new-cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{cat}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Muscle Group</Label>
                  <Input value={newExMuscle} onChange={e => setNewExMuscle(e.target.value)} placeholder="e.g. Chest" />
                </div>
                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {MOVEMENT_TYPES.map(m => (
                      <div key={m} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`new-mov-${m}`} 
                          checked={newExMovement.includes(m)}
                          onCheckedChange={(checked) => {
                            if (checked) setNewExMovement([...newExMovement, m]);
                            else setNewExMovement(newExMovement.filter(v => v !== m));
                          }}
                        />
                        <label htmlFor={`new-mov-${m}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{m}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Equipment</Label>
                  <Select value={newExEq} onValueChange={setNewExEq}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Barbell">Barbell</SelectItem>
                      <SelectItem value="Dumbbell">Dumbbell</SelectItem>
                      <SelectItem value="Kettlebell">Kettlebell</SelectItem>
                      <SelectItem value="Machine">Machine</SelectItem>
                      <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                      <SelectItem value="Cable">Cable</SelectItem>
                      <SelectItem value="Bands">Bands</SelectItem>
                      <SelectItem value="Wall Balls">Wall Balls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={newExDiff} onValueChange={setNewExDiff}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tracking Style</Label>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {TRACKING_TYPES.map(t => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`new-track-${t}`} 
                          checked={newExTracking.includes(t)}
                          onCheckedChange={(checked) => {
                            if (checked) setNewExTracking([...newExTracking, t]);
                            else setNewExTracking(newExTracking.filter(v => v !== t));
                          }}
                        />
                        <label htmlFor={`new-track-${t}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Video URL (Vimeo embedded link)</Label>
                  <Input value={newExVid} onChange={e => setNewExVid(e.target.value)} placeholder="e.g. https://player.vimeo.com/video/147173661" />
                </div>
              </div>
              <Button onClick={handleAddExercise} className="gap-2">
                <Plus className="h-4 w-4" /> Add Exercise
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4 mt-6 mb-4 flex-wrap">
            <Input 
              placeholder="Search exercises to edit or delete..." 
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
              className="max-w-md"
            />
            {librarySearch && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete All Showing ({exercises.filter(ex => ex.name.toLowerCase().includes(librarySearch.toLowerCase())).length})
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" className="gap-2" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const text = event.target?.result as string;
                      const rows = text.split('\n').filter(row => row.trim());
                      if (rows.length <= 1) return;
                      
                      const newExercises = rows.slice(1).map(row => {
                        // Robust CSV parsing to handle Excel exports
                        const cols = [];
                        let curr = '';
                        let inQuotes = false;
                        for (let i = 0; i < row.length; i++) {
                          if (row[i] === '"') inQuotes = !inQuotes;
                          else if (row[i] === ',' && !inQuotes) {
                            cols.push(curr.trim().replace(/^"|"$/g, ''));
                            curr = '';
                          } else {
                            curr += row[i];
                          }
                        }
                        cols.push(curr.trim().replace(/^"|"$/g, ''));
                        
                        const name = cols[1] || "";
                        return {
                          id: cols[0] || name.toLowerCase().replace(/\s+/g, '-') || `ex_${Date.now()}_${Math.random()}`,
                          name: name,
                          category: cols[2] ? cols[2].split(';').map(s => s.trim()).filter(Boolean) : ["Strength"],
                          muscle: cols[3],
                          equipment: cols[4],
                          difficulty: cols[5],
                          movementType: cols[6] ? cols[6].split(';').map(s => s.trim()).filter(Boolean) : ["Push"],
                          videoUrl: cols[7] || "",
                          trackingType: cols[8] ? cols[8].split(';').map(s => s.trim()).filter(Boolean) : ["Weight & Reps"]
                        };
                      });
                      
                      let validExercises = newExercises.filter(ex => ex.name);
                      
                      // Deduplicate by ID to prevent Supabase UPSERT errors
                      const uniqueMap = new Map();
                      validExercises.forEach(ex => {
                        uniqueMap.set(ex.id, ex);
                      });
                      validExercises = Array.from(uniqueMap.values());

                      setExercises(validExercises);
                      toast.info("Saving and syncing to cloud...");
                      saveExercises(validExercises).then((res: any) => {
                        if (res && res.error) {
                          toast.error("Cloud sync failed: " + res.error.message, { duration: 10000 });
                        } else {
                          toast.success(`Imported ${validExercises.length} exercises!`);
                        }
                      });
                    } catch (err) {
                      toast.error("Failed to parse CSV.");
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}>
                <Download className="h-4 w-4 rotate-180" /> Import CSV
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportData}>
                <Download className="h-4 w-4" /> Backup to CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercises.filter(ex => ex.name.toLowerCase().includes(librarySearch.toLowerCase())).map((ex) => (
              <Card key={ex.id} className="bg-muted/50 border-border flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {ex.name}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingExercise(ex)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteExercise(ex.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{Array.isArray(ex.category) ? ex.category.join(", ") : ex.category} • {ex.muscle} • {ex.equipment}{ex.movementType ? ` • ${Array.isArray(ex.movementType) ? ex.movementType.join(", ") : ex.movementType}` : ""}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Dialog open={!!editingExercise} onOpenChange={(open) => !open && setEditingExercise(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Exercise</DialogTitle>
              </DialogHeader>
              {editingExercise && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editingExercise.name} onChange={e => setEditingExercise({...editingExercise, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categories (Block Types)</Label>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {["Strength", "Cardio", "Mobility", "Activation"].map(cat => {
                        const currentCats = Array.isArray(editingExercise.category) ? editingExercise.category : [editingExercise.category || "Strength"];
                        return (
                          <div key={cat} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-cat-${cat}`} 
                              checked={currentCats.includes(cat)}
                              onCheckedChange={(checked) => {
                                let newCats = [...currentCats];
                                if (checked && !newCats.includes(cat)) newCats.push(cat);
                                else if (!checked) newCats = newCats.filter(c => c !== cat);
                                setEditingExercise({...editingExercise, category: newCats});
                              }}
                            />
                            <label htmlFor={`edit-cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{cat}</label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Muscle Group</Label>
                    <Input value={editingExercise.muscle} onChange={e => setEditingExercise({...editingExercise, muscle: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Movement Type</Label>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {MOVEMENT_TYPES.map(m => {
                        const currentMovs = Array.isArray(editingExercise.movementType) ? editingExercise.movementType : (editingExercise.movementType ? [editingExercise.movementType] : ["Push"]);
                        return (
                          <div key={m} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-mov-${m}`} 
                              checked={currentMovs.includes(m)}
                              onCheckedChange={(checked) => {
                                let newMovs = [...currentMovs];
                                if (checked && !newMovs.includes(m)) newMovs.push(m);
                                else if (!checked) newMovs = newMovs.filter(v => v !== m);
                                setEditingExercise({...editingExercise, movementType: newMovs});
                              }}
                            />
                            <label htmlFor={`edit-mov-${m}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{m}</label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment</Label>
                    <Select value={editingExercise.equipment} onValueChange={v => setEditingExercise({...editingExercise, equipment: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barbell">Barbell</SelectItem>
                        <SelectItem value="Dumbbell">Dumbbell</SelectItem>
                        <SelectItem value="Kettlebell">Kettlebell</SelectItem>
                        <SelectItem value="Machine">Machine</SelectItem>
                        <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                        <SelectItem value="Cable">Cable</SelectItem>
                        <SelectItem value="Bands">Bands</SelectItem>
                        <SelectItem value="Wall Balls">Wall Balls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={editingExercise.difficulty} onValueChange={v => setEditingExercise({...editingExercise, difficulty: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tracking Style</Label>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {TRACKING_TYPES.map(t => {
                        const currentTracking = Array.isArray(editingExercise.trackingType) ? editingExercise.trackingType : (editingExercise.trackingType ? [editingExercise.trackingType] : ["Weight & Reps"]);
                        return (
                          <div key={t} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`edit-track-${t}`} 
                              checked={currentTracking.includes(t)}
                              onCheckedChange={(checked) => {
                                let newTracking = [...currentTracking];
                                if (checked && !newTracking.includes(t)) newTracking.push(t);
                                else if (!checked) newTracking = newTracking.filter(v => v !== t);
                                setEditingExercise({...editingExercise, trackingType: newTracking});
                              }}
                            />
                            <label htmlFor={`edit-track-${t}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t}</label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input value={editingExercise.videoUrl || ""} onChange={e => setEditingExercise({...editingExercise, videoUrl: e.target.value})} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingExercise(null)}>Cancel</Button>
                <Button onClick={handleUpdateExercise}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="programs" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Create Ready-Made Program</CardTitle>
              <CardDescription>Build a workout template for members to use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Program Name</Label>
                    <Input value={newProgName} onChange={e => setNewProgName(e.target.value)} placeholder="e.g. 12-Week Strength" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={newProgDesc} onChange={e => setNewProgDesc(e.target.value)} placeholder="Short description" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Cover Image (Optional)</Label>
                    <div className="flex gap-2">
                      <Input value={newProgCover} onChange={e => setNewProgCover(e.target.value)} placeholder="e.g. https://example.com/image.jpg" className="flex-1" />
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={isUploadingImage}
                          title="Upload image"
                        />
                        <Button type="button" variant="outline" disabled={isUploadingImage} className="gap-2 w-[110px]">
                          {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {isUploadingImage ? "Uploading" : "Upload"}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Program Structure</Label>
                    <Select value={newProgType} onValueChange={(v: "program" | "session_folder" | "GroupPT") => setNewProgType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="program">Structured Program (Weeks/Days)</SelectItem>
                        <SelectItem value="session_folder">Session Folder (Standalone Sessions)</SelectItem>
                        <SelectItem value="GroupPT">Group PT (12-Week Block)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newProgType === "program" || newProgType === "GroupPT") && (
                    <>
                      {newProgType === "program" && (
                        <div className="space-y-2">
                          <Label>Stream</Label>
                          <Select value={newProgStream} onValueChange={(val) => {
                            setNewProgStream(val);
                            if (val === "Stronger") setNewProgDays(5);
                            else if (val === "Fusion") setNewProgDays(4);
                            else if (val === "Performance") setNewProgDays(5);
                          }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Stronger">Stronger</SelectItem>
                              <SelectItem value="Fusion">Fusion</SelectItem>
                              <SelectItem value="Performance">Performance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Length (Weeks)</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="52" 
                          value={newProgType === "GroupPT" ? 12 : newProgWeeks} 
                          onChange={e => setNewProgWeeks(parseInt(e.target.value) || 1)} 
                          disabled={newProgType === "GroupPT"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Days per Week</Label>
                        <Input type="number" min="1" max="7" value={newProgDays} onChange={e => setNewProgDays(parseInt(e.target.value) || 1)} />
                      </div>
                    </>
                  )}
                </div>
                
                {progWorkouts.length === 0 ? (
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleGenerateWorkoutSlots} className="w-full">Generate Workout Grid</Button>
                    {newProgType === "GroupPT" ? (
                      <Button 
                        variant="outline" 
                        onClick={generateGroupBlock} 
                        className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                        disabled={isGeneratingAI}
                      >
                        {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {genCycle > 0 ? `Generating template week ${genCycle}/4…` : "Generate 12-week Group PT block"}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={handleGenerateQuick} 
                          className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                          disabled={isGeneratingAI || !newProgStream}
                        >
                          {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {genProgress || "Quick generate"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleGenerateFullAI} 
                          className="w-full gap-2 border-primary text-primary hover:bg-primary/10"
                          disabled={isGeneratingAI || !newProgStream}
                        >
                          {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {genProgress || "Full AI plan (slower)"}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-border">
                    {(newProgType === "program" || newProgType === "GroupPT") && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {newProgType === "program" && progWorkouts.some(w => !w.exercises || w.exercises.length === 0) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleGenerateFullAI} 
                              className="gap-2 border-primary text-primary hover:bg-primary/10"
                              disabled={isGeneratingAI || !newProgStream}
                            >
                              {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              {genProgress || "Resume AI generation"}
                            </Button>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setProgViewMode(m => m === "day" ? "full" : "day")} className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {progViewMode === "day" ? "Full Program View" : "Day View"}
                        </Button>
                      </div>
                    )}
                    
                    {progViewMode === "full" && (newProgType === "program" || newProgType === "GroupPT") ? (
                      <div className="space-y-8">
                        {Array.from({ length: newProgType === "GroupPT" ? 12 : newProgWeeks }).map((_, wIdx) => {
                          const weekNum = wIdx + 1;
                          return (
                            <div key={weekNum} className="space-y-4">
                              <h4 className="font-bold text-lg border-b pb-2">Week {weekNum}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {Array.from({ length: newProgDays }).map((_, dIdx) => {
                                  const dayNum = dIdx + 1;
                                  const workout = progWorkouts.find(w => w.week === weekNum && w.day === dayNum);
                                  return (
                                    <Card key={dayNum} className="bg-muted/30 border-border flex flex-col cursor-pointer hover:border-primary transition-colors h-full min-h-[120px]" onClick={() => {
                                      setSelectedWeek(weekNum);
                                      setSelectedDay(dayNum);
                                      setProgViewMode("day");
                                      const idx = progWorkouts.findIndex(w => w.week === weekNum && w.day === dayNum);
                                      if(idx >= 0) setSelectedWorkoutIndex(idx);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}>
                                      <CardHeader className="p-3 pb-2">
                                        <CardTitle className="text-sm">Day {dayNum}</CardTitle>
                                      </CardHeader>
                                      <CardContent className="p-3 pt-0 flex-1">
                                        {workout?.exercises?.length > 0 ? (
                                          <div className="space-y-1 text-xs">
                                            {workout.exercises.map((ex: any, i: number) => {
                                              const isSupersetItem = ex.linkedToNext || (i > 0 && workout.exercises[i - 1].linkedToNext);
                                              
                                              let detailText = "";
                                              if (ex.sets && ex.reps) detailText = `${ex.sets}x${ex.reps}`;
                                              else if (ex.timeMins || ex.timeSecs) detailText = `${ex.timeMins || 0}m ${ex.timeSecs || 0}s`;
                                              else if (ex.distance) detailText = `${ex.distance}m`;

                                              return (
                                                <div key={i} className={ex.isSection ? "font-bold mt-2 text-primary" : "text-muted-foreground flex justify-between gap-1 items-start"}>
                                                  {ex.isSection ? (
                                                    ex.name
                                                  ) : (
                                                    <>
                                                      <div className="flex items-start gap-1 min-w-0">
                                                        {isSupersetItem && <Link2 className="h-3 w-3 shrink-0 text-primary mt-0.5" />}
                                                        <span className="truncate">{exercises.find(e => String(e.id) === String(ex.name))?.name || ex.name || "Unknown Exercise"}</span>
                                                      </div>
                                                      {detailText && (
                                                        <span className="text-[10px] opacity-70 shrink-0 font-medium whitespace-nowrap">
                                                          {detailText}
                                                        </span>
                                                      )}
                                                    </>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground italic">Empty session</div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(newProgType === "program" || newProgType === "GroupPT") ? (
                          <div className="space-y-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
                          {Array.from({ length: newProgType === "GroupPT" ? 12 : newProgWeeks }).map((_, i) => (
                            <Button 
                              key={`week-${i+1}`} 
                              variant={selectedWeek === i + 1 ? "default" : "outline"}
                              onClick={() => {
                                setSelectedWeek(i + 1);
                                setSelectedDay(1);
                                const idx = progWorkouts.findIndex(w => w.week === i + 1 && w.day === 1);
                                if(idx >= 0) setSelectedWorkoutIndex(idx);
                              }}
                              className="whitespace-nowrap"
                            >
                              Week {i + 1}
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {Array.from({ length: newProgDays }).map((_, i) => (
                            <Button 
                              key={`day-${i+1}`} 
                              variant={selectedDay === i + 1 ? "default" : "secondary"}
                              onClick={() => {
                                setSelectedDay(i + 1);
                                const idx = progWorkouts.findIndex(w => w.week === selectedWeek && w.day === i + 1);
                                if(idx >= 0) setSelectedWorkoutIndex(idx);
                              }}
                              className="whitespace-nowrap"
                            >
                              Day {i + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {progWorkouts.map((w, idx) => (
                          <Button 
                            key={w.id} 
                            variant={selectedWorkoutIndex === idx ? "default" : "outline"}
                            onClick={() => setSelectedWorkoutIndex(idx)}
                            className="whitespace-nowrap"
                          >
                            {w.name}
                          </Button>
                        ))}
                        <Button variant="outline" onClick={handleAddSession} className="whitespace-nowrap gap-2">
                          <Plus className="h-4 w-4" /> Add Session
                        </Button>
                      </div>
                    )}

                    <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-4">
                      {(newProgType === "program" || newProgType === "GroupPT") && (
                        <div className="space-y-4 mb-6 pb-4 border-b border-border">
                          <div className="flex items-center justify-between">
                            <h3 className="font-heading tracking-wider text-xl">Week {selectedWeek} Settings</h3>
                            <div className="flex gap-2">
                              {selectedWeek > 1 && (
                                <Button variant="outline" size="sm" onClick={handleCopyWeekFromPrevious} className="gap-2">
                                  <Copy className="h-4 w-4" /> Copy Previous Week
                                </Button>
                              )}
                              <Select onValueChange={(v) => handleDuplicateWeekTo(parseInt(v))}>
                                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Duplicate To..." /></SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: newProgType === "GroupPT" ? 12 : newProgWeeks }).map((_, i) => (
                                    i + 1 !== selectedWeek && <SelectItem key={`dup-w-${i+1}`} value={(i + 1).toString()}>Week {i + 1}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Week Notes (Staff Only)</Label>
                            <Input 
                              placeholder="e.g. Focus on eccentric control this week..." 
                              value={progWeekNotes[selectedWeek] || ""}
                              onChange={e => setProgWeekNotes({...progWeekNotes, [selectedWeek]: e.target.value})}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <h3 className="font-heading tracking-wider text-xl">{progWorkouts[selectedWorkoutIndex]?.name}</h3>
                          <div className="flex items-center gap-2">
                            <Label className="whitespace-nowrap text-xs text-muted-foreground uppercase">Scheduled Date</Label>
                            <Input 
                              type="date" 
                              value={progWorkouts[selectedWorkoutIndex]?.date || ""} 
                              onChange={(e) => {
                                const updatedWorkouts = [...progWorkouts];
                                updatedWorkouts[selectedWorkoutIndex].date = e.target.value;
                                setProgWorkouts(updatedWorkouts);
                              }}
                              className="w-[140px] h-8 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {selectedWorkoutIndex > 0 && (
                            <Button variant="outline" size="sm" onClick={handleCopyFromPrevious} className="gap-2">
                              <Copy className="h-4 w-4" /> Copy Previous Day
                            </Button>
                          )}
                          {(newProgType === "program" || newProgType === "GroupPT") && (
                            <Select onValueChange={(v) => handleDuplicateDayTo(selectedWeek, parseInt(v))}>
                              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Duplicate To Day..." /></SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: newProgDays }).map((_, i) => (
                                  i + 1 !== selectedDay && <SelectItem key={`dup-d-${i+1}`} value={(i + 1).toString()}>Day {i + 1}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button variant="outline" size="sm" onClick={handleShuffleAll}>
                            Shuffle All
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="gap-2 bg-primary text-primary-foreground"
                            onClick={() => newProgType === "GroupPT" ? regenerateGroupCell(selectedWorkoutIndex) : handleEdgeFunctionAI(selectedWorkoutIndex, "regenerate")}
                            disabled={isGeneratingAI}
                          >
                            {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Regenerate
                          </Button>
                          {newProgType !== "GroupPT" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                              onClick={() => handleEdgeFunctionAI(selectedWorkoutIndex, "edit")}
                              disabled={isGeneratingAI}
                            >
                              {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                              Edit with AI
                            </Button>
                          )}
                        </div>
                      </div>

                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="exercises-list">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                              {(progWorkouts[selectedWorkoutIndex]?.exercises || []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/20">
                                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                  <p className="text-muted-foreground mb-4">No exercises added yet.</p>
                                  <Button 
                                    onClick={() => newProgType === "GroupPT" ? regenerateGroupCell(selectedWorkoutIndex) : handleEdgeFunctionAI(selectedWorkoutIndex, "generate")} 
                                    className="gap-2 bg-primary text-primary-foreground"
                                    disabled={isGeneratingAI}
                                  >
                                    {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    Generate Workout with AI
                                  </Button>
                                </div>
                              ) : (
                                (progWorkouts[selectedWorkoutIndex]?.exercises || []).map((pe: any, index: number) => (
                                <Draggable key={pe.id.toString()} draggableId={pe.id.toString()} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`flex gap-4 items-center bg-background p-4 rounded-md border relative ${pe.linkedToNext ? 'border-b-0 rounded-b-none border-primary/50' : 'border-border'} ${index > 0 && progWorkouts[selectedWorkoutIndex].exercises[index - 1].linkedToNext ? 'border-t-0 rounded-t-none border-primary/50 bg-primary/5' : ''}`}
                                    >
                                      {(index > 0 && progWorkouts[selectedWorkoutIndex].exercises[index - 1].linkedToNext) && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-20 shadow-sm border border-primary-foreground/20">
                                          <Link2 className="h-3 w-3" /> Superset
                                        </div>
                                      )}
                                      <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                                        <GripVertical className="h-5 w-5" />
                                      </div>
                                      
                                      {pe.isSection ? (
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Section Title</Label>
                                            <Input value={pe.name} onChange={(e) => updateProgExercise(pe.id, "name", e.target.value)} placeholder="e.g. Warm Up" className="font-bold bg-muted/50" />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Section Type</Label>
                                            <Select value={pe.sectionType || "Normal"} onValueChange={(v) => updateProgExercise(pe.id, "sectionType", v)}>
                                              <SelectTrigger><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Normal">Normal Block</SelectItem>
                                                <SelectItem value="AMRAP">AMRAP Block</SelectItem>
                                                <SelectItem value="EMOM">EMOM Block</SelectItem>
                                                <SelectItem value="Circuit">Circuit Block</SelectItem>
                                                <SelectItem value="AI Engine">AI Engine Builder</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-2 md:col-span-2">
                                            <Label>Description / Time (Optional)</Label>
                                            <Textarea value={pe.description || ""} onChange={(e) => updateProgExercise(pe.id, "description", e.target.value)} placeholder={pe.sectionType === 'AMRAP' ? "e.g. 15 Minutes" : "e.g. Complete 3 rounds..."} className="min-h-[80px]" />
                                          </div>
                                          {pe.sectionType === "AI Engine" && (
                                            <div className="md:col-span-2 pt-2">
                                              <Button 
                                                variant="default" 
                                                className="w-full gap-2 bg-primary text-primary-foreground font-bold tracking-wide"
                                                onClick={() => handleGenerateEngineWorkout(pe.id)}
                                                disabled={isGeneratingAI}
                                              >
                                                {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 
                                                {isGeneratingAI ? "Generating..." : "Generate 40-Min Engine Workout"}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex-1 flex flex-col gap-3">
                                          <div className="flex flex-col md:flex-row gap-2 md:items-center">
                                            <div className="w-full md:w-40 shrink-0">
                                              <Select value={pe.blockType || "Strength"} onValueChange={(v) => {
                                                const updatedWorkouts = [...progWorkouts];
                                                const ex = updatedWorkouts[selectedWorkoutIndex].exercises.find((e: any) => e.id === pe.id);
                                                if(ex) { ex.blockType = v; ex.name = ""; }
                                                setProgWorkouts(updatedWorkouts);
                                              }}>
                                                <SelectTrigger className="h-10 bg-muted/20"><SelectValue placeholder="Block Type" /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Strength">Strength</SelectItem>
                                                  <SelectItem value="Cardio">Cardio</SelectItem>
                                                  <SelectItem value="Mobility">Mobility</SelectItem>
                                                  <SelectItem value="Activation">Activation</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="flex-1 flex gap-2">
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn("h-10 font-medium justify-between flex-1 overflow-hidden", !pe.name && "text-muted-foreground")}
                                                  >
                                                    <span className="truncate">
                                                      {pe.name
                                                        ? exercises.find((e) => String(e.id) === String(pe.name))?.name || "Select Exercise..."
                                                        : "Select Exercise..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0" align="start">
                                                  <Command>
                                                    <CommandInput placeholder="Search exercises..." />
                                                    <CommandList>
                                                      <CommandEmpty>No exercise found.</CommandEmpty>
                                                      <CommandGroup>
                                                        {exercises
                                                            .filter(ex => {
                                                              if (!pe.blockType) return true;
                                                              const cats = Array.isArray(ex.category) ? ex.category : [ex.category || "Strength"];
                                                              const movs = Array.isArray(ex.movementType) ? ex.movementType : [ex.movementType || ""];
                                                              return cats.includes(pe.blockType) || movs.includes(pe.blockType);
                                                            })
                                                          .sort((a, b) => a.name.localeCompare(b.name))
                                                          .map(ex => (
                                                            <CommandItem
                                                              key={ex.id}
                                                              value={ex.name}
                                                              onSelect={() => {
                                                                updateProgExercise(pe.id, "name", ex.id);
                                                              }}
                                                            >
                                                              <Check
                                                                className={cn(
                                                                  "mr-2 h-4 w-4 shrink-0",
                                                                  pe.name === ex.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                              />
                                                              <span className="truncate">
                                                                {ex.name} {ex.movementType ? `(${Array.isArray(ex.movementType) ? ex.movementType.join(", ") : ex.movementType})` : ""}
                                                              </span>
                                                            </CommandItem>
                                                        ))}
                                                      </CommandGroup>
                                                    </CommandList>
                                                  </Command>
                                                </PopoverContent>
                                              </Popover>
                                              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => handleShuffleExercise(pe.id)} title="Shuffle Exercise">
                                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.84998 7.49998C1.84998 4.66458 4.05979 2.23981 6.89998 1.92253V0.845728C3.47344 1.16915 0.849976 4.0402 0.849976 7.49998C0.849976 10.9598 3.47344 13.8308 6.89998 14.1542V13.0774C4.05979 12.7601 1.84998 10.3354 1.84998 7.49998ZM13.15 7.49998C13.15 10.3354 10.9402 12.7601 8.09998 13.0774V14.1542C11.5265 13.8308 14.15 10.9598 14.15 7.49998C14.15 4.0402 11.5265 1.16915 8.09998 0.845728V1.92253C10.9402 2.23981 13.15 4.66458 13.15 7.49998Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-muted/20 p-3 rounded-md border border-border/50">
                                            <div className="flex flex-wrap items-center gap-4">
                                              {(() => {
                                                const libEx = exercises.find(e => String(e.id) === String(pe.name));
                                                const trackType = libEx?.trackingType || ["Weight & Reps"];
                                                const trackingArray = Array.isArray(trackType) ? trackType : [trackType];
                                                
                                                const showTimeMins = trackingArray.includes('Distance & Time') || trackingArray.includes('Time Only');
                                                const showTimeSecs = trackingArray.includes('Time Only');
                                                
                                                return (
                                                  <>
                                                    {trackingArray.includes('Weight & Reps') && (
                                                      <>
                                                        <div className="flex flex-col gap-1.5 w-16">
                                                          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Sets</Label>
                                                          <Input type="number" className="h-8 text-center" value={pe.sets} onChange={(e) => updateProgExercise(pe.id, "sets", parseInt(e.target.value) || 0)} />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 w-16">
                                                          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Reps</Label>
                                                          <Input type="number" className="h-8 text-center" value={pe.reps} onChange={(e) => updateProgExercise(pe.id, "reps", parseInt(e.target.value) || 0)} />
                                                        </div>
                                                      </>
                                                    )}
                                                    {trackingArray.includes('Distance & Time') && (
                                                      <div className="flex flex-col gap-1.5 w-20">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Metres</Label>
                                                        <Input type="number" className="h-8 text-center" value={pe.distance || 0} onChange={(e) => updateProgExercise(pe.id, "distance", parseInt(e.target.value) || 0)} />
                                                      </div>
                                                    )}
                                                    {showTimeMins && (
                                                      <div className="flex flex-col gap-1.5 w-16">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Mins</Label>
                                                        <Input type="number" className="h-8 text-center" value={pe.timeMins || 0} onChange={(e) => updateProgExercise(pe.id, "timeMins", parseInt(e.target.value) || 0)} />
                                                      </div>
                                                    )}
                                                    {showTimeSecs && (
                                                      <div className="flex flex-col gap-1.5 w-16">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Secs</Label>
                                                        <Input type="number" className="h-8 text-center" value={pe.timeSecs || 0} onChange={(e) => updateProgExercise(pe.id, "timeSecs", parseInt(e.target.value) || 0)} />
                                                      </div>
                                                    )}
                                                    {trackingArray.includes('Calories') && (
                                                      <div className="flex flex-col gap-1.5 w-16">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Cals</Label>
                                                        <Input type="number" className="h-8 text-center" value={pe.calories || 0} onChange={(e) => updateProgExercise(pe.id, "calories", parseInt(e.target.value) || 0)} />
                                                      </div>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                              <div className="flex flex-col gap-1.5 w-16">
                                                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Rest(s)</Label>
                                                <Input type="number" className="h-8 text-center" value={pe.rest || 0} onChange={(e) => updateProgExercise(pe.id, "rest", parseInt(e.target.value) || 0)} />
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-4 ml-auto">
                                              {(newProgType === "program" || newProgType === "GroupPT") && (
                                                <Button variant="secondary" size="sm" className="h-8 text-xs whitespace-nowrap" onClick={() => handleApplyToWeek(pe.id)}>
                                                  Apply to Week
                                                </Button>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <Checkbox 
                                                  id={`eside-${pe.id}`}
                                                  checked={pe.eachSide} 
                                                  onCheckedChange={(c) => updateProgExercise(pe.id, "eachSide", !!c)} 
                                                />
                                                <Label htmlFor={`eside-${pe.id}`} className="text-xs font-medium cursor-pointer">Each Side</Label>
                                              </div>
                                              <Button 
                                                variant={pe.linkedToNext ? "default" : "outline"} 
                                                size="sm" 
                                                className={`h-8 gap-1.5 ${pe.linkedToNext ? "bg-primary text-primary-foreground" : ""}`}
                                                onClick={() => updateProgExercise(pe.id, "linkedToNext", !pe.linkedToNext)}
                                                title={pe.linkedToNext ? "Unlink from next" : "Link to next as superset"}
                                              >
                                                {pe.linkedToNext ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                                                <span className="text-xs">Superset</span>
                                              </Button>
                                            </div>
                                            </div>
                                            <div className="w-full">
                                              <Input 
                                                placeholder="Coaching notes (visible to member)..." 
                                                value={pe.coachingNotes || ""} 
                                                onChange={(e) => updateProgExercise(pe.id, "coachingNotes", e.target.value)}
                                                className="h-8 text-xs bg-background"
                                              />
                                            </div>
                                          </div>
                                      )}
                                      
                                      <Button variant="ghost" size="icon" className={`text-destructive shrink-0 self-center ${pe.isSection ? 'mt-6' : ''}`} onClick={() => handleRemoveProgExercise(pe.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </Draggable>
                              )))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                      
                      <div className="flex gap-2 justify-center pt-4 border-t border-border mt-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Heading className="h-4 w-4" /> Add Section
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleAddProgSection("Normal")}>Normal Block</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddProgSection("AMRAP")}>AMRAP Block</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddProgSection("EMOM")}>EMOM Block</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddProgSection("Circuit")}>Circuit Block</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddProgSection("AI Engine")}>AI Engine Builder</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={handleAddProgExercise} className="gap-2">
                          <Plus className="h-4 w-4" /> Add Exercise
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddProgram} className="flex-1 gap-2">
                  <Dumbbell className="h-4 w-4" /> {editingProgramId ? "Update Program" : "Save Program"}
                </Button>
                {editingProgramId && (
                  <Button variant="outline" onClick={() => {
                    setEditingProgramId(null);
                    setNewProgName("");
                    setNewProgDesc("");
                    setProgWorkouts([]);
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-6 mb-4">
            <h3 className="text-xl font-heading tracking-wider">Existing Programs</h3>
            <Button variant="outline" className="gap-2" onClick={handleExportProgramsData}>
              <Download className="h-4 w-4" /> Backup to JSON
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p) => (
              <Card key={p.id} className="bg-muted/50 border-border">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{p.name}</span>
                    <div className="flex gap-1 -mt-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditProgram(p)} title="Edit Program">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleDuplicateProgram(p.id)} title="Duplicate Program">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteProgram(p.id)} title="Delete Program">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mt-2">
                    {p.weeks && p.daysPerWeek ? (
                      <div className="space-y-4">
                        <p>{p.weeks} Weeks • {p.daysPerWeek} Days/Week</p>
                        {p.workouts && p.workouts.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-muted-foreground">Workouts (TV Display)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {p.workouts.map((w: any, wIdx: number) => (
                                <Button 
                                  key={wIdx} 
                                  variant="outline" 
                                  size="sm" 
                                  className="justify-start gap-2 h-auto py-2"
                                  onClick={() => window.open(`/tv/${p.id}/${wIdx}`, '_blank')}
                                >
                                  <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="truncate">{w.name}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ul className="list-disc list-inside">
                        {p.exercises?.map((ex: any, i: number) => {
                          if (ex.isSection) return <li key={i} className="font-bold mt-2 list-none">{ex.name}</li>;
                          const exerciseName = exercises.find(e => String(e.id) === String(ex.name))?.name || ex.name;
                          return <li key={i}>{exerciseName} - {ex.sets}x{ex.reps}</li>;
                        })}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Card key={member.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {member.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{member.full_name}</CardTitle>
                      <CardDescription className="text-xs">{member.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => handleViewActivity(member)}
                  >
                    <History className="h-4 w-4" /> View Activity
                  </Button>
                </CardContent>
              </Card>
            ))}
            {members.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No members found yet. Members will appear here once they log in.</p>
              </div>
            )}
          </div>

          <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity History: {selectedMember?.full_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                {isLoadingActivity ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : memberActivity.length > 0 ? (
                  <div className="space-y-4">
                    {memberActivity.map((workout, idx) => (
                      <Card key={idx} className="bg-muted/30">
                        <CardHeader className="py-3 px-4">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">{workout.name || "Workout Session"}</CardTitle>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(workout.date).toLocaleDateString()}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-0 px-4 pb-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {workout.exercises?.map((ex: any, i: number) => (
                              <div key={i} className="flex justify-between border-b border-border/50 py-1">
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-muted-foreground">{ex.sets}x{ex.reps} @ {ex.weight}kg</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No workout history found for this member.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Broadcast Notification</CardTitle>
              <CardDescription>Send a message to all members currently using the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="e.g. New Equipment Alert!" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="e.g. We just added 3 new squat racks to the main floor." />
              </div>
              <Button onClick={handleSendBroadcast} disabled={isSendingNotif} className="gap-2">
                {isSendingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Broadcast
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Export Source Code</CardTitle>
              <CardDescription>Download a ZIP file of the entire project so you can host it on Netlify.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDownloadSource} disabled={isZipping} className="gap-2">
                {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Source ZIP
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Vimeo Integration</CardTitle>
              <CardDescription>Sync your Vimeo videos as exercises automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vimeo Personal Access Token</Label>
                <Input 
                  type="password" 
                  value={vimeoToken} 
                  onChange={e => {
                    setVimeoToken(e.target.value);
                    saveVimeoToken(e.target.value);
                  }} 
                  placeholder="Enter your Vimeo token" 
                />
              </div>
              <Button 
                onClick={handleSyncVimeo} 
                disabled={isSyncing || !vimeoToken}
                className="gap-2"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                {isSyncing ? "Syncing..." : "Sync Videos"}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border mt-6">
            <CardHeader>
              <CardTitle>Force Cloud Sync</CardTitle>
              <CardDescription>If your exercises or programs aren't showing up on the live site, click this to force push your local data to the database.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={async () => {
                if (exercises.length === 0 && programs.length === 0) {
                  toast.error("Both exercises and programs are empty locally. Aborting to prevent accidental deletion.");
                  return;
                }
                
                toast.info("Syncing to cloud...");
                let exRes = null;
                let progRes = null;
                
                if (exercises.length > 0) {
                  exRes = await saveExercises(exercises);
                }
                if (programs.length > 0) {
                  progRes = await savePrograms(programs);
                }
                
                if ((exRes && exRes.error) || (progRes && progRes.error)) {
                  toast.error("Sync failed: " + (exRes?.error?.message || progRes?.error?.message), { duration: 10000 });
                } else {
                  toast.success("Successfully synced exercises and programs to cloud!");
                }
              }} className="gap-2">
                <History className="h-4 w-4" /> Force Push to Cloud
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Schedule Workouts</CardTitle>
              <CardDescription>Assign programs or specific sessions to dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border bg-card"
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">
                    {selectedDate ? `Schedule for ${selectedDate.toLocaleDateString()}` : "Select a date"}
                  </h3>
                  {selectedDate && (
                    <>
                      <div className="space-y-2">
                        <Label>Select Program</Label>
                        <Select value={scheduleProgramId} onValueChange={(v) => { setScheduleProgramId(v); setScheduleWorkoutId(''); }}>
                          <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                          <SelectContent>
                            {programs.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {scheduleProgramId && (
                        <div className="space-y-2">
                          <Label>Select Session</Label>
                          <Select value={scheduleWorkoutId} onValueChange={setScheduleWorkoutId}>
                            <SelectTrigger><SelectValue placeholder="Select a session" /></SelectTrigger>
                            <SelectContent>
                              {programs.find(p => p.id === scheduleProgramId)?.workouts?.map((w: any, idx: number) => (
                                <SelectItem key={idx} value={idx.toString()}>{w.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button 
                        className="w-full"
                        disabled={!scheduleProgramId || !scheduleWorkoutId}
                        onClick={() => {
                          const dateStr = selectedDate.toISOString().split('T')[0];
                          const newEvent = {
                            id: Date.now().toString(),
                            date: dateStr,
                            programId: scheduleProgramId,
                            workoutIndex: scheduleWorkoutId,
                            programName: programs.find(p => p.id === scheduleProgramId)?.name,
                            workoutName: programs.find(p => p.id === scheduleProgramId)?.workouts[parseInt(scheduleWorkoutId)]?.name
                          };
                          saveScheduledEvents([...scheduledEvents, newEvent]);
                          toast.success("Scheduled successfully!");
                          setScheduleProgramId('');
                          setScheduleWorkoutId('');
                        }}
                      >
                        Schedule Session
                      </Button>

                      <div className="pt-6">
                        <h4 className="font-bold mb-2">Scheduled on this date:</h4>
                        <div className="space-y-2">
                          {scheduledEvents.filter(e => e.date === selectedDate.toISOString().split('T')[0]).map(event => (
                            <div key={event.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                              <div>
                                <div className="font-bold text-sm">{event.programName}</div>
                                <div className="text-xs text-muted-foreground">{event.workoutName}</div>
                              </div>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                                saveScheduledEvents(scheduledEvents.filter(e => e.id !== event.id));
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {scheduledEvents.filter(e => e.date === selectedDate.toISOString().split('T')[0]).length === 0 && (
                            <div className="text-sm text-muted-foreground">No sessions scheduled.</div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>TV Display Settings</CardTitle>
              <CardDescription>Manage presets and launch the TV display for your programs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Launch Display</h3>
                  <div className="space-y-2">
                    <Label>Select Program</Label>
                    <Select value={selectedDisplayProgramId} onValueChange={(v) => { setSelectedDisplayProgramId(v); setSelectedDisplayWorkoutId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
                      <SelectContent>
                        {programs.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedDisplayProgramId && (
                    <div className="space-y-2">
                      <Label>Select Session</Label>
                      <Select value={selectedDisplayWorkoutId} onValueChange={setSelectedDisplayWorkoutId}>
                        <SelectTrigger><SelectValue placeholder="Select a session" /></SelectTrigger>
                        <SelectContent>
                          {programs.find(p => p.id === selectedDisplayProgramId)?.workouts?.map((w: any, idx: number) => (
                            <SelectItem key={idx} value={idx.toString()}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Select Preset</Label>
                    <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                      <SelectTrigger><SelectValue placeholder="Select a preset" /></SelectTrigger>
                      <SelectContent>
                        {displayPresets.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    disabled={!selectedDisplayProgramId || !selectedDisplayWorkoutId}
                    onClick={() => window.open(`/tv/${selectedDisplayProgramId}/${selectedDisplayWorkoutId}?preset=${selectedPresetId}`, '_blank')}
                  >
                    <PlayCircle className="h-4 w-4" /> Launch TV Display
                  </Button>
                </div>
                
                <div className="space-y-4 border-l border-border pl-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Manage Presets</h3>
                    <Button variant="outline" size="sm" onClick={() => {
                      const newId = 'preset_' + Date.now();
                      savePresets([...displayPresets, { ...displayPresets[0], id: newId, name: 'New Preset' }]);
                      setEditingPresetId(newId);
                    }}>
                      <Plus className="h-4 w-4 mr-2" /> New Preset
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {displayPresets.map(preset => (
                      <div key={preset.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30">
                        <span>{preset.name}</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingPresetId(preset.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {preset.id !== 'default' && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                              savePresets(displayPresets.filter(p => p.id !== preset.id));
                              if (selectedPresetId === preset.id) setSelectedPresetId('default');
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>Configure your AI brain (Claude) for automatic workout generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Anthropic API Key</Label>
                <Input 
                  type="password" 
                  value={anthropicKey} 
                  onChange={e => {
                    setAnthropicKey(e.target.value);
                    saveAnthropicKey(e.target.value);
                  }} 
                  placeholder="sk-ant-api03-..." 
                />
                <p className="text-xs text-muted-foreground pt-1">
                  Your API key is stored securely on your device and synced to your profile. It is used directly from your browser to call Claude.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={!!editingPresetId} onOpenChange={(open) => !open && setEditingPresetId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Display Preset</DialogTitle>
            </DialogHeader>
            {editingPresetId && (() => {
              const preset = displayPresets.find(p => p.id === editingPresetId);
              if (!preset) return null;
              
              const updatePreset = (field: string, subfield: string | null, value: any) => {
                const updated = displayPresets.map(p => {
                  if (p.id === editingPresetId) {
                    if (subfield) {
                      return { ...p, [field]: { ...p[field], [subfield]: value } };
                    }
                    return { ...p, [field]: value };
                  }
                  return p;
                });
                savePresets(updated);
              };

              return (
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Preset Name</Label>
                    <Input value={preset.name} onChange={e => updatePreset('name', null, e.target.value)} />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Layout</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Orientation</Label>
                        <Select value={preset.layout.orientation} onValueChange={v => updatePreset('layout', 'orientation', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="landscape">Landscape</SelectItem>
                            <SelectItem value="portrait">Portrait</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Checkbox id="showRest" checked={preset.layout.showRest} onCheckedChange={c => updatePreset('layout', 'showRest', !!c)} />
                        <label htmlFor="showRest" className="text-sm">Show Rest Times</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="showHeaders" checked={preset.layout.showHeaders} onCheckedChange={c => updatePreset('layout', 'showHeaders', !!c)} />
                        <label htmlFor="showHeaders" className="text-sm">Show Column Headers</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="showDuration" checked={preset.layout.showDuration} onCheckedChange={c => updatePreset('layout', 'showDuration', !!c)} />
                        <label htmlFor="showDuration" className="text-sm">Show Duration</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Colors</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <Input type="color" value={preset.colors.background} onChange={e => updatePreset('colors', 'background', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Block Color</Label>
                        <Input type="color" value={preset.colors.blockBackground} onChange={e => updatePreset('colors', 'blockBackground', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button onClick={() => setEditingPresetId(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
};

export default Admin;