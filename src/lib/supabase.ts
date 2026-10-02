import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://juvofqqtvakltlwqqhkn.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1dm9mcXF0dmFrbHRsd3FxaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MDI2MzksImV4cCI6MjA5OTA3ODYzOX0.C_AcKvcPAJvq8oOC4CmfDIiYgNmtSp6XSAiK6iuBkTg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // localStorage (NOT sessionStorage) so the session survives the app
    // being closed and reopened — fixes unexpected logouts in the PWA.
    storage: window.localStorage,
    storageKey: "fittrack-auth",
  },
});
