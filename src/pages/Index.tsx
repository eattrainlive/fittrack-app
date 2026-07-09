import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Flame, TrendingUp, Users, Scale } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { useEffect, useState } from "react";
import { getWorkoutHistory, getBodyweightHistory } from "@/lib/store";
import { format, subDays, isSameDay } from "date-fns";

const Index = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [bodyweight, setBodyweight] = useState<any[]>([]);

  const loadData = () => {
    setHistory(getWorkoutHistory());
    setBodyweight(getBodyweightHistory());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('fittrack_synced', loadData);
    return () => window.removeEventListener('fittrack_synced', loadData);
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

  // Active minutes (assuming ~45 mins per workout if not specified)
  const activeMinutes = history.reduce((sum, w) => sum + (w.duration || 45), 0);

  // Weekly Activity Chart Data (last 7 days)
  const weeklyData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayWorkouts = history.filter(w => isSameDay(new Date(w.date), d));
    const duration = dayWorkouts.reduce((sum, w) => sum + (w.duration || 45), 0);
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

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Dashboard</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">Lifetime sessions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Minutes</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMinutes}</div>
            <p className="text-xs text-muted-foreground">Total time trained</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStreak} days</div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Lifted</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">Lifetime volume</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWeight} kg</div>
            <p className="text-xs text-muted-foreground">Latest log</p>
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
            <div className="h-[300px] w-full">
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
              {bwData.length > 0 ? (
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
              {recentWorkouts.length > 0 ? recentWorkouts.map((workout, i) => (
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{workout.name || "Workout"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(workout.date), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm flex flex-col items-end">
                    <span>{workout.duration || 45} min</span>
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
