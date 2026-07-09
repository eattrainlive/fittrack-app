import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Folder, Video, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { getEducationFolders, saveEducationFolders, getEducationVideos, saveEducationVideos } from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";

const Education = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [isStaff, setIsStaff] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);

  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoDesc, setNewVideoDesc] = useState("");
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);

  useEffect(() => {
    const loadData = () => {
      setFolders(getEducationFolders());
      setVideos(getEducationVideos());
      setIsStaff(localStorage.getItem("fittrack_is_staff") === "true");
    };
    loadData();
    window.addEventListener('fittrack_synced', loadData);
    return () => window.removeEventListener('fittrack_synced', loadData);
  }, []);

  const handleAddFolder = () => {
    if (!newFolderName) return;
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      description: newFolderDesc
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveEducationFolders(updated);
    setNewFolderName("");
    setNewFolderDesc("");
    setIsAddFolderOpen(false);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = folders.filter(f => f.id !== id);
    setFolders(updated);
    saveEducationFolders(updated);
    // Also delete videos in folder
    const updatedVids = videos.filter(v => v.folderId !== id);
    setVideos(updatedVids);
    saveEducationVideos(updatedVids);
  };

  const handleAddVideo = () => {
    if (!newVideoTitle || !newVideoUrl || !selectedFolder) return;
    const newVideo = {
      id: Date.now().toString(),
      folderId: selectedFolder.id,
      title: newVideoTitle,
      url: newVideoUrl,
      description: newVideoDesc
    };
    const updated = [...videos, newVideo];
    setVideos(updated);
    saveEducationVideos(updated);
    setNewVideoTitle("");
    setNewVideoUrl("");
    setNewVideoDesc("");
    setIsAddVideoOpen(false);
  };

  const handleDeleteVideo = (id: string) => {
    const updated = videos.filter(v => v.id !== id);
    setVideos(updated);
    saveEducationVideos(updated);
  };

  const folderVideos = videos.filter(v => v.folderId === selectedFolder?.id);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFolder(null)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          <h2 className="text-4xl font-heading tracking-wider font-bold">
            {selectedFolder ? selectedFolder.name : "Education Hub"}
          </h2>
        </div>
        
        {!selectedFolder && isStaff && (
          <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Folder</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Folder Name</label>
                  <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Nutrition" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={newFolderDesc} onChange={e => setNewFolderDesc(e.target.value)} placeholder="What's in this folder?" />
                </div>
                <Button onClick={handleAddFolder} className="w-full">Create Folder</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {selectedFolder && isStaff && (
          <Dialog open={isAddVideoOpen} onOpenChange={setIsAddVideoOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Video</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Video to {selectedFolder.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Title</label>
                  <Input value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} placeholder="e.g. How to use the Leg Press" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vimeo URL</label>
                  <Input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="https://vimeo.com/..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Textarea value={newVideoDesc} onChange={e => setNewVideoDesc(e.target.value)} placeholder="Brief description of the video" />
                </div>
                <Button onClick={handleAddVideo} className="w-full">Add Video</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map(folder => (
            <Card key={folder.id} className="cursor-pointer hover:border-primary transition-colors group relative" onClick={() => setSelectedFolder(folder)}>
              <CardHeader>
                <Folder className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="font-heading tracking-wide text-2xl">{folder.name}</CardTitle>
                <CardDescription>{folder.description}</CardDescription>
              </CardHeader>
              {isStaff && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
          {folders.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No folders created yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground">{selectedFolder.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {folderVideos.map(video => (
              <Card key={video.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video w-full bg-muted">
                  <iframe 
                    src={getEmbedUrl(video.url)} 
                    className="w-full h-full" 
                    frameBorder="0" 
                    allow="autoplay; fullscreen; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-heading tracking-wide text-xl">{video.title}</CardTitle>
                      {video.description && <CardDescription className="mt-2">{video.description}</CardDescription>}
                    </div>
                    {isStaff && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2" onClick={() => handleDeleteVideo(video.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          {folderVideos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No videos in this folder yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Education;