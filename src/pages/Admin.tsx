import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [newExMuscle, setNewExMuscle] = useState("");
  const [newExEq, setNewExEq] = useState("Barbell");
  const [newExDiff, setNewExDiff] = useState("Beginner");
  const [newExVid, setNewExVid] = useState("");

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
    setExercises(getExercises());
    setPrograms(getPrograms());
    loadMembers();
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
              muscle: "Uncategorized",
              equipment: "Bodyweight",
              difficulty: "Beginner",
              videoUrl: link
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
      id: newExName.toLowerCase().replace(/\\s+/g, '-'),
      name: newExName,
      muscle: newExMuscle,
      equipment: newExEq,
      difficulty: newExDiff,
      videoUrl: newExVid,
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
    updatedWorkouts[selectedWorkoutIndex].exercises.push({ id: Date.now(), name: exercises[0]?.id || "", sets: 3, reps: 10, weight: 0 });
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

  const handleAddProgram = () => {
    if (!newProgName) {
      toast.error("Please provide a program name.");
      return;
    }
    const newProg = {
      id: "p_" + Date.now(),
      name: newProgName,
      description: newProgDesc,
      weeks: newProgWeeks,
      daysPerWeek: newProgDays,
      workouts: progWorkouts.map(w => ({
        name: w.name,
        exercises: w.exercises.map((e: any) => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight }))
      }))
    };
    const updated = [...programs, newProg];
    setPrograms(updated);
    savePrograms(updated);
    toast.success("Program added!");
    setNewProgName("");
    setNewProgDesc("");
    setProgWorkouts([]);
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
                  <Label>Muscle Group</Label>
                  <Input value={newExMuscle} onChange={e => setNewExMuscle(e.target.value)} placeholder="e.g. Chest" />
                </div>
                <div className="space-y-2">
                  <Label>Equipment</Label>
                  <Select value={newExEq} onValueChange={setNewExEq}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Barbell">Barbell</SelectItem>
                      <SelectItem value="Dumbbell">Dumbbell</SelectItem>
                      <SelectItem value="Machine">Machine</SelectItem>
                      <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                      <SelectItem value="Cable">Cable</SelectItem>
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
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
                  <CardDescription>{ex.muscle} • {ex.equipment}</CardDescription>
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
                    <Label>Muscle Group</Label>
                    <Input value={editingExercise.muscle} onChange={e => setEditingExercise({...editingExercise, muscle: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment</Label>
                    <Select value={editingExercise.equipment} onValueChange={v => setEditingExercise({...editingExercise, equipment: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barbell">Barbell</SelectItem>
                        <SelectItem value="Dumbbell">Dumbbell</SelectItem>
                        <SelectItem value="Machine">Machine</SelectItem>
                        <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                        <SelectItem value="Cable">Cable</SelectItem>
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
                                      <div className="space-y-2 flex-1">
                                        <Label>Exercise</Label>
                                        <Select value={pe.name} onValueChange={(v) => updateProgExercise(pe.id, "name", v)}>
                                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                          <SelectContent>
                                            {exercises.map(ex => (
                                              <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
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

              <Button onClick={handleAddProgram} className="w-full gap-2">
                <Dumbbell className="h-4 w-4" /> Save Program
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p) => (
              <Card key={p.id} className="bg-muted/50 border-border">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{p.name}</span>
                    <div className="flex gap-1 -mt-2">
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
                      <p>{p.weeks} Weeks • {p.daysPerWeek} Days/Week</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;