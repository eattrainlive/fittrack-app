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

const CK = "etl_parq_ok_until"; // cached "valid until" ISO per uid, so we don't
// re-query on every navigation / reload (that made the app feel slow).

const readCache = (uid: string): boolean => {
  try {
    const raw = localStorage.getItem(`${CK}:${uid}`);
    return !!raw && new Date(raw).getTime() > Date.now();
  } catch {
    return false;
  }
};
const writeCache = (uid: string, expiresAt: string | null) => {
  try {
    if (expiresAt) localStorage.setItem(`${CK}:${uid}`, expiresAt);
  } catch {
    /* ignore */
  }
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

/**
 * Hard gate: a member with no valid PAR-Q sees the full-screen ParqForm instead
 * of the app. Staff are exempt; a few routes (auth, kiosk, TV) bypass it.
 *
 * Resilient by design: the check runs ONCE (not per navigation), is cached until
 * the PAR-Q expiry, and is wrapped in a short timeout. On any slowness/error it
 * FAILS OPEN (renders the app) so a slow Supabase can never hang everyone behind
 * a spinner.
 */
export function ParqGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await withTimeout(supabase.auth.getUser(), 4000);
        if (!user) {
          if (!cancelled) setState("valid"); // no session → let auth render
          return;
        }
        if (isStaff() || readCache(user.id)) {
          if (!cancelled) setState("valid");
          return;
        }
        const st = await withTimeout(getMyParqStatus(), 4000);
        if (st.valid) writeCache(user.id, st.expiresAt);
        if (!cancelled) setState(st.valid ? "valid" : "invalid");
      } catch {
        // Timeout / network error — fail OPEN so the app never hangs on a blip.
        if (!cancelled) setState("valid");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-check only on explicit reload (after submit), NOT on every navigation.
  }, [reloadTick]);

  // Allowed routes always render, regardless of gate state.
  if (isAllowedRoute(pathname)) return <>{children}</>;

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
          setState("loading");
          setReloadTick((t) => t + 1);
        }}
      />
    );
  }
  return <>{children}</>;
}
