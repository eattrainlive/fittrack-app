import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Dumbbell, LayoutDashboard, LineChart, List, User, Shield, Users, BookOpen, Bell, LogIn, Download, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getNotifications, markNotificationRead } from "@/lib/store";
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

  const handleDownloadSource = () => {
    downloadSourceCode(setIsZipping);
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
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      subscription.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

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
  
  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Community", icon: Users, url: "/feed" },
    { title: "Workouts", icon: Dumbbell, url: "/workouts" },
    { title: "Exercises", icon: List, url: "/exercises" },
    { title: "Progress", icon: LineChart, url: "/progress" },
    { title: "Education", icon: BookOpen, url: "/education" },
    { title: "Profile", icon: User, url: "/profile" },
    ...(isStaff ? [{ title: "Staff Hub", icon: Shield, url: "/admin" }] : []),
  ];

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
    <SidebarProvider>
      <AppLayoutInner
        user={user}
        isStaff={isStaff}
        notifications={notifications}
        unreadCount={unreadCount}
        isZipping={isZipping}
        handleDownloadSource={handleDownloadSource}
        handleMarkRead={handleMarkRead}
        requestNotificationPermission={requestNotificationPermission}
      >
        {children}
      </AppLayoutInner>
    </SidebarProvider>
  );
}

function AppLayoutInner({
  children,
  user,
  isStaff,
  notifications,
  unreadCount,
  isZipping,
  handleDownloadSource,
  handleMarkRead,
  requestNotificationPermission,
}: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Community", icon: Users, url: "/feed" },
    { title: "Workouts", icon: Dumbbell, url: "/workouts" },
    { title: "Exercises", icon: List, url: "/exercises" },
    { title: "Progress", icon: LineChart, url: "/progress" },
    { title: "Education", icon: BookOpen, url: "/education" },
    { title: "Profile", icon: User, url: "/profile" },
    ...(isStaff ? [{ title: "Staff Hub", icon: Shield, url: "/admin" }] : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      <Sidebar variant="sidebar" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <span className="font-heading text-3xl text-sidebar-foreground uppercase tracking-wider mt-1">FitTrack</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-xs font-bold tracking-widest">Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.url} onClick={() => setOpenMobile(false)}>
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="text-base font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-heading text-xl text-foreground uppercase tracking-wider mt-1">FitTrack</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
