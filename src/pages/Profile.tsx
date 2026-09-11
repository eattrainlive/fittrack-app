import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Save,
  LogOut,
  CloudUpload,
  CloudDownload,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  migrateLocalToSupabase,
  syncFromSupabase,
  getPreferredDays,
  savePreferredDays,
  getMyGymMember,
  getBodyweightHistory,
  saveBodyweight,
} from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [isStaff, setIsStaff] = useState(
    () => localStorage.getItem("fittrack_is_staff") === "true",
  );
  const [preferredDays, setPreferredDays] = useState(3);
  const [gymMember, setGymMember] = useState<any | null>(null);

  useEffect(() => {
    setPreferredDays(getPreferredDays());
    const handleSync = () => setPreferredDays(getPreferredDays());
    window.addEventListener("fittrack_synced", handleSync);
    return () => window.removeEventListener("fittrack_synced", handleSync);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser(user);
        setName(user.user_metadata?.full_name || "");
        setHeight(
          user.user_metadata?.height_cm != null
            ? String(user.user_metadata.height_cm)
            : "",
        );
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        const bw = getBodyweightHistory();
        const latest = bw.length ? bw[bw.length - 1].weight : null;
        setWeight(latest != null ? String(latest) : "");
        const gm = await getMyGymMember();
        setGymMember(gm);
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
    await migrateLocalToSupabase();
    setIsMigrating(false);
    toast.success("Migration complete!");
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSync = async () => {
    setIsSyncing(true);
    await syncFromSupabase();
    setIsSyncing(false);
    toast.success("Data synced from Supabase!");
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim() || null,
          height_cm: height ? Number(height) : null,
        },
      });
      if (authErr) throw authErr;

      if (weight) {
        const w = Number(weight);
        if (!Number.isNaN(w) && w > 0) {
          const { success } = await saveBodyweight({ weight: w });
          if (!success) throw new Error("weight save failed");
        }
      }

      await savePreferredDays(preferredDays);
      toast.success("Profile updated");
    } catch (e) {
      console.error("profile save failed", e);
      toast.error("Couldn't save your profile — try again");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(fileName, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("images").getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl },
      });
      if (error) throw error;
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error("Photo upload failed: " + (err?.message ?? err));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleUnlockStaff = () => {
    if (passcode === "STAFF123") {
      localStorage.setItem("fittrack_is_staff", "true");
      setIsStaff(true);
      toast.success("Staff access unlocked!");
      setPasscode("");
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

  const initials =
    (name || "")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-4xl font-heading tracking-wider">
          Profile Settings
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/education")}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" /> Education
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-wider">
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details and measurements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Change photo"
                />
                <Button variant="outline" disabled={uploadingAvatar}>
                  {uploadingAvatar ? "Uploading…" : "Change Photo"}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredDays">
                Preferred Training Days (per week)
              </Label>
              <Select
                value={preferredDays.toString()}
                onValueChange={async (v) => {
                  const days = parseInt(v, 10);
                  setPreferredDays(days);
                  const { success } = await savePreferredDays(days);
                  if (success) toast.success("Training days updated");
                  else toast.error("Failed to update training days");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Days</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="4">4 Days</SelectItem>
                  <SelectItem value="5">5 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full gap-2 text-primary-foreground font-bold"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wider">
                Membership
              </CardTitle>
              <CardDescription>
                Your gym membership status, synced from GymOS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {gymMember ? (
                <>
                  <p className="text-sm">
                    Membership:{" "}
                    <span className="font-semibold text-primary">
                      {gymMember.status === "active"
                        ? "Active"
                        : gymMember.status}
                    </span>{" "}
                    — source GymOS
                  </p>
                  {gymMember.last_import_at && (
                    <p className="text-xs text-muted-foreground">
                      As of{" "}
                      {new Date(gymMember.last_import_at).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No gym membership linked yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-2xl tracking-wider">
                Coaching & Privacy
              </CardTitle>
              <CardDescription>
                Manage who can see your workout data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1">
                  <Label className="text-base">Share Data with Coaches</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow affiliated gym coaches to view your progress and
                    prescribe programs.
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
              <CardTitle className="font-heading text-2xl tracking-wider">
                Data Sync
              </CardTitle>
              <CardDescription>
                Sync your local data to the cloud.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="w-full gap-2"
              >
                <CloudUpload className="h-4 w-4" />
                {isMigrating ? "Migrating..." : "Push Local data to Cloud"}
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
              <CardTitle className="font-heading text-2xl tracking-wider">
                Staff Access
              </CardTitle>
              <CardDescription>Manage staff privileges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isStaff ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-sm text-primary">
                    Staff access is currently active.
                  </div>
                  <Button
                    onClick={() => navigate("/admin")}
                    className="w-full gap-2"
                  >
                    Open Staff Hub
                  </Button>
                  <Button
                    onClick={handleLockStaff}
                    variant="outline"
                    className="w-full"
                  >
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
