import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ParqForm } from "./ParqForm";
import { getMyParqStatus } from "@/lib/parq";
import { isStaff } from "@/lib/communityWall";
import { supabase } from "@/lib/supabase";

/** Routes that bypass the PAR-Q gate (not a member "using the app"). */
const ALLOWED_PREFIXES = ["/auth", "/reset-password", "/checkin", "/tv/"];

const isAllowedRoute = (pathname: string) =>
  ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

/**
 * Hard gate: wraps the routed app. A member with no valid PAR-Q (missing or
 * >12 months old) sees the full-screen ParqForm instead of the app. Staff are
 * exempt, and a small set of routes (auth, kiosk, TV) bypass the gate.
 *
 * On a status-check error (offline) it fails soft — shows the form but lets
 * the member skip so a network blip doesn't lock a paying member out.
 */
export function ParqGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [reloadTick, setReloadTick] = useState(0);

  const allowed = isAllowedRoute(pathname);

  useEffect(() => {
    if (allowed) {
      setState("valid");
      return;
    }
    let cancelled = false;
    (async () => {
      setState("loading");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          // No session — let the auth flow render.
          if (!cancelled) setState("valid");
          return;
        }
        if (isStaff()) {
          if (!cancelled) setState("valid");
          return;
        }
        const st = await getMyParqStatus();
        if (!cancelled) setState(st.valid ? "valid" : "invalid");
      } catch {
        // Network error — fail soft so we never hard-lock a paying member.
        if (!cancelled) setState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, allowed, reloadTick]);

  if (allowed) return <>{children}</>;
  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (state === "invalid") {
    return (
      <ParqForm
        softFail
        onDone={() => {
          // Re-run the gate check after submit / skip.
          setState("loading");
          setReloadTick((t) => t + 1);
        }}
      />
    );
  }
  return <>{children}</>;
}
