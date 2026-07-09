import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getExercises, saveExercises, getPrograms, savePrograms, saveVimeoToken, getMembers, getMemberActivity, sendNotification } from "@/lib/store";
import { Plus, Trash2, Dumbbell, PlayCircle, GripVertical, Copy, Video, Loader2, Edit, Users, History, Calendar, Bell, Send, Download } from "lucide-react";
import JSZip from "jszip";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

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

  const MOVEMENT_TYPES = ["Warm Up", "Knee", "Hip", "Push", "Pull", "Conditioning", "Core", "Carries", "Fire Up", "Accessory"];

  // Search State for Program Builder
  const [exerciseSearch, setExerciseSearch] = useState("");

  // New Program State
  const [newProgName, setNewProgName] = useState("");
  const [newProgDesc, setNewProgDesc] = useState("");
  const [newProgWeeks, setNewProgWeeks] = useState(4);
  const [newProgDays, setNewProgDays] = useState(3);
  const [progWorkouts, setProgWorkouts] = useState<any[]>([]);
  const [selectedWorkoutIndex, setSelectedWorkoutIndex] = useState(0);

  // Vimeo Integration
  const [vimeoToken, setVimeoToken] = useState(() => localStorage.getItem("fittrack_vimeo_token") || "");
  const [isSyncing, setIsSyncing] = useState(false);

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
    };
    const updated = [...exercises, newEx];
    setExercises(updated);
    saveExercises(updated);
    toast.success("Exercise added!");
    setNewExName("");
    setNewExMuscle("");
    setNewExVid("");
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
      
      const headers = ["ID", "Name", "Categories", "Muscle", "Equipment", "Difficulty", "Movement Types", "Video URL"];
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
          `"${ex.videoUrl || ""}"`
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
    const totalWorkouts = newProgWeeks * newProgDays;
    const newWorkouts = [];
    for (let i = 0; i < totalWorkouts; i++) {
      const week = Math.floor(i / newProgDays) + 1;
      const day = (i % newProgDays) + 1;
      newWorkouts.push({
        id: `w_${Date.now()}_${i}`,
        name: `Week ${week}, Day ${day}`,
        exercises: []
      });
    }
    setProgWorkouts(newWorkouts);
    setSelectedWorkoutIndex(0);
  };

  const handleAddProgExercise = () => {
    const updatedWorkouts = [...progWorkouts];
    updatedWorkouts[selectedWorkoutIndex].exercises.push({ id: Date.now(), blockType: "Strength", name: "", sets: 3, reps: 10, weight: 0 });
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
      weeks: newProgWeeks,
      daysPerWeek: newProgDays,
      workouts: progWorkouts.map(w => ({
        name: w.name,
        exercises: w.exercises.map((e: any) => ({ blockType: e.blockType || "Strength", name: e.name, sets: e.sets, reps: e.reps, weight: e.weight }))
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
    setProgWorkouts([]);
    setEditingProgramId(null);
  };

  const handleEditProgram = (prog: any) => {
    setEditingProgramId(prog.id);
    setNewProgName(prog.name);
    setNewProgDesc(prog.description || "");
    setNewProgWeeks(prog.weeks || 4);
    setNewProgDays(prog.daysPerWeek || 3);
    
    const workouts = prog.workouts?.length ? prog.workouts.map((w: any, idx: number) => ({
      id: `w_${Date.now()}_${idx}`,
      name: w.name,
      exercises: w.exercises.map((e: any, eIdx: number) => ({
        id: Date.now() + eIdx + Math.random(),
        blockType: e.blockType || "Strength",
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight || 0
      }))
    })) : [];
    
    setProgWorkouts(workouts);
    setSelectedWorkoutIndex(0);
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
      
      const allFiles = { ...srcFiles, ...publicFiles, ...rootFiles };
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

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Staff Hub</h2>
      </div>

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-[900px]">
          <TabsTrigger value="exercises">Manage Exercises</TabsTrigger>
          <TabsTrigger value="programs">Manage Programs</TabsTrigger>
          <TabsTrigger value="members">Member Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
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
                          videoUrl: cols[7] || ""
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
                  <div className="space-y-2">
                    <Label>Length (Weeks)</Label>
                    <Input type="number" min="1" max="52" value={newProgWeeks} onChange={e => setNewProgWeeks(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Days per Week</Label>
                    <Input type="number" min="1" max="7" value={newProgDays} onChange={e => setNewProgDays(parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                
                {progWorkouts.length === 0 ? (
                  <Button onClick={handleGenerateWorkoutSlots} className="w-full">Generate Workout Grid</Button>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-border">
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
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading tracking-wider text-xl">{progWorkouts[selectedWorkoutIndex].name}</h3>
                        <div className="flex gap-2">
                          {selectedWorkoutIndex > 0 && (
                            <Button variant="outline" size="sm" onClick={handleCopyFromPrevious} className="gap-2">
                              <Copy className="h-4 w-4" /> Copy Previous
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={handleAddProgExercise} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Exercise
                          </Button>
                        </div>
                      </div>

                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="exercises-list">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                              {progWorkouts[selectedWorkoutIndex].exercises.map((pe: any, index: number) => (
                                <Draggable key={pe.id.toString()} draggableId={pe.id.toString()} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className="flex gap-4 items-end bg-background p-4 rounded-md border border-border"
                                    >
                                      <div {...provided.dragHandleProps} className="pb-2 cursor-grab text-muted-foreground hover:text-foreground">
                                        <GripVertical className="h-5 w-5" />
                                      </div>
                                      <div className="space-y-2 w-32 shrink-0">
                                        <Label>Block Type</Label>
                                        <Select value={pe.blockType || "Strength"} onValueChange={(v) => {
                                          const updatedWorkouts = [...progWorkouts];
                                          const ex = updatedWorkouts[selectedWorkoutIndex].exercises.find((e: any) => e.id === pe.id);
                                          if(ex) { ex.blockType = v; ex.name = ""; }
                                          setProgWorkouts(updatedWorkouts);
                                        }}>
                                          <SelectTrigger><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Strength">Strength</SelectItem>
                                            <SelectItem value="Cardio">Cardio</SelectItem>
                                            <SelectItem value="Mobility">Mobility</SelectItem>
                                            <SelectItem value="Activation">Activation</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2 flex-1">
                                        <Label>Exercise</Label>
                                        <Select value={pe.name} onValueChange={(v) => updateProgExercise(pe.id, "name", v)}>
                                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
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
                                            {exercises
                                              .filter(ex => {
                                                if (!pe.blockType) return true;
                                                const cats = Array.isArray(ex.category) ? ex.category : [ex.category || "Strength"];
                                                return cats.includes(pe.blockType);
                                              })
                                              .filter(ex => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                                              .sort((a, b) => a.name.localeCompare(b.name))
                                              .map(ex => (
                                                <SelectItem key={ex.id} value={ex.id}>{ex.name} {ex.movementType ? `(${Array.isArray(ex.movementType) ? ex.movementType.join(", ") : ex.movementType})` : ""}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2 w-20">
                                        <Label>Sets</Label>
                                        <Input type="number" value={pe.sets} onChange={(e) => updateProgExercise(pe.id, "sets", parseInt(e.target.value) || 0)} />
                                      </div>
                                      <div className="space-y-2 w-20">
                                        <Label>Reps</Label>
                                        <Input type="number" value={pe.reps} onChange={(e) => updateProgExercise(pe.id, "reps", parseInt(e.target.value) || 0)} />
                                      </div>
                                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleRemoveProgExercise(pe.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
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
                          const exerciseName = exercises.find(e => e.id === ex.name)?.name || ex.name;
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
                              <Calendar className="h-3 w-3" />
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
      </Tabs>
    </div>
  );
};

export default Admin;