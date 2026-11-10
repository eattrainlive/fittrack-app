// Staff Hub — Fault / equipment report centre. Log broken kit (title, location,
// severity, optional photo) and track it open → in progress → fixed. Open tickets
// surface on the Today feed until resolved.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Wrench,
  Camera,
  X,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { EmptyState, staffName, fmtDateTime } from "@/components/staffHubShared";
import {
  listFaults,
  createFault,
  setFaultStatus,
  uploadFaultPhoto,
  SEVERITY_LABEL,
  STATUS_LABEL,
  type Fault,
  type FaultSeverity,
  type FaultStatus,
} from "@/lib/equipmentFaults";

const SEVERITIES: FaultSeverity[] = ["low", "medium", "high", "out_of_order"];
const sevStyle: Record<FaultSeverity, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  out_of_order: "bg-red-500/10 text-red-700 dark:text-red-400",
};
const statusStyle: Record<FaultStatus, string> = {
  open: "border-red-400/60",
  in_progress: "border-amber-400/60",
  fixed: "border-emerald-400/50 opacity-70",
};

export function FaultReportCentre() {
  const [faults, setFaults] = useState<Fault[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFixed, setShowFixed] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFaults(await listFaults(true));
    } catch (e: any) {
      toast.error("Couldn't load the fault board");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const visible = faults.filter((f) => (showFixed ? true : f.status !== "fixed"));
  const openCount = faults.filter((f) => f.status !== "fixed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Fault reports
          </h2>
          <p className="text-sm text-muted-foreground">
            {openCount} open {openCount === 1 ? "ticket" : "tickets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFixed((v) => !v)}>
            {showFixed ? "Hide fixed" : "Show fixed"}
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" /> Log a fault
          </Button>
        </div>
      </div>

      {adding && (
        <FaultForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading faults…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState text="No faults logged. Everything's in working order ✅" />
      ) : (
        <div className="space-y-2">
          {visible.map((f) => (
            <FaultCard key={f.id} f={f} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function FaultForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState<FaultSeverity>("medium");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Give the fault a title");
      return;
    }
    setSaving(true);
    try {
      let photo_url: string | null = null;
      if (file) {
        try {
          photo_url = await uploadFaultPhoto(file);
        } catch {
          toast.error("Photo upload failed — logging without it");
        }
      }
      const r = await createFault({
        title,
        location,
        severity,
        notes,
        photo_url,
        reported_by: staffName() || "Staff",
      });
      if (r.ok) {
        toast.success("Fault logged");
        onDone();
      } else {
        toast.error(r.error || "Couldn't save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Input
        placeholder="What's broken? e.g. Treadmill 3 — belt slipping"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as FaultSeverity)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        placeholder="Any detail that helps whoever fixes it (optional)"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" /> {file ? "Change photo" : "Add photo"}
        </Button>
        {preview && (
          <div className="relative">
            <img src={preview} alt="" className="h-14 w-14 rounded object-cover" />
            <button
              onClick={() => pick(null)}
              className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 gap-1" disabled={saving} onClick={submit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Log fault
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function FaultCard({ f, onChange }: { f: Fault; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  const move = async (status: FaultStatus) => {
    setBusy(true);
    const r = await setFaultStatus(f.id, status, staffName() || "Staff");
    setBusy(false);
    if (r.ok) onChange();
    else toast.error(r.error || "Couldn't update");
  };

  return (
    <div className={`rounded-xl border bg-card p-3 ${statusStyle[f.status]}`}>
      <div className="flex gap-3">
        {f.photo_url && (
          <img src={f.photo_url} alt="" className="h-16 w-16 rounded object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{f.title}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${sevStyle[f.severity]}`}>
              {SEVERITY_LABEL[f.severity]}
            </span>
            {f.status === "out_of_order" && <AlertOctagon className="h-3.5 w-3.5 text-red-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {f.location ? `${f.location} · ` : ""}
            {f.reported_by ? `logged by ${f.reported_by} · ` : ""}
            {fmtDateTime(f.created_at)}
          </p>
          {f.notes && <p className="text-xs mt-1">{f.notes}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[11px] text-muted-foreground mr-auto">{STATUS_LABEL[f.status]}</span>
        {f.status === "open" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => move("in_progress")}>
            Start fixing
          </Button>
        )}
        {f.status !== "fixed" ? (
          <Button size="sm" className="gap-1" disabled={busy} onClick={() => move("fixed")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark fixed
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => move("open")}>
            Reopen
          </Button>
        )}
      </div>
    </div>
  );
}

export default FaultReportCentre;
