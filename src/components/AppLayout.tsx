import { Dumbbell, LayoutDashboard, LineChart, User, Users, Bell, LogIn, Download, Loader2, Apple, CloudOff, Cloud, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getNotifications, markNotificationRead, subscribeSyncStatus, getSyncStatus, flushRetryQueue, type SyncStatus } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { downloadSourceCode } from "@/lib/download";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(() => localStorage.getItem("fittrack_is_staff") === "true");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [syncStatus, setSyncStatusLocal] = useState<SyncStatus>(getSyncStatus());

  const handleDownloadSource = () => {
    downloadSourceCode(setIsZipping);
  };

  const loadNotifications = async () => {
    const data = await getNotifications();
    if (Array.isArray(data)) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadNotifications();
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadNotifications();
      setIsAuthLoading(false);
    });

    const handleStorage = () => setIsStaff(localStorage.getItem("fittrack_is_staff") === "true");
    window.addEventListener("storage", handleStorage);

    // Subscribe to sync status updates
    const unsubSync = subscribeSyncStatus(setSyncStatusLocal);

    // Flush any queued writes on mount
    flushRetryQueue();
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      subscription.unsubscribe();
      unsubSync();
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast.success("Desktop notifications enabled!");
        }
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const isAuthPage = location.pathname === "/auth";
  const isTVMode = location.pathname.startsWith("/tv/");

  useEffect(() => {
    if (!isAuthLoading && !user && !isAuthPage && !isTVMode) {
      navigate("/auth");
    }
  }, [user, isAuthLoading, isAuthPage, isTVMode, navigate]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthPage || isTVMode) {
    return <div className="min-h-screen bg-background font-sans">{children}</div>;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-background font-sans flex-col overflow-hidden">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-30 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <span className="font-heading text-xl text-foreground uppercase tracking-wider mt-1">FitTrack</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync status indicator */}
          {user && syncStatus !== 'idle' && (
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
              syncStatus === 'saving' ? 'text-muted-foreground' :
              syncStatus === 'saved' ? 'text-primary' :
              'text-destructive'
            }`}>
              {syncStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {syncStatus === 'saved' && <CheckCircle2 className="h-3 w-3" />}
              {syncStatus === 'error' && (
                <button onClick={() => flushRetryQueue()} className="flex items-center gap-1 hover:underline" title="Click to retry">
                  <CloudOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Save failed — retry</span>
                </button>
              )}
              <span className="hidden sm:inline">
                {syncStatus === 'saving' && 'Saving…'}
                {syncStatus === 'saved' && 'Saved'}
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadSource} disabled={isZipping} className="gap-2 hidden sm:flex border-primary text-primary hover:bg-primary/10">
            {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Source
          </Button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                  Notifications
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={requestNotificationPermission}>
                    Enable Desktop
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n: any) => (
                      <DropdownMenuItem 
                        key={n.id} 
                        className={`flex flex-col items-start p-3 gap-1 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                        onClick={() => handleMarkRead(n.id)}
                      >
                        <div className="flex justify-between w-full items-start">
                          <span className="font-bold text-sm">{n.title}</span>
                          {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-muted-foreground/60">{new Date(n.created_at).toLocaleDateString()}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {!user && location.pathname !== "/auth" && (
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="gap-2">
              <LogIn className="h-4 w-4" /> Login
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex items-center justify-around pb-[env(safe-area-inset-bottom)] h-[calc(env(safe-area-inset-bottom)+64px)] select-none">
        <NavItem to="/" icon={<LayoutDashboard className="h-6 w-6" />} label="Home" active={location.pathname === "/"} />
        <NavItem to="/workouts" icon={<Dumbbell className="h-6 w-6" />} label="Workouts" active={location.pathname === "/workouts"} />
        <NavItem to="/progress" icon={<LineChart className="h-6 w-6" />} label="Progress" active={location.pathname === "/progress"} />
        <NavItem to="/nutrition" icon={<Apple className="h-6 w-6" />} label="Nutrition" active={location.pathname === "/nutrition"} />
        <NavItem to="/feed" icon={<Users className="h-6 w-6" />} label="Feed" active={location.pathname === "/feed"} />
        <NavItem to="/profile" icon={<User className="h-6 w-6" />} label="Profile" active={location.pathname === "/profile"} />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-full h-16 gap-1 ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
