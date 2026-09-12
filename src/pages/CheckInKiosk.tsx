import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScanLine,
  Search,
  ArrowLeft,
  Clock,
  Camera,
  Keyboard,
} from "lucide-react";

const STAFF_SECRET =
  import.meta.env.VITE_STAFF_SECRET ||
  "42a37f4a3f9ceed78d7928187bfc339d25af43d79d5fb0b0";

type CheckInResult = {
  result: "granted" | "denied_lapsed" | "unknown_code";
  name?: string;
  membership?: string;
  time?: string;
} | null;

type RecentCheckIn = {
  name: string;
  time: string;
  result: string;
};

type InputMode = "camera" | "scanner";

export default function CheckInKiosk() {
  const [user, setUser] = useState<any>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [inputMode, setInputMode] = useState<InputMode>(
    () => (localStorage.getItem("checkin_input_mode") as InputMode) || "camera",
  );
  const [scanValue, setScanValue] = useState("");
  const [result, setResult] = useState<CheckInResult>(null);
  const [processing, setProcessing] = useState(false);
  const [recent, setRecent] = useState<RecentCheckIn[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const [manualMembers, setManualMembers] = useState<any[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5ScannerRef = useRef<any>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({
    code: "",
    at: 0,
  });

  // Auth gate — staff only
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsStaff(localStorage.getItem("fittrack_is_staff") === "true");
      setAuthChecked(true);
    });
  }, []);

  const switchInputMode = (m: InputMode) => {
    localStorage.setItem("checkin_input_mode", m);
    setInputMode(m);
    setCameraError(false);
  };

  // ── Camera scanning (BarcodeDetector + html5-qrcode fallback) ─────────────
  useEffect(() => {
    if (mode !== "scan" || result || processing) return;
    if (inputMode !== "camera") return;

    let stopped = false;
    let raf: number;

    const onScan = (value: string) => {
      const code = String(value || "").trim();
      if (!code) return;
      // Debounce: ignore the same code for 12s
      const now = Date.now();
      if (
        lastScanRef.current.code === code &&
        now - lastScanRef.current.at < 12000
      ) {
        return;
      }
      lastScanRef.current = { code, at: now };
      doCheckIn({ code, method: "scan" });
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(videoRef.current!);
              if (codes?.length) onScan(codes[0].rawValue);
            } catch {
              /* ignore frame errors */
            }
            raf = requestAnimationFrame(
              () => setTimeout(tick, 250) as unknown as number,
            );
          };
          tick();
        } else {
          // Fallback: html5-qrcode
          const { Html5Qrcode } = await import("html5-qrcode");
          if (stopped) return;
          const containerId = "html5-qrcode-container";
          let el = document.getElementById(containerId);
          if (!el) {
            el = document.createElement("div");
            el.id = containerId;
            el.style.display = "none";
            document.body.appendChild(el);
          }
          const scanner = new Html5Qrcode(containerId, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
          });
          html5ScannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => onScan(decodedText),
            () => {},
          );
        }
      } catch (e) {
        setCameraError(true);
      }
    })();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      // Stop camera stream
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      // Stop html5-qrcode
      if (html5ScannerRef.current) {
        try {
          html5ScannerRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                html5ScannerRef.current?.clear();
              } catch {}
              html5ScannerRef.current = null;
            });
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, result, processing, inputMode]);

  // Keep the HID input focused (only in scanner mode)
  const refocus = useCallback(() => {
    if (mode === "scan" && inputMode === "scanner" && !result && !processing) {
      scanInputRef.current?.focus();
    }
  }, [mode, inputMode, result, processing]);

  useEffect(() => {
    refocus();
    const interval = setInterval(refocus, 1000);
    return () => clearInterval(interval);
  }, [refocus]);

  // Load recent check-ins
  const loadRecent = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("scan_events")
        .select(
          "id, result, method, created_at, gym_member_id, gym_members(full_name, email)",
        )
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) {
        setRecent(
          data.map((r: any) => ({
            name: r.gym_members?.full_name || "Member",
            time: new Date(r.created_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            result: r.result,
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isStaff) loadRecent();
  }, [isStaff, loadRecent]);

  const doCheckIn = async (payload: any) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-in", {
        body: {
          staffSecret: STAFF_SECRET,
          ...payload,
          site: "main",
          deviceId: "reception-tablet",
        },
      });
      if (error) throw error;
      setResult(data);
      if (data?.name) {
        setRecent((prev) =>
          [
            {
              name: data.name,
              time:
                data.time ||
                new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              result: data.result,
            },
            ...prev,
          ].slice(0, 10),
        );
      }
      resultTimerRef.current = setTimeout(() => {
        setResult(null);
        setScanValue("");
        setProcessing(false);
      }, 3000);
    } catch (e: any) {
      setResult({
        result: "unknown_code",
        name: "Error",
        membership: e.message || "Check-in failed",
      });
      resultTimerRef.current = setTimeout(() => {
        setResult(null);
        setScanValue("");
        setProcessing(false);
      }, 3000);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code || processing) return;
    lastScanRef.current = { code, at: Date.now() };
    doCheckIn({ code, method: "scan" });
  };

  // Manual member search
  const searchMembers = async (q: string) => {
    setManualQuery(q);
    if (q.trim().length < 2) {
      setManualMembers([]);
      return;
    }
    setManualLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: { action: "list", staffSecret: STAFF_SECRET },
        },
      );
      if (error) throw error;
      const members = (data?.members || []).filter((m: any) => {
        const name = String(m.name || m.full_name || "").toLowerCase();
        const email = String(m.email || "").toLowerCase();
        return (
          name.includes(q.toLowerCase()) || email.includes(q.toLowerCase())
        );
      });
      setManualMembers(members.slice(0, 20));
    } catch {
      setManualMembers([]);
    } finally {
      setManualLoading(false);
    }
  };

  const handleManualPick = (member: any) => {
    doCheckIn({ manualUserId: member.id, method: "manual" });
    setManualQuery("");
    setManualMembers([]);
    setMode("scan");
  };

  // ── Loading / auth gate ──────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="font-heading text-2xl uppercase">Sign in required</p>
        <a
          href="/auth?redirect=/checkin"
          className="bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center gap-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <p className="font-heading text-2xl uppercase">Staff only</p>
        <p className="text-sm text-muted-foreground">
          This kiosk is for staff use.
        </p>
        <a
          href="/"
          className="bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3"
        >
          Back to app
        </a>
      </div>
    );
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    const isGranted = result.result === "granted";
    const isUnknown = result.result === "unknown_code";
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-8 ${
          isGranted
            ? "bg-primary/10"
            : isUnknown
              ? "bg-destructive/10"
              : "bg-amber-500/10"
        }`}
        onClick={() => {
          if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
          setResult(null);
          setScanValue("");
          setProcessing(false);
        }}
      >
        {isGranted ? (
          <CheckCircle2 className="h-32 w-32 text-primary mb-6" />
        ) : isUnknown ? (
          <XCircle className="h-32 w-32 text-destructive mb-6" />
        ) : (
          <AlertTriangle className="h-32 w-32 text-amber-500 mb-6" />
        )}
        <p
          className={`font-heading text-4xl uppercase tracking-wider mb-2 ${
            isGranted
              ? "text-primary"
              : isUnknown
                ? "text-destructive"
                : "text-amber-600"
          }`}
        >
          {isGranted
            ? "Checked in"
            : isUnknown
              ? "Not recognised"
              : "See coach"}
        </p>
        {result.name && result.name !== "Error" && (
          <p className="text-2xl font-bold text-foreground mb-1">
            {result.name}
          </p>
        )}
        {result.membership && (
          <p className="text-lg text-muted-foreground mb-1">
            {result.membership}
          </p>
        )}
        {result.time && (
          <p className="text-sm text-muted-foreground">{result.time}</p>
        )}
        {!isGranted && (
          <p className="text-sm text-muted-foreground mt-4 max-w-sm text-center">
            {isUnknown
              ? "Code not recognised — try manual check-in"
              : "Membership not active — please see a coach"}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-8">Tap to continue</p>
      </div>
    );
  }

  // ── Manual search mode ────────────────────────────────────────────────────
  if (mode === "manual") {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setMode("scan");
              setManualQuery("");
              setManualMembers([]);
            }}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="font-heading text-2xl uppercase">Check in manually</h1>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => searchMembers(e.target.value)}
            placeholder="Search by name or email…"
            autoFocus
            className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {manualLoading && (
          <p className="text-muted-foreground text-sm">Searching…</p>
        )}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {manualMembers.map((m: any) => (
            <button
              key={m.id}
              onClick={() => handleManualPick(m)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 text-left active:scale-[0.99] transition"
            >
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary text-lg">
                  {String(m.name || m.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground truncate">
                  {m.name || m.email}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {m.email}
                  {m.membership ? ` · ${m.membership}` : ""}
                </p>
              </div>
            </button>
          ))}
          {!manualLoading &&
            manualQuery.length >= 2 &&
            manualMembers.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                No members found
              </p>
            )}
        </div>
      </div>
    );
  }

  // ── Scan mode (default kiosk) ──────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-between p-6"
      onClick={() => {
        if (inputMode === "scanner") scanInputRef.current?.focus();
      }}
    >
      {/* Hidden input that captures HID scanner keystrokes (scanner mode) */}
      <form onSubmit={handleScanSubmit} className="sr-only">
        <input
          ref={scanInputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit">submit</button>
      </form>

      {/* Header */}
      <div className="text-center pt-8 w-full">
        <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <ScanLine className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-heading text-3xl uppercase tracking-wider text-foreground">
          Check in
        </h1>
        <p className="text-muted-foreground mt-1">
          {inputMode === "camera"
            ? "Hold your QR code to the camera"
            : "Scan a member's QR code"}
        </p>

        {/* Input-mode toggle */}
        <div className="inline-flex items-center gap-1 mt-3 bg-muted rounded-full p-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              switchInputMode("camera");
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${
              inputMode === "camera"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Camera className="h-4 w-4" /> Camera
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              switchInputMode("scanner");
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition ${
              inputMode === "scanner"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Keyboard className="h-4 w-4" /> Scanner
          </button>
        </div>
      </div>

      {/* Scan target visual */}
      <div className="flex-1 flex items-center justify-center w-full">
        {inputMode === "camera" ? (
          <div className="relative w-72 h-72 rounded-3xl overflow-hidden border-4 border-primary/30 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Framing guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-2xl" />
            </div>
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4 text-center gap-2">
                <Camera className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Camera unavailable.
                </p>
                <p className="text-xs text-muted-foreground">
                  Enable camera permission, or switch to Scanner / Manual.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-64 h-64 border-4 border-dashed border-primary/30 rounded-3xl flex items-center justify-center">
            <QRCodeSVG
              value="ready"
              size={120}
              bgColor="transparent"
              fgColor="hsl(var(--muted-foreground))"
              level="L"
              className="opacity-30"
            />
          </div>
        )}
      </div>

      {/* Bottom: manual button + recent check-ins */}
      <div className="w-full max-w-md space-y-4 pb-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMode("manual");
          }}
          className="w-full bg-card border border-border rounded-xl py-4 font-bold text-foreground flex items-center justify-center gap-2 active:scale-[0.99] transition"
        >
          <Search className="h-5 w-5" />
          Check in manually
        </button>

        {recent.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recent check-ins
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {recent.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-foreground">{r.name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        r.result === "granted"
                          ? "bg-primary"
                          : r.result === "unknown_code"
                            ? "bg-destructive"
                            : "bg-amber-500"
                      }`}
                    />
                    <span className="text-muted-foreground text-xs">
                      {r.time}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
