import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect } from "react";
import { getBodyweightHistory, saveBodyweight, getPersonalRecords, savePersonalRecord, deletePersonalRecord, getExercises } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Progress = () => {
  const [bodyweightData, setBodyweightData] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [newWaist, setNewWaist] = useState("");
  const [newArms, setNewArms] = useState("");
  const [newChest, setNewChest] = useState("");
  const [newLegs, setNewLegs] = useState("");
  const [prs, setPrs] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [newPrExercise, setNewPrExercise] = useState("");
  const [newPrWeight, setNewPrWeight] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      setBodyweightData(getBodyweightHistory());
      setPrs(getPersonalRecords());
      setExercises(getExercises());
    };
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

  const handleSaveMeasurements = async () => {
    const data: any = {};
    if (newWeight) data.weight = parseFloat(newWeight);
    if (newBodyFat) data.bodyFat = parseFloat(newBodyFat);
    if (newWaist) data.waist = parseFloat(newWaist);
    if (newArms) data.arms = parseFloat(newArms);
    if (newChest) data.chest = parseFloat(newChest);
    if (newLegs) data.legs = parseFloat(newLegs);

    if (Object.keys(data).length > 0) {
      const updatedHistory = await saveBodyweight(data);
      setBodyweightData(updatedHistory);
      setNewWeight("");
      setNewBodyFat("");
      setNewWaist("");
      setNewArms("");
      setNewChest("");
      setNewLegs("");
    }
  };

  const handleSavePr = () => {
    const weight = parseFloat(newPrWeight);
    if (newPrExercise && !isNaN(weight) && weight > 0) {
      const updatedPrs = savePersonalRecord(newPrExercise, weight);
      setPrs(updatedPrs);
      setNewPrWeight("");
      setNewPrExercise("");
    }
  };

  const handleDeletePr = (id: string) => {
    const updatedPrs = deletePersonalRecord(id);
    setPrs(updatedPrs);
  };

  const volumeData = [
    { name: "Week 1", volume: 10500 },
    { name: "Week 2", volume: 11200 },
    { name: "Week 3", volume: 10800 },
    { name: "Week 4", volume: 12450 },
  ];

  const oneRepMaxData = [
    { name: "Jan", bench: 80, squat: 100, deadlift: 120 },
    { name: "Feb", bench: 82.5, squat: 105, deadlift: 125 },
    { name: "Mar", bench: 85, squat: 110, deadlift: 130 },
    { name: "Apr", bench: 87.5, squat: 115, deadlift: 135 },
  ];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Progress Charts</h2>
        <Select defaultValue="month">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
            <SelectItem value="year">Past Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Charts & Bodyweight</TabsTrigger>
          <TabsTrigger value="prs">Personal Records</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-heading text-2xl tracking-wider">Total Volume</CardTitle>
            <CardDescription>Total weight lifted across all exercises</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full p-4">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                    />
                    <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">Estimated 1RM</CardTitle>
            <CardDescription>Estimated one-rep max for main lifts</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full p-4">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oneRepMaxData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line type="monotone" dataKey="bench" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    <Line type="monotone" dataKey="squat" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Line type="monotone" dataKey="deadlift" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ fill: 'hsl(var(--foreground))' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Bench Press</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                <span>Squat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-foreground"></div>
                <span>Deadlift</span>
              </div>
            </div>
          </CardContent>
        </Card>

          <Card className="bg-card border-border md:col-span-2">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="font-heading text-2xl tracking-wider">Body Measurements</CardTitle>
                <CardDescription>Track your weight and body measurements over time</CardDescription>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <Input 
                  type="number" 
                  placeholder="Weight (kg)" 
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
                <Input 
                  type="number" 
                  placeholder="Body Fat %" 
                  value={newBodyFat}
                  onChange={(e) => setNewBodyFat(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
                <Input 
                  type="number" 
                  placeholder="Waist (cm)" 
                  value={newWaist}
                  onChange={(e) => setNewWaist(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
                <Input 
                  type="number" 
                  placeholder="Arms (cm)" 
                  value={newArms}
                  onChange={(e) => setNewArms(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
                <Input 
                  type="number" 
                  placeholder="Chest (cm)" 
                  value={newChest}
                  onChange={(e) => setNewChest(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
                <Input 
                  type="number" 
                  placeholder="Legs (cm)" 
                  value={newLegs}
                  onChange={(e) => setNewLegs(e.target.value)}
                  className="bg-background"
                  step="0.1"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveMeasurements}>Log Measurements</Button>
              </div>
            </CardHeader>
            <CardContent className="pl-2 pt-4">
              <div className="h-[300px] w-full p-4">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bodyweightData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Line yAxisId="left" type="monotone" name="Weight (kg)" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 4 }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" name="Body Fat %" dataKey="bodyFat" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))', r: 3 }} />
                      <Line yAxisId="right" type="monotone" name="Waist (cm)" dataKey="waist" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ fill: 'hsl(var(--foreground))', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="prs" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-4">
              <div>
                <CardTitle className="font-heading text-2xl tracking-wider flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Personal Records
                </CardTitle>
                <CardDescription>Track your all-time best lifts</CardDescription>
              </div>
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Select value={newPrExercise?.toString() || ""} onValueChange={setNewPrExercise}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id?.toString()}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  placeholder="Weight (kg)" 
                  value={newPrWeight}
                  onChange={(e) => setNewPrWeight(e.target.value)}
                  className="w-24 bg-background"
                />
                <Button onClick={handleSavePr} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" /> Log PR
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {prs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No personal records logged yet.</p>
                  <p className="text-sm mt-1">Select an exercise and log your first PR above.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {prs.map((pr) => {
                    const exercise = exercises.find((e) => e.id === pr.exerciseId);
                    return (
                      <div key={pr.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50 group">
                        <div className="space-y-1">
                          <p className="font-medium">{exercise?.name || 'Unknown Exercise'}</p>
                          <p className="text-sm text-muted-foreground">{new Date(pr.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-heading font-bold text-primary">{pr.weight}kg</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeletePr(pr.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Progress;
