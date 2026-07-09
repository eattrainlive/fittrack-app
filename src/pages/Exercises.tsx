import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getExercises } from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";


const Exercises = () => {
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [equipmentFilter, setEquipmentFilter] = useState("All");

  useEffect(() => {
    setExerciseLibrary(getExercises());
  }, []);

  const uniqueMuscles = ["All", ...Array.from(new Set(exerciseLibrary.map(ex => ex.muscle))).filter(Boolean)];
  const uniqueEquipment = ["All", ...Array.from(new Set(exerciseLibrary.map(ex => ex.equipment))).filter(Boolean)];

  const filteredExercises = exerciseLibrary.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = muscleFilter === "All" || ex.muscle === muscleFilter;
    const matchesEquipment = equipmentFilter === "All" || ex.equipment === equipmentFilter;
    return matchesSearch && matchesMuscle && matchesEquipment;
  });

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Exercise Library</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            className="pl-8 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={muscleFilter} onValueChange={setMuscleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="Muscle Group" />
          </SelectTrigger>
          <SelectContent>
            {uniqueMuscles.map(m => (
              <SelectItem key={m} value={m}>{m === "All" ? "All Muscles" : m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            {uniqueEquipment.map(e => (
              <SelectItem key={e} value={e}>{e === "All" ? "All Equipment" : e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredExercises.map((exercise, i) => (
          <Card key={i} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{exercise.name}</CardTitle>
              <CardDescription>{exercise.muscle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-muted rounded-md">{exercise.equipment}</span>
                <span className="px-2 py-1 bg-muted rounded-md">{exercise.difficulty}</span>
              </div>
              
              {exercise.videoUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <PlayCircle className="h-4 w-4" /> Watch Tutorial
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="font-heading tracking-wider">{exercise.name} Tutorial</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-video mt-4 rounded-md overflow-hidden bg-muted">
                      <iframe 
                        src={getEmbedUrl(exercise.videoUrl)} 
                        className="w-full h-full" 
                        allow="autoplay; fullscreen; picture-in-picture" 
                        allowFullScreen
                      ></iframe>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Exercises;
