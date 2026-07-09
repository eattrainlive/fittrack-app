import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getCommunityFeed, getExercises } from "@/lib/store";

const Feed = () => {
  const [feed, setFeed] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);

  useEffect(() => {
    setFeed(getCommunityFeed());
    setExercises(getExercises());
  }, []);

  const getExerciseName = (id: string) => {
    const ex = exercises.find(e => e.id === id || e.name === id);
    return ex ? ex.name : id;
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Community Feed</h2>
      </div>

      <div className="space-y-6">
        {feed.map((post) => (
          <Card key={post.id} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground font-heading">
                  {post.user.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none">{post.user.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(post.date).toLocaleDateString()} at {new Date(post.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-xl font-heading tracking-wide mb-4">{post.workoutName}</h3>
              <div className="space-y-2">
                {post.exercises?.map((ex: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="font-medium">{getExerciseName(ex.name)}</span>
                    <span className="text-muted-foreground">
                      {ex.sets} sets × {ex.reps} reps {ex.weight > 0 ? `@ ${ex.weight}kg` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex gap-4 pt-4 border-t border-border/50">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                <Heart className="h-4 w-4" /> {post.likes > 0 && post.likes}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                <MessageCircle className="h-4 w-4" /> {post.comments > 0 && post.comments}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary ml-auto">
                <Share2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {feed.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No activity yet. Be the first to log a workout!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
