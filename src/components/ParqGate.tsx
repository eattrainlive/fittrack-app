import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { ParqForm } from "./ParqForm";
import { getMyParqStatus } from "@/lib/parq";
import { isStaff } from "@/lib/communityWall";
import { supabase } from "@/lib/supabase";

/** Routes that bypass the PAR-Q gate (not a member "using the app"). */
const ALLOWED_PREFIXES = [
  "/auth",
  "/reset-password",
  "/checkin",
  "/tv/",
  "/schedule",
  // Public exercise/machine demo pages reached by scanning the QR codes in the
  // gym. These aren't a member "using the app to train" — they just play a demo
  // video and handle signed-out state themselves — so they must never be gated
  // behind the PAR-Q form (a signed-in member without a valid PAR-Q was getting
  // the medical form instead of the demo).
  "/x/",
  "/machine/",
];

const isAllowedRoute = (pathname: string) =>
  ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

/** Resolve the current user id with a 4s timeout (never hang the app). */
async function getUserWithTimeout(): Promise<string | null> {
  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve("__timeout__"), 4000),
  );
  try {
    const res = (await Promise.race([supabase.auth.getUser(), timeout])) as any;
    if (res === "__timeout__") return "__timeout__";
    return res?.data?.user?.id ?? null;
  } catch {
    return "__timeout__";
  }
}

/** Cache key for a valid PAR-Q so reloads skip the query. */
const cacheKey = (uid: string) => `etl_parq_ok_until:${uid}`;

function readCache(uid: string): boolean {
  try {
    const val = localStorage.getItem(cacheKey(uid));
    if (!val) return false;
    return Number(val) > Date.now();
  } catch {
    return false;
  }
}

function writeCache(uid: string, expiresAt: string) {
  try {
    localStorage.setItem(cacheKey(uid), String(new Date(expiresAt).getTime()));
  } catch {
    /* ignore */
  }
}

function clearCache(uid: string) {
  try {
    localStorage.removeItem(cacheKey(uid));
  } catch {
    /* ignore */
  }
}

/** Fetch PAR-Q status with a 4s timeout (never hang the app). */
async function parqStatusWithTimeout(
  uid: string,
): Promise<"valid" | "invalid" | "timeout"> {
  if (readCache(uid)) return "valid";
  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), 4000),
  );
  try {
    const st = (await Promise.race([getMyParqStatus(), timeout])) as any;
    if (st === "timeout") return "timeout";
    if (st?.valid && st?.expiresAt) {
      writeCache(uid, st.expiresAt);
      return "valid";
    }
    return "invalid";
  } catch {
    return "timeout";
  }
}

/**
 * Hard gate: wraps the routed app. A member with no valid PAR-Q (missing or
 * >12 months old) sees the full-screen ParqForm instead of the app. Staff are
 * exempt, and a small set of routes (auth, kiosk, TV) bypass the gate.
 *
 * Runs the check ONCE (not on every navigation) and caches a valid result in
 * localStorage until expiry. On timeout or any error it fails OPEN — never
 * leave the app stuck on the gate spinner.
 */
export function ParqGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [reloadTick, setReloadTick] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
        const uid = await getUserWithTimeout();
        if (cancelled) return;
        if (!uid) {
          // No session — let the auth flow render.
          if (!cancelled) setState("valid");
          return;
        }
        if (uid === "__timeout__") {
          // Auth check timed out — fail open.
          if (!cancelled) setState("valid");
          return;
        }
        if (isStaff()) {
          if (!cancelled) setState("valid");
          return;
        }
        // Check cache first (instant on reload).
        if (readCache(uid)) {
          if (!cancelled) setState("valid");
          return;
        }
        const result = await parqStatusWithTimeout(uid);
        if (cancelled) return;
        if (result === "timeout") {
          // Network error / timeout — fail OPEN (never lock a member out).
          setState("valid");
          return;
        }
        if (result === "valid") setState("valid");
        else setState("invalid");
      } catch {
        // Any unexpected error — fail OPEN.
        if (!cancelled) setState("valid");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Check ONCE (or after a submit bump). NOT on every pathname change.
  }, [reloadTick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (allowed) return <>{children}</>;
  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Re-run the gate check after submit (clears stale cache so it re-queries).
  const handleDone = () => {
    try {
      const u = localStorage.getItem("fittrack_current_uid");
      if (u) clearCache(u);
    } catch {
      /* ignore */
    }
    setShowForm(false);
    setState("loading");
    setReloadTick((t) => t + 1);
  };

  // A member without a valid PAR-Q can still USE the app — we never take the
  // screen over. Instead we show a dismissible prompt; tapping it opens the
  // form (which has its own close button), so no one can get stuck on it.
  return (
    <>
      {children}

      {state === "invalid" && showForm && (
        <ParqForm
          softFail
          onDone={handleDone}
          onClose={() => setShowForm(false)}
        />
      )}

      {state === "invalid" && !showForm && !dismissed && (
        <div className="fixed bottom-16 left-0 right-0 z-[60] px-3 pb-2">
          <div className="mx-auto max-w-md rounded-xl border border-primary/30 bg-background shadow-lg p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">
                Complete your health check
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                A quick PAR-Q keeps you training safely.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 bg-primary text-primary-foreground text-sm font-bold rounded-lg px-3 py-2"
            >
              Fill in
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
