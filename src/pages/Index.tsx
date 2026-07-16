import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Flame, TrendingUp, Users, Scale, Play } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { useEffect, useState } from "react";
import { getWorkoutHistory, getBodyweightHistory, getActiveProgram } from "@/lib/store";
import { format, subDays, isSameDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [bodyweight, setBodyweight] = useState<any[]>([]);
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    setHistory(getWorkoutHistory());
    setBodyweight(getBodyweightHistory());
    setActiveProgram(getActiveProgram());
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "there");
    }
  };

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setIsLoading(false), 600);
    
    const handleSync = () => {
      loadData();
      setIsLoading(false);
    };

    window.addEventListener('fittrack_synced', handleSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('fittrack_synced', handleSync);
    };
  }, []);

  // Calculate metrics
  const totalWorkouts = history.length;
  
  // Volume
  const totalVolume = history.reduce((sum, w) => sum + (w.volume || 0), 0);
  
  // Calculate streak
  let currentStreak = 0;
  let currentDate = new Date();
  
  // Sort history by date descending
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedHistory.length > 0) {
    const lastWorkoutDate = new Date(sortedHistory[0].date);
    // If the last workout was today or yesterday, we might have a streak
    const diffDays = Math.floor((currentDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      currentStreak = 1;
      let checkDate = lastWorkoutDate;
      
      for (let i = 1; i < sortedHistory.length; i++) {
        const prevDate = new Date(sortedHistory[i].date);
        const dayDiff = Math.floor((checkDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          currentStreak++;
          checkDate = prevDate;
        } else if (dayDiff === 0) {
          // Same day, ignore
          continue;
        } else {
          break; // Streak broken
        }
      }
    }
  }

  // Active minutes
  const activeMinutes = history.reduce((sum, w) => sum + (w.duration || 0), 0);

  // Weekly Activity Chart Data (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayWorkouts = history.filter(w => isSameDay(new Date(w.date), d));
    const duration = dayWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    return {
      name: format(d, 'EEE'),
      duration,
      workouts: dayWorkouts.length
    };
  });

  // Recent Workouts
  const recentWorkouts = sortedHistory.slice(0, 4);

  // Bodyweight chart data
  const bwData = [...bodyweight].filter(b => b.weight !== undefined).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7).map(b => ({
    name: format(new Date(b.date), 'MMM d'),
    weight: b.weight
  }));

  const currentWeight = bwData.length > 0 ? bwData[bwData.length - 1].weight : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 pb-24">
      <div className="flex flex-col space-y-1 mb-6">
        <h2 className="text-3xl font-heading tracking-wider font-bold uppercase">
          {getGreeting()}, {userName || "there"}
        </h2>
        <p className="text-muted-foreground">Ready to crush your goals today?</p>
      </div>

      {/* Active Program / Today's Workout */}
      {activeProgram ? (() => {
        const localToday = () => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };
        const today = localToday();
        const dated = activeProgram.workouts?.filter((c: any) => c.date) || [];
        
        let targetWorkout = activeProgram.workouts[activeProgram.currentIndex];
        let targetIndex = activeProgram.currentIndex;
        let isRestDay = false;
        
        if (dated.length > 0) {
          const todays = dated.filter((c: any) => c.date === today);
          if (todays.length > 0) {
            targetWorkout = todays[0];
            targetIndex = activeProgram.workouts.indexOf(todays[0]);
          } else {
            isRestDay = true;
          }
        }

        return (
          <Card className="bg-card border-border shadow-md overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardHeader className="pb-3">
              <CardDescription className="text-primary font-bold uppercase tracking-wider text-xs">Up Next</CardDescription>
              <CardTitle className="font-heading text-2xl tracking-wider uppercase">
                {activeProgram.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {isRestDay ? (
                  <p className="font-bold text-lg">Rest Day</p>
                ) : (
                  <p className="font-bold text-lg">{targetWorkout?.name}</p>
                )}
                {!isRestDay && <p className="text-sm text-muted-foreground">Workout {targetIndex + 1} of {activeProgram.workouts.length}</p>}
              </div>
              <Button onClick={() => navigate('/workouts')} className="w-full gap-2 font-bold tracking-wide h-14 text-lg rounded-xl">
                <Play className="h-5 w-5 fill-current" /> {isRestDay ? "View Programme" : "Start Workout"}
              </Button>
            </CardContent>
          </Card>
        );
      })() : (
        <Card className="bg-card border-border shadow-md overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-muted"></div>
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-xl tracking-wider uppercase text-muted-foreground">No Active Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Browse the library to find your next program or start a quick workout.</p>
            <Button onClick={() => navigate('/workouts')} variant="outline" className="w-full gap-2 font-bold tracking-wide h-12 rounded-xl">
              Browse Library
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-2xl font-bold">{totalWorkouts}</div>}
            {totalWorkouts === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">Log a session to start</p>
            ) : (
              <p className="text-xs text-muted-foreground">Lifetime sessions</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Minutes</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-2xl font-bold">{activeMinutes}</div>}
            {activeMinutes === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No time logged yet</p>
            ) : (
              <p className="text-xs text-muted-foreground">Total time trained</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-2xl font-bold">{currentStreak} days</div>}
            {currentStreak === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">Train today to start streak</p>
            ) : (
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Lifted</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24 mb-1" /> : <div className="text-2xl font-bold">{totalVolume.toLocaleString()} kg</div>}
            {totalVolume === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No volume logged</p>
            ) : (
              <p className="text-xs text-muted-foreground">Lifetime volume</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20 mb-1" /> : <div className="text-2xl font-bold">{currentWeight} kg</div>}
            {currentWeight === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No weight logged</p>
            ) : (
              <p className="text-xs text-muted-foreground">Latest log</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">Weekly Activity</CardTitle>
            <CardDescription>Your workout duration over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full p-4">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}m`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Area type="monotone" dataKey="duration" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorDuration)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-card border-border flex flex-col">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">Bodyweight Trend</CardTitle>
            <CardDescription>Recent weight logs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-[120px] w-full mb-6">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : bwData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bwData}>
                    <XAxis dataKey="name" hide />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No weight data logged</div>
              )}
            </div>
            
            <h3 className="font-heading text-xl tracking-wider mb-4">Recent Workouts</h3>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))
              ) : recentWorkouts.length > 0 ? recentWorkouts.map((workout, i) => (
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{workout.name || "Workout"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(workout.date), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm flex flex-col items-end">
                    <span>{workout.duration || 0} min</span>
                    {workout.volume > 0 && <span className="text-xs text-primary">{workout.volume.toLocaleString()} kg</span>}
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground text-sm py-4">No workouts logged yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
