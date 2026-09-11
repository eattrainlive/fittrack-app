import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Folder, Video, Plus, Trash2 } from "lucide-react";
import {
  getEducationFolders,
  saveEducationFolders,
  getEducationVideos,
  saveEducationVideos,
} from "@/lib/store";
import { getEmbedUrl } from "@/lib/utils";

const Education = () => {
  const [folders, setFolders] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);

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
    window.addEventListener("fittrack_synced", loadData);
    return () => window.removeEventListener("fittrack_synced", loadData);
  }, []);

  const handleAddFolder = () => {
    if (!newFolderName) return;
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      description: newFolderDesc,
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveEducationFolders(updated);
    setNewFolderName("");
    setNewFolderDesc("");
    setIsAddFolderOpen(false);
  };

  const handleDeleteFolder = (id: string) => {
    const updated = folders.filter((f) => f.id !== id);
    setFolders(updated);
    saveEducationFolders(updated);
    const updatedVids = videos.filter((v) => v.folderId !== id);
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
      description: newVideoDesc,
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
    const updated = videos.filter((v) => v.id !== id);
    setVideos(updated);
    saveEducationVideos(updated);
  };

  const openAddVideo = (folder: any) => {
    setSelectedFolder(folder);
    setIsAddVideoOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider">Education Hub</h2>
        {isStaff && (
          <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Folder Name</label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Nutrition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="What's in this folder?"
                  />
                </div>
                <Button onClick={handleAddFolder} className="w-full">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {folders.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => {
            const folderVids = videos.filter((v) => v.folderId === folder.id);
            return (
              <Card key={folder.id} className="overflow-hidden flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="font-heading tracking-wide text-lg">
                          {folder.name}
                        </CardTitle>
                        {folder.description && (
                          <CardDescription className="mt-1">
                            {folder.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {folderVids.length} video
                      {folderVids.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardHeader>
                <div className="px-6 pb-6 space-y-3 flex-1">
                  {folderVids.length > 0 ? (
                    folderVids.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center justify-between gap-2 border border-border rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Video className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm truncate">
                            {video.title}
                          </span>
                        </div>
                        {isStaff && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 h-7 w-7"
                            onClick={() => handleDeleteVideo(video.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No videos in this folder yet.
                    </p>
                  )}
                </div>
                {isStaff && (
                  <div className="px-6 pb-6 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 flex-1"
                      onClick={() => openAddVideo(folder)}
                    >
                      <Plus className="h-4 w-4" /> Add Video
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteFolder(folder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No folders created yet.</p>
        </div>
      )}

      {isStaff && (
        <Dialog open={isAddVideoOpen} onOpenChange={setIsAddVideoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Video to {selectedFolder?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Video Title</label>
                <Input
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  placeholder="e.g. How to use the Leg Press"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vimeo URL</label>
                <Input
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://vimeo.com/..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea
                  value={newVideoDesc}
                  onChange={(e) => setNewVideoDesc(e.target.value)}
                  placeholder="Brief description of the video"
                />
              </div>
              <Button onClick={handleAddVideo} className="w-full">
                Add Video
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Education;
