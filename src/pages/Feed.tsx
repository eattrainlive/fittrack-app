import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Send, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { getCommunityFeed, getExercises, saveCommunityPost, saveCommunityComment } from "@/lib/store";
import { toast } from "sonner";

const Feed = () => {
  const [feed, setFeed] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  
  // Staff Announcement State
  const isStaff = localStorage.getItem("fittrack_is_staff") === "true";
  const [announcementText, setAnnouncementText] = useState("");

  const loadFeed = () => {
    setFeed(getCommunityFeed());
    setExercises(getExercises());
  };

  useEffect(() => {
    loadFeed();
    window.addEventListener('fittrack_synced', loadFeed);
    return () => window.removeEventListener('fittrack_synced', loadFeed);
  }, []);

  const getExerciseName = (id: string) => {
    const ex = exercises.find(e => e.id === id || e.name === id);
    return ex ? ex.name : id;
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    
    saveCommunityComment({
      id: Date.now().toString(),
      postId,
      user: { name: "You", avatar: "Y" },
      text: commentText,
      date: new Date().toISOString()
    });
    
    setCommentText("");
    loadFeed();
    toast.success("Comment added");
  };

  const handlePostAnnouncement = () => {
    if (!announcementText.trim()) return;

    saveCommunityPost({
      id: "announcement-" + Date.now(),
      isAnnouncement: true,
      user: { name: "Staff", avatar: "S" },
      date: new Date().toISOString(),
      workoutName: "Announcement",
      text: announcementText,
      likes: 0,
      comments: 0
    });

    setAnnouncementText("");
    loadFeed();
    toast.success("Announcement posted");
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Community Feed</h2>
      </div>

      {isStaff && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Megaphone className="h-5 w-5" />
              <span>Post Announcement</span>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Write an announcement to the community..." 
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="resize-none mb-4"
            />
            <Button onClick={handlePostAnnouncement} className="w-full gap-2">
              <Send className="h-4 w-4" /> Post
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {feed.map((post) => (
          <Card key={post.id} className={`bg-card border-border ${post.isAnnouncement ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : ''}`}>
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Avatar>
                <AvatarFallback className={post.isAnnouncement ? "bg-primary text-primary-foreground font-heading" : "bg-muted text-muted-foreground font-heading"}>
                  {post.user.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none flex items-center gap-2">
                  {post.user.name}
                  {post.isAnnouncement && <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Staff</span>}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(post.date).toLocaleDateString()} at {new Date(post.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {post.isAnnouncement ? (
                <p className="text-lg whitespace-pre-wrap">{post.text}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-heading tracking-wide">{post.workoutName}</h3>
                    {post.reward && (
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                        <span className="text-xl">{post.reward.emoji}</span>
                        <span>{post.reward.count && post.reward.count > 1 ? `${post.reward.count.toLocaleString()} ` : ''}{post.reward.displayName || post.reward.name} ({post.volume?.toLocaleString()}kg)</span>
                      </div>
                    )}
                  </div>
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
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4 border-t border-border/50 items-start">
              <div className="flex w-full gap-4">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                  <Heart className="h-4 w-4" /> {post.likes > 0 && post.likes}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground hover:text-primary"
                  onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                >
                  <MessageCircle className="h-4 w-4" /> {post.commentsCount > 0 && post.commentsCount}
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary ml-auto">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {activeCommentPost === post.id && (
                <div className="w-full space-y-4 pt-4 border-t border-border/50">
                  {post.postComments?.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">{comment.user.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted/50 rounded-lg p-3 flex-1">
                        <p className="font-medium mb-1">{comment.user.name}</p>
                        <p className="text-muted-foreground">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-2 items-center pt-2">
                    <Input 
                      placeholder="Write a comment..." 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                    />
                    <Button size="icon" onClick={() => handleAddComment(post.id)}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
