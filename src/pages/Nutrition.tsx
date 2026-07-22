import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Flame, Target, Trophy, Info, Plus, Minus, Camera, Ruler, TrendingUp, ImagePlus, LayoutDashboard, Calendar, ArrowRight, Share2, Upload, Loader2, History, ChevronLeft, RefreshCw, AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger as RadixDialogTrigger,
} from "@/components/ui/dialog";
import { getEmbedUrl } from "@/lib/utils";
import { 
  getHabits, 
  getMemberNutrition, 
  saveMemberNutrition, 
  getMemberHabits, 
  saveMemberHabits, 
  getHabitCheckins, 
  saveHabitCheckin,
  seedMemberHabits,
  GOAL_PATHS,
  getMemberMeasurements,
  saveMemberMeasurement,
  getMemberPhotos,
  saveMemberPhoto,
  getBodyweightHistory,
  saveBodyweight,
  resetMemberNutrition
} from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from "@/lib/supabase";

export default function Nutrition() {
  const [nutrition, setNutrition] = useState<any>(null);
  const [memberHabits, setMemberHabits] = useState<any[]>([]);
  const [habitsLibrary, setHabitsLibrary] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [bodyweight, setBodyweight] = useState<any[]>([]);
  const [coachNotes, setCoachNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'habits' | 'progress' | 'roadmap'>('habits');
  const [showSeasonReview, setShowSeasonReview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [newMeasurement, setNewMeasurement] = useState({
    waist: '', hips: '', chest: '', thigh: '', arm: '', notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const nut = getMemberNutrition();
      let mHabits = getMemberHabits();
      const lib = await getHabits();
      const chks = getHabitCheckins();
      const meas = getMemberMeasurements();
      const phs = getMemberPhotos();
      const bw = getBodyweightHistory();
      
      setNutrition(nut);
      setMemberHabits(mHabits);
      setHabitsLibrary(lib);
      setCheckins(chks);
      setMeasurements(meas);
      setPhotos(phs);
      setBodyweight(bw);

      const { data: { user } } = await supabase.auth.getUser();
      let currentNut = nut;
      if (user) {
        const { data: notes } = await supabase.from('coach_notes').select('*').eq('member_id', user.id).order('created_at', { ascending: false });
        if (notes) setCoachNotes(notes);
        
        // Refetch coached status and latest nutrition data to override local cache
        const { data: freshNut } = await supabase.from('member_nutrition').select('*').eq('member_id', user.id).maybeSingle();
        if (freshNut) {
          currentNut = freshNut;
          setNutrition(freshNut);
          localStorage.setItem('fittrack_member_nutrition', JSON.stringify(freshNut));
        }

        // Refetch member habits from cloud
        const { data: cloudHabits } = await supabase.from('member_habits').select('*').eq('member_id', user.id);
        if (cloudHabits && cloudHabits.length > 0) {
          setMemberHabits(cloudHabits);
          mHabits = cloudHabits;
          localStorage.setItem('fittrack_member_habits', JSON.stringify(cloudHabits));
        } else if (mHabits.length > 0) {
          // Backfill existing local habits to Supabase
          const savedHabits = await saveMemberHabits(mHabits);
          setMemberHabits(savedHabits);
          mHabits = savedHabits;
        }
      }
      
      if (currentNut) {
        if (mHabits.length > 0) {
          checkProgression(currentNut, mHabits, chks);
        }
        
        // Check for season review
        const lastReview = currentNut.last_review_at ? new Date(currentNut.last_review_at) : new Date(currentNut.started_at);
        const diffWeeks = Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks >= 12) {
          setShowSeasonReview(true);
        }
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkProgression = async (nut: any, mHabits: any[], chks: any[]) => {
    const activeHabits = mHabits.filter(h => h.status === 'active');
    let updatedHabits = [...mHabits];
    let graduatedAny = false;

    for (const mHabit of activeHabits) {
      const habit = habitsLibrary.find(h => h.id === mHabit.habit_id);
      if (!habit) continue;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      });

      const doneDays = last7Days.filter(date => {
        const checkin = chks.find(c => c.date === date && c.habit_id === mHabit.habit_id);
        if (!checkin) return false;
        if (habit.checkin_type === 'tick') return checkin.done;
        return (checkin.count_value || 0) >= (habit.count_target || 0);
      }).length;

      const consistency = (doneDays / 7) * 100;

      if (consistency >= 85) {
        const idx = updatedHabits.findIndex(h => h.id === mHabit.id);
        updatedHabits[idx] = { 
          ...mHabit, 
          status: 'graduated', 
          graduated_at: new Date().toISOString() 
        };
        graduatedAny = true;
        toast.success(`Congratulations! You graduated: ${habit.name}`);
      }
    }

    if (graduatedAny) {
      const currentlyActive = updatedHabits.filter(h => h.status === 'active').length;
      if (currentlyActive < 2) {
        const nextQueued = updatedHabits
          .filter(h => h.status === 'queued')
          .sort((a, b) => a.position - b.position)[0];
        
        if (nextQueued) {
          const idx = updatedHabits.findIndex(h => h.id === nextQueued.id);
          updatedHabits[idx] = { 
            ...nextQueued, 
            status: 'active', 
            started_at: new Date().toISOString() 
          };
        }
      }

      const goalPath = GOAL_PATHS[nut.goal] || [];
      const phaseHabits = habitsLibrary.filter(h => h.phase === nut.phase && goalPath.includes(h.id));
      const allGraduated = phaseHabits.every(h => 
        updatedHabits.find(mh => mh.habit_id === h.id && mh.status === 'graduated')
      );

      if (allGraduated && phaseHabits.length > 0) {
        const nextNut = { ...nut, phase: nut.phase + 1 };
        setNutrition(nextNut);
        await saveMemberNutrition(nextNut);
        toast.success(`You've reached Phase ${nextNut.phase}!`);
      }

      const savedHabits = await saveMemberHabits(updatedHabits);
      setMemberHabits(savedHabits);
    }
  };
  const recordCoachingInterest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke("manage-members", {
        body: {
          action: "nutrition_coaching_interest",
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          email: user.email,
          staffSecret: "42a37f4a3f9ceed78d7928187bfc339d25af43d79d5fb0b0"
        }
      });
      
      toast.success("Interest recorded! We'll be in touch.");
    } catch (e) {
      console.error("Failed to record interest", e);
      toast.error("Something went wrong. Please try again later.");
    }
  };


  const handleStartOnboarding = async (goal: string) => {
    const nut = { goal, phase: 1, season: 1, coached: false, started_at: new Date().toISOString() };
    setNutrition(nut);
    await saveMemberNutrition(nut);
    const mHabits = await seedMemberHabits(goal);
    setMemberHabits(mHabits);
    toast.success("Welcome to your nutrition journey!");
  };

  const handleCheckin = async (habitId: number, value: any) => {
    const date = new Date().toISOString().split('T')[0];
    const checkin = { habit_id: habitId, date, ...value };
    const updatedCheckins = [...checkins];
    const idx = updatedCheckins.findIndex(c => c.date === date && c.habit_id === habitId);
    if (idx >= 0) updatedCheckins[idx] = checkin;
    else updatedCheckins.push(checkin);
    setCheckins(updatedCheckins);
    await saveHabitCheckin(checkin);
  };

  const handleAddMeasurement = async () => {
    const date = new Date().toISOString().split('T')[0];
    const meas = await saveMemberMeasurement({ ...newMeasurement, date });
    setMeasurements(meas);
    setNewMeasurement({ waist: '', hips: '', chest: '', thigh: '', arm: '', notes: '' });
    toast.success("Measurements saved!");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `nutrition-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const phs = await saveMemberPhoto({
        url: publicUrl,
        date: new Date().toISOString().split('T')[0],
        pose: 'front' // Default pose
      });
      setPhotos(phs);
      toast.success("Photo uploaded!");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogWeight = async (weight: number) => {
    const res = await saveBodyweight({ weight });
    if (res.success) {
      setBodyweight(res.history);
      toast.success("Weight logged!");
    }
  };

  const handleSeasonReviewSubmit = async (newGoal: string) => {
    const updatedNut = {
      ...nutrition,
      goal: newGoal,
      season: (nutrition.season || 1) + 1,
      last_review_at: new Date().toISOString()
    };
    setNutrition(updatedNut);
    await saveMemberNutrition(updatedNut);
    
    if (newGoal !== nutrition.goal) {
      const mHabits = await seedMemberHabits(newGoal);
      setMemberHabits(mHabits);
    }
    
    setShowSeasonReview(false);
    toast.success(`Season ${updatedNut.season} started!`);
  };

  const handleResetPlan = async () => {
    setLoading(true);
    try {
      await resetMemberNutrition();
      setNutrition(null);
      setMemberHabits([]);
      setCheckins([]);
      toast.success("Nutrition plan reset successfully");
    } catch (error) {
      toast.error("Failed to reset plan");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!nutrition) {
    return (
      <div className="p-6 space-y-8 min-h-screen flex flex-col items-center justify-center text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-heading text-primary uppercase tracking-tighter">Nutrition Journey</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Build sustainable habits that last a lifetime. Pick your primary goal to begin.
          </p>
        </div>
        <div className="grid gap-4 w-full max-w-sm">
          <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleStartOnboarding('fat_loss')}>
            <Target className="h-6 w-6 text-primary" />
            <span className="font-bold">Fat Loss</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleStartOnboarding('performance')}>
            <Flame className="h-6 w-6 text-primary" />
            <span className="font-bold">Performance</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleStartOnboarding('health')}>
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold">Health & Longevity</span>
          </Button>
        </div>
      </div>
    );
  }

  const activeMemberHabits = memberHabits.filter(h => h.status === 'active');
  const today = new Date().toISOString().split('T')[0];

  // Calculate consistency trend
  const consistencyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    let done = 0;
    activeMemberHabits.forEach(mh => {
      const habit = habitsLibrary.find(h => h.id === mh.habit_id);
      const checkin = checkins.find(c => c.date === dateStr && c.habit_id === mh.habit_id);
      if (checkin && habit) {
        if (habit.checkin_type === 'tick' && checkin.done) done++;
        else if (habit.checkin_type === 'count' && (checkin.count_value || 0) >= (habit.count_target || 0)) done++;
      }
    });
    return {
      date: dateStr.slice(5),
      value: activeMemberHabits.length > 0 ? Math.round((done / activeMemberHabits.length) * 100) : 0
    };
  });

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading text-foreground uppercase tracking-tighter">Nutrition</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Phase {nutrition.phase} · {nutrition.goal.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button variant={activeTab === 'habits' ? 'default' : 'ghost'} size="sm" className="text-[10px] h-8" onClick={() => setActiveTab('habits')}>Habits</Button>
            <Button variant={activeTab === 'progress' ? 'default' : 'ghost'} size="sm" className="text-[10px] h-8" onClick={() => setActiveTab('progress')}>Progress</Button>
            <Button variant={activeTab === 'roadmap' ? 'default' : 'ghost'} size="sm" className="text-[10px] h-8" onClick={() => setActiveTab('roadmap')}>Roadmap</Button>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Reset Nutrition Plan?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your current habit progress, check-ins, and goal selection. You will be able to start a fresh approach from scratch.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetPlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {showSeasonReview && (
        <SeasonReviewFlow 
          nutrition={nutrition}
          memberHabits={memberHabits}
          habitsLibrary={habitsLibrary}
          checkins={checkins}
          measurements={measurements}
          bodyweight={bodyweight}
          onComplete={handleSeasonReviewSubmit}
          onCancel={() => setShowSeasonReview(false)}
          onPhotoUpload={() => photoInputRef.current?.click()}
          onAddMeasurement={handleAddMeasurement}
          newMeasurement={newMeasurement}
          setNewMeasurement={setNewMeasurement}
          recordCoachingInterest={recordCoachingInterest}
        />
      )}

      <AnimatePresence>
        {activeTab === 'habits' && (
          <motion.div key="habits" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <HabitsHome activeMemberHabits={activeMemberHabits} habitsLibrary={habitsLibrary} checkins={checkins} handleCheckin={handleCheckin} today={today} memberHabits={memberHabits} coachNotes={coachNotes} nutrition={nutrition} recordCoachingInterest={recordCoachingInterest} />
          </motion.div>
        )}
        {activeTab === 'progress' && (
          <motion.div key="progress" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <NutritionProgress consistencyData={consistencyData} measurements={measurements} photos={photos} bodyweight={bodyweight} onAddMeasurement={handleAddMeasurement} newMeasurement={newMeasurement} setNewMeasurement={setNewMeasurement} onPhotoUpload={() => photoInputRef.current?.click()} onLogWeight={handleLogWeight} isUploading={isUploading} />
          </motion.div>
        )}
        {activeTab === 'roadmap' && (
          <motion.div key="roadmap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <RoadmapView nutrition={nutrition} memberHabits={memberHabits} habitsLibrary={habitsLibrary} />
          </motion.div>
        )}
      </AnimatePresence>
      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
    </div>
  );
}

function HabitsHome({ activeMemberHabits, habitsLibrary, checkins, handleCheckin, today, memberHabits, coachNotes, nutrition, recordCoachingInterest }: any) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const totalPossible = last7Days.length * activeMemberHabits.length;
  let totalDone = 0;
  if (totalPossible > 0) {
    last7Days.forEach(date => {
      activeMemberHabits.forEach((mh: any) => {
        const habit = habitsLibrary.find((h: any) => h.id === mh.habit_id);
        const checkin = checkins.find((c: any) => c.date === date && c.habit_id === mh.habit_id);
        if (checkin && habit) {
          if (habit.checkin_type === 'tick' && checkin.done) totalDone++;
          else if (habit.checkin_type === 'count' && (checkin.count_value || 0) >= (habit.count_target || 0)) totalDone++;
        }
      });
    });
  }
  const consistency = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  let streak = 0;
  let currentDay = 0;
  while (true) {
    const d = new Date();
    d.setDate(d.getDate() - currentDay);
    const dateStr = d.toISOString().split('T')[0];
    const allDone = activeMemberHabits.every((mh: any) => {
      const habit = habitsLibrary.find((h: any) => h.id === mh.habit_id);
      const checkin = checkins.find((c: any) => c.date === dateStr && c.habit_id === mh.habit_id);
      if (!checkin || !habit) return false;
      if (habit.checkin_type === 'tick') return checkin.done;
      return (checkin.count_value || 0) >= (habit.count_target || 0);
    });
    if (allDone && activeMemberHabits.length > 0) { streak++; currentDay++; } else break;
  }
  const nextQueuedHabit = memberHabits.filter((h: any) => h.status === 'queued').sort((a: any, b: any) => a.position - b.position)[0];
  const nextHabitName = nextQueuedHabit ? habitsLibrary.find((h: any) => h.id === nextQueuedHabit.habit_id)?.name : "Journey Complete";

  let upsellMessage = null;
  if (!nutrition?.coached) {
    if (streak >= 7) {
      upsellMessage = "You're smashing this. A coach will push you further.";
    } else if (consistency < 50 && activeMemberHabits.length > 0) {
      upsellMessage = "Stuck? This is exactly where a coach breaks you through.";
    }
  }

  return (
    <div className="space-y-6">
      {upsellMessage && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <p className="text-sm font-medium">{upsellMessage}</p>
            <Button size="sm" onClick={recordCoachingInterest}>Upgrade</Button>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-heading text-primary">{consistency}%</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">7-Day Consistency</span>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1">
              <Flame className="h-5 w-5 text-primary fill-primary" />
              <span className="text-3xl font-heading text-primary">{streak}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Day Streak</span>
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Roadmap Progress</span>
              <p className="text-xs font-bold">Next: <span className="text-primary">{nextHabitName}</span></p>
            </div>
            <span className="text-[10px] font-bold text-primary">85% TO UNLOCK</span>
          </div>
          <Progress value={consistency} className="h-2" />
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" /> Coach's Note
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {nutrition?.coached ? (
            coachNotes?.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm italic">"{coachNotes[0].note}"</p>
                <p className="text-[10px] text-muted-foreground uppercase">{new Date(coachNotes[0].created_at).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes from your coach yet.</p>
            )
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">Your coach's note appears here — upgrade to 1-1 coaching.</p>
              <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={recordCoachingInterest}>
                Learn about 1-1 Coaching
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-heading uppercase">Today's Habits</h2>
        {activeMemberHabits.length > 0 ? activeMemberHabits.map((mh: any) => {
          const habit = habitsLibrary.find((h: any) => String(h.id) === String(mh.habit_id));

          if (!habit) return null;
          const checkin = checkins.find((c: any) => c.date === today && c.habit_id === mh.habit_id);
          const isDone = habit.checkin_type === 'tick' ? checkin?.done : (checkin?.count_value || 0) >= (habit.count_target || 0);
          return (
            <Card key={mh.id} className={`transition-all duration-300 ${isDone ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <CardHeader className="p-4 pb-0">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">{habit.name}</CardTitle>
                    <CardDescription className="text-xs">{habit.coaching_cue}</CardDescription>
                    
                    {habit.video_url && (
                      <Dialog>
                        <RadixDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="mt-2 gap-2 w-full justify-start text-xs h-8">
                            <Play className="h-3 w-3 fill-primary text-primary" /> Watch the lesson
                          </Button>
                        </RadixDialogTrigger>
                        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none">
                          <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
                            <DialogTitle className="text-white">{habit.name}</DialogTitle>
                          </DialogHeader>
                          <div className="aspect-video w-full mt-10">
                            <iframe
                              src={getEmbedUrl(habit.video_url)}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{habit.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                  <Info className="h-3 w-3" /> {habit.practice_label}
                </div>
                {habit.checkin_type === 'tick' ? (
                  <Button size="lg" variant={isDone ? "default" : "outline"} className={`h-14 w-14 rounded-full p-0 transition-all ${isDone ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20' : ''}`} onClick={() => handleCheckin(habit.id, { done: !isDone })}>
                    <Check className={`h-6 w-6 transition-transform duration-500 ${isDone ? 'scale-125' : 'scale-100'}`} />
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 bg-muted rounded-full p-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-background" onClick={() => handleCheckin(habit.id, { count_value: Math.max(0, (checkin?.count_value || 0) - 1) })}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col items-center min-w-[40px]">
                      <span className="text-lg font-bold">{(checkin?.count_value || 0)}</span>
                      <span className="text-[8px] uppercase font-bold text-muted-foreground">{habit.count_unit}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-background" onClick={() => handleCheckin(habit.id, { count_value: (checkin?.count_value || 0) + 1 })}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }) : (
          <div className="text-center py-12 space-y-4">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
            <p className="text-sm text-muted-foreground">All habits graduated! Check the roadmap for next steps.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NutritionProgress({ consistencyData, measurements, photos, bodyweight, onAddMeasurement, newMeasurement, setNewMeasurement, onPhotoUpload, onLogWeight, isUploading }: any) {
  const latestMeas = measurements[measurements.length - 1];
  const firstMeas = measurements[0];
  const latestWeight = bodyweight[bodyweight.length - 1]?.weight;
  const firstWeight = bodyweight[0]?.weight;
  const getDiff = (field: string) => {
    if (!latestMeas || !firstMeas || !latestMeas[field] || !firstMeas[field]) return null;
    const diff = latestMeas[field] - firstMeas[field];
    return diff === 0 ? "0" : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}cm`;
  };
  const weightDiff = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-heading uppercase flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Habit Consistency</h2>
        <Card className="p-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={consistencyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }} 
                itemStyle={{ color: 'var(--primary)' }}
                formatter={(value: number) => [`${value}%`, 'Consistency']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading uppercase flex items-center gap-2"><Ruler className="h-5 w-5 text-primary" /> Measurements</h2>
          <DialogTrigger label="Add" icon={<Plus className="h-4 w-4" />}>
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                {['waist', 'hips', 'chest', 'thigh', 'arm'].map(f => (
                  <div key={f} className="space-y-2">
                    <Label className="capitalize">{f} (cm)</Label>
                    <Input type="number" value={newMeasurement[f]} onChange={e => setNewMeasurement({...newMeasurement, [f]: e.target.value})} />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={newMeasurement.notes} onChange={e => setNewMeasurement({...newMeasurement, notes: e.target.value})} />
              </div>
              <Button className="w-full" onClick={onAddMeasurement}>Save Measurements</Button>
            </div>
          </DialogTrigger>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {['waist', 'hips', 'chest', 'thigh', 'arm'].map(field => (
            <Card key={field} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">{field}</p>
                  <p className="text-lg font-bold">{latestMeas?.[field] || '--'} cm</p>
                </div>
                {getDiff(field) && <span className={`text-[10px] font-bold ${getDiff(field)?.includes('▼') ? 'text-primary' : 'text-destructive'}`}>{getDiff(field)}</span>}
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading uppercase flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Progress Photos</h2>
          <Button variant="outline" size="sm" onClick={onPhotoUpload} disabled={isUploading} className="gap-2">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Add Photo
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">First</p>
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative border border-border">
              {photos[0] ? <img src={photos[0].url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground/20" /></div>}
              {photos[0] && <Badge className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm border-none text-[8px]">{new Date(photos[0].date).toLocaleDateString()}</Badge>}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Latest</p>
            <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden relative border border-primary/20">
              {photos.length > 1 ? <img src={photos[photos.length - 1].url} className="w-full h-full object-cover" /> : (photos[0] ? <img src={photos[0].url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground/20" /></div>)}
              {photos.length > 0 && <Badge className="absolute bottom-2 left-2 bg-primary/80 text-primary-foreground border-none text-[8px]">{new Date(photos[photos.length - 1].date).toLocaleDateString()}</Badge>}
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-heading uppercase flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Bodyweight</h2>
          <DialogTrigger label="Log" icon={<Plus className="h-4 w-4" />}>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Current Weight (kg)</Label>
                <Input type="number" step="0.1" placeholder="75.5" onKeyDown={e => { if (e.key === 'Enter') onLogWeight(parseFloat((e.target as HTMLInputElement).value)); }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Press Enter to save</p>
            </div>
          </DialogTrigger>
        </div>
        <Card className="p-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyweight}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }} itemStyle={{ color: 'var(--primary)' }} />
              <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <div className="flex justify-between items-center px-2">
          <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-muted-foreground">Current</span><span className="text-xl font-bold">{latestWeight || '--'} kg</span></div>
          <div className="flex flex-col items-end"><span className="text-[10px] uppercase font-bold text-muted-foreground">Change</span><span className={`text-xl font-bold ${weightDiff && weightDiff < 0 ? 'text-primary' : 'text-destructive'}`}>{weightDiff ? `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} kg` : '--'}</span></div>
        </div>
      </section>
    </div>
  );
}

function RoadmapView({ nutrition, memberHabits, habitsLibrary }: any) {
  return (
    <div className="space-y-8 relative">
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border z-0" />
      {[1, 2, 3].map(phase => {
        const goalPath = GOAL_PATHS[nutrition.goal] || [];
        const phaseHabits = habitsLibrary.filter((h: any) => h.phase === phase && goalPath.includes(h.id));
        return (
          <div key={phase} className="space-y-4">
            <div className="flex items-center gap-4 z-10 relative">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${nutrition.phase >= phase ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{phase}</div>
              <h3 className="font-heading text-lg uppercase">Phase {phase}</h3>
            </div>
            <div className="pl-12 space-y-3">
              {phaseHabits.map((h: any) => {
                const mHabit = memberHabits.find((mh: any) => String(mh.habit_id) === String(h.id));

                const status = mHabit?.status || 'locked';
                const hasVideo = !!h.video_url;
                const isUnlocked = status === 'active' || status === 'graduated';
                
                const content = (
                  <div className={`flex items-center justify-between p-3 rounded-lg border bg-card ${isUnlocked && hasVideo ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${status === 'locked' ? 'text-muted-foreground' : 'text-foreground'}`}>{h.name}</span>
                        {isUnlocked && hasVideo && <Play className="h-3 w-3 fill-primary text-primary" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{h.practice_label}</span>
                    </div>
                    {status === 'graduated' && <Check className="h-5 w-5 text-primary" />}
                    {status === 'active' && <Badge className="bg-primary text-primary-foreground">Active</Badge>}
                    {status === 'locked' && <Badge variant="outline" className="text-muted-foreground">Locked</Badge>}
                  </div>
                );

                if (isUnlocked && hasVideo) {
                  return (
                    <Dialog key={h.id}>
                      <RadixDialogTrigger asChild>
                        {content}
                      </RadixDialogTrigger>
                      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none">
                        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
                          <DialogTitle className="text-white">{h.name}</DialogTitle>
                        </DialogHeader>
                        <div className="aspect-video w-full mt-10">
                          <iframe
                            src={getEmbedUrl(h.video_url)}
                            className="w-full h-full"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                }

                return <div key={h.id}>{content}</div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeasonReviewFlow({ nutrition, memberHabits, habitsLibrary, checkins, measurements, bodyweight, onComplete, onCancel, onPhotoUpload, onAddMeasurement, newMeasurement, setNewMeasurement, recordCoachingInterest }: any) {
  const [step, setStep] = useState(1);
  const [newGoal, setNewGoal] = useState(nutrition.goal);

  // Summary stats
  const graduatedCount = memberHabits.filter((h: any) => h.status === 'graduated' && new Date(h.graduated_at) > (nutrition.last_review_at ? new Date(nutrition.last_review_at) : new Date(nutrition.started_at))).length;
  
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="p-6 space-y-8 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}><ChevronLeft className="h-6 w-6" /></Button>
          <h1 className="text-3xl font-heading uppercase tracking-tighter">Season {nutrition.season || 1} Review</h1>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-heading uppercase">Season Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <span className="text-4xl font-heading text-primary">{graduatedCount}</span>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Habits Graduated</p>
                </Card>
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <span className="text-4xl font-heading text-primary">{nutrition.phase}</span>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Phase</p>
                </Card>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>Next: Update Progress <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-heading uppercase text-center">Capture Your Progress</h2>
              <p className="text-sm text-muted-foreground text-center">Take a fresh photo and update your measurements to see how far you've come.</p>
              <div className="grid gap-4">
                <Button variant="outline" className="h-16 gap-2" onClick={onPhotoUpload}><Camera className="h-5 w-5" /> Update Photo</Button>
                <DialogTrigger label="Update Measurements" icon={<Ruler className="h-5 w-5" />}>
                  <div className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {['waist', 'hips', 'chest', 'thigh', 'arm'].map(f => (
                        <div key={f} className="space-y-2">
                          <Label className="capitalize">{f} (cm)</Label>
                          <Input type="number" value={newMeasurement[f]} onChange={e => setNewMeasurement({...newMeasurement, [f]: e.target.value})} />
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" onClick={onAddMeasurement}>Save Measurements</Button>
                  </div>
                </DialogTrigger>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(3)}>Next: Set New Goal <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-heading uppercase text-center">Your Next Chapter</h2>
              <p className="text-sm text-muted-foreground text-center">Would you like to keep your current goal or focus on something new for the next 12 weeks?</p>
              <div className="grid gap-4">
                {['fat_loss', 'performance', 'health'].map(g => (
                  <Button key={g} variant={newGoal === g ? 'default' : 'outline'} className="h-16 justify-between px-6" onClick={() => setNewGoal(g)}>
                    <span className="capitalize font-bold">{g.replace('_', ' ')}</span>
                    {newGoal === g && <Check className="h-5 w-5" />}
                  </Button>
                ))}
              </div>
            </div>

            {!nutrition?.coached && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-center">Level up your next 12 weeks with 1-1 accountability.</p>
                  <Button variant="outline" className="w-full text-xs h-8" onClick={recordCoachingInterest}>
                    Learn about 1-1 Coaching
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button className="w-full bg-primary text-primary-foreground h-14 text-lg font-bold uppercase" onClick={() => onComplete(newGoal)}>Start New Season</Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function DialogTrigger({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>{icon} {label}</Button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-heading uppercase">{label}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><Plus className="h-6 w-6 rotate-45" /></Button>
            </CardHeader>
            <div>{children}</div>
          </Card>
        </div>
      )}
    </>
  );
}
