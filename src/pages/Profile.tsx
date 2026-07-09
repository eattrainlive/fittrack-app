import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, LogOut, CloudUpload, CloudDownload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { migrateLocalToSupabase, syncFromSupabase } from "@/lib/store";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("John Doe");
  const [passcode, setPasscode] = useState("");
  const [isStaff, setIsStaff] = useState(() => localStorage.getItem("fittrack_is_staff") === "true");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setName(user.user_metadata?.full_name || "John Doe");
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const [isMigrating, setIsMigrating] = useState(false);
  const handleMigrate = async () => {
    setIsMigrating(true);
    const success = await migrateLocalToSupabase();
    setIsMigrating(false);
    if (success) toast.success("Data migrated to Supabase successfully!");
    else toast.error("Failed to migrate data. Make sure you are logged in and tables exist.");
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    const success = await syncFromSupabase();
    setIsSyncing(false);
    if (success) {
      toast.success("Data synced from Supabase!");
      window.location.reload();
    } else {
      toast.error("Failed to sync data.");
    }
  };

  const handleUnlockStaff = () => {
    if (passcode === "STAFF123") {
      localStorage.setItem("fittrack_is_staff", "true");
      setIsStaff(true);
      toast.success("Staff access unlocked!");
      setPasscode("");
      // Refresh to update sidebar
      window.dispatchEvent(new Event("storage"));
      window.location.reload();
    } else {
      toast.error("Incorrect passcode");
    }
  };

  const handleLockStaff = () => {
    localStorage.removeItem("fittrack_is_staff");
    setIsStaff(false);
    toast.success("Staff access locked.");
    window.dispatchEvent(new Event("storage"));
    window.location.reload();
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider font-bold">Profile Settings</h2>
        <Button variant="destructive" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">Personal Information</CardTitle>
            <CardDescription>Update your personal details and measurements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Button variant="outline">Change Photo</Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || "john@example.com"} disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" defaultValue="82" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input id="height" type="number" defaultValue="180" />
                </div>
              </div>
            </div>

            <Button className="w-full gap-2 text-primary-foreground font-bold">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wider">Coaching & Privacy</CardTitle>
              <CardDescription>Manage who can see your workout data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label className="text-base">Share Data with Coaches</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow affiliated gym coaches to view your progress and prescribe programs.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label className="text-base">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other members see your achievements and PRs.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wider">Data Sync</CardTitle>
              <CardDescription>Sync your local data to the cloud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleMigrate} 
                disabled={isMigrating}
                className="w-full gap-2"
              >
                <CloudUpload className="h-4 w-4" />
                {isMigrating ? "Migrating..." : "Push Local Data to Cloud"}
              </Button>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                variant="outline"
                className="w-full gap-2"
              >
                <CloudDownload className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Pull Data from Cloud"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wider">Staff Access</CardTitle>
              <CardDescription>Manage staff privileges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isStaff ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-sm text-primary">
                    Staff access is currently active. You can access the Staff Hub from the sidebar.
                  </div>
                  <Button onClick={handleLockStaff} variant="outline" className="w-full">
                    Lock Staff Access
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="passcode">Staff Passcode</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="passcode" 
                      type="password" 
                      placeholder="Enter passcode"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                    />
                    <Button onClick={handleUnlockStaff}>Unlock</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
