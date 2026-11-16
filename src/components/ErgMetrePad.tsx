// Floating, no-typing metre logger for the TV / programme display. Add class
// ski/bike/row metres to the Million Metre total with buttons + a +/- stepper.
// Collapsed to a small corner pill by default so it never covers the programme.
import { useState } from "react";
import { Minus, Plus, X, Waves, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { logErgMetresCommunal, type ErgMachine } from "@/lib/ergChallenge";

const MACHINES: { key: ErgMachine; label: string }[] = [
  { key: "ski", label: "Ski" },
  { key: "bike", label: "Bike" },
  { key: "rower", label: "Row" },
];
const QUICK = [100, 250, 500, 1000];
const STEP = 100;
const clamp = (n: number) => Math.max(0, Math.min(100000, n));

export function ErgMetrePad() {
  const [open, setOpen] = useState(false);
  const [machine, setMachine] = useState<ErgMachine>("rower");
  const [amount, setAmount] = useState(500);
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);

  const add = async (n: number) => {
    const m = clamp(Math.floor(n));
    if (m <= 0) return;
    setBusy(true);
    const { error } = await logErgMetresCommunal(machine, m);
    setBusy(false);
    if (error) {
      toast.error("Couldn't add — try again");
      return;
    }
    setSession((s) => s + m);
    const lbl = MACHINES.find((x) => x.key === machine)?.label ?? machine;
    toast.success(`+${m.toLocaleString()} m ${lbl} → gym total`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-2xl hover:brightness-95"
      >
        <Waves className="h-4 w-4" /> Log metres
        {session > 0 && <span className="opacity-80">· {session.toLocaleString()} m</span>}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/20 bg-black/85 p-3 text-white shadow-2xl backdrop-blur space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Waves className="h-4 w-4" /> Log class metres
        </p>
        <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Machine */}
      <div className="grid grid-cols-3 gap-1.5">
        {MACHINES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMachine(m.key)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              machine === m.key ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Quick-add */}
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            disabled={busy}
            onClick={() => add(q)}
            className="rounded-lg bg-white/10 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-50"
          >
            +{q >= 1000 ? `${q / 1000}k` : q}
          </button>
        ))}
      </div>

      {/* Custom stepper */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAmount((a) => clamp(a - STEP))}
          className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
          aria-label="less"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold tabular-nums leading-none">{amount.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/60">metres</div>
        </div>
        <button
          onClick={() => setAmount((a) => clamp(a + STEP))}
          className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
          aria-label="more"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <button
        disabled={busy}
        onClick={() => add(amount)}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:brightness-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        <ChevronUp className="h-4 w-4" /> Add {amount.toLocaleString()} m
      </button>

      {session > 0 && (
        <p className="text-center text-[11px] text-white/70">
          Added this session: <span className="font-bold text-white">{session.toLocaleString()} m</span>
        </p>
      )}
    </div>
  );
}

export default ErgMetrePad;
