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
import TVDisplay from "./pages/TVDisplay";

import { useEffect } from "react";
import { syncFromSupabase, syncProfile } from "./lib/store";
import { supabase } from "./lib/supabase";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncFromSupabase();
        syncProfile();
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/education" element={<Education />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/tv/:programId/:workoutIndex" element={<TVDisplay />} />
            <Route path="/auth/callback" element={<Index />} />
            <Route path="/auth/confirm" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

const App = () => <AppContent />;

export default App;
