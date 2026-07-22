import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AppLayout } from "./components/AppLayout";
import Workouts from "./pages/Workouts";
import Exercises from "./pages/Exercises";
import Progress from "./pages/Progress";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import Education from "./pages/Education";
import Nutrition from "./pages/Nutrition";
import TVDisplay from "./pages/TVDisplay";

import { useEffect, useState } from "react";
import { syncFromSupabase, syncProfile } from "./lib/store";
import { supabase } from "./lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigationType } from "react-router-dom";

const queryClient = new QueryClient();

const TAB_ROUTES = ["/", "/workouts", "/progress", "/nutrition", "/feed", "/profile"];

const AppRoutes = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const [prevLocation, setPrevLocation] = useState(location.pathname);

  useEffect(() => {
    setPrevLocation(location.pathname);
  }, [location.pathname]);

  const isTabSwitch = TAB_ROUTES.includes(prevLocation) && TAB_ROUTES.includes(location.pathname);
  const isBack = navType === "POP";

  const variants: any = {
    initial: (custom: any) => {
      if (custom.isTabSwitch) return { opacity: 0, x: 0, zIndex: 1 };
      if (custom.isBack) return { x: "-20%", opacity: 0.5, zIndex: 1 };
      return { x: "100%", opacity: 1, zIndex: 3 };
    },
    animate: (custom: any) => ({ 
      x: 0, 
      opacity: 1, 
      zIndex: custom.isBack ? 1 : (custom.isTabSwitch ? 2 : 3), 
      transition: { duration: 0.25, ease: "easeOut" } 
    }),
    exit: (custom: any) => {
      if (custom.isTabSwitch) return { opacity: 0, x: 0, zIndex: 1, transition: { duration: 0.2 } };
      if (custom.isBack) return { x: "100%", opacity: 1, zIndex: 3, transition: { duration: 0.25, ease: "easeIn" } };
      return { x: "-20%", opacity: 0.5, zIndex: 1, transition: { duration: 0.25, ease: "easeIn" } };
    }
  };

  return (
    <AppLayout>
      <AnimatePresence custom={{ isBack, isTabSwitch }}>
        <motion.div
          key={location.pathname}
          custom={{ isBack, isTabSwitch }}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+64px)] bg-background"
        >
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/education" element={<Education />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/tv/:programId/:workoutIndex" element={<TVDisplay />} />
            <Route path="/auth/callback" element={<Index />} />
            <Route path="/auth/confirm" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
};

const AppContent = () => {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const storedUid = localStorage.getItem('fittrack_current_uid');
        if (storedUid && storedUid !== session.user.id) {
          // Clear user-specific cache
          localStorage.removeItem('fittrack_history');
          localStorage.removeItem('fittrack_active_program');
          localStorage.removeItem('fittrack_bodyweight');
          localStorage.removeItem('fittrack_active_workout');
          localStorage.removeItem('fittrack_prs');
        }
        localStorage.setItem('fittrack_current_uid', session.user.id);
        
        syncFromSupabase();
        syncProfile();
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('fittrack_current_uid');
        localStorage.removeItem('fittrack_history');
        localStorage.removeItem('fittrack_active_program');
        localStorage.removeItem('fittrack_bodyweight');
        localStorage.removeItem('fittrack_active_workout');
        localStorage.removeItem('fittrack_prs');
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

const App = () => <AppContent />;

export default App;
