// Staff Hub → "Payment issues" panel. Lists members whose membership payment
// failed or whose Direct Debit mandate was cancelled, so Carla can follow each
// one up (one-tap WhatsApp via the existing GHL pipe) and mark it resolved. Flags
// come from the GymOS webhook automatically; a manual add covers anything missed.
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Ban,
  Check,
  Loader2,
  MessageCircle,
  Copy,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePaymentFlags,
  ISSUE_TEMPLATES,
  searchRosterMembers,
  type PaymentFlag,
  type IssueType,
} from "@/lib/paymentFlags";

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fmtGBP = (n: number | null) =>
  n == null ? null : `£${n.toFixed(2)}`;

function IssueBadge({ type }: { type: IssueType }) {
  const t = ISSUE_TEMPLATES[type];
  const cls =
    t.tone === "red"
      ? "bg-red-500/15 text-red-700 dark:text-red-400"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  const Icon = type === "payment_failed" ? CreditCard : Ban;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" /> {t.label}
    </span>
  );
}

function FlagRow({
  f,
  onSend,
  onResolve,
}: {
  f: PaymentFlag;
  onSend: (f: PaymentFlag) => Promise<boolean>;
  onResolve: (f: PaymentFlag) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"send" | "resolve" | null>(null);
  const tpl = ISSUE_TEMPLATES[f.issue_type];
  const msg = tpl.message(f.full_name || "");

  const send = async () => {
    if (!f.email) {
      toast.error("No email on file — can't send. Add their details in GymOS first.");
      return;
    }
    setBusy("send");
    const ok = await onSend(f);
    setBusy(null);
    ok ? toast.success("WhatsApp sent") : toast.error("Couldn't send — try again");
  };
  const resolve = async () => {
    setBusy("resolve");
    const ok = await onResolve(f);
    setBusy(null);
    if (!ok) toast.error("Couldn't update");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Message copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">
              {f.full_name || f.email || "Unknown member"}
            </span>
            <IssueBadge type={f.issue_type} />
            {f.whatsapp_sent && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> contacted
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {fmtDate(f.last_event_ts)}
            {fmtGBP(f.amount) ? ` · ${fmtGBP(f.amount)}` : ""}
            {f.source === "manual" ? " · added manually" : ""}
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Toggle details"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap">
          {msg}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={send} disabled={busy !== null} className="gap-1 h-8">
          {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
          {f.whatsapp_sent ? "Send again" : "Send WhatsApp"}
        </Button>
        <Button size="sm" variant="outline" onClick={copy} className="gap-1 h-8">
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={resolve} disabled={busy !== null} className="gap-1 h-8 ml-auto text-emerald-700 dark:text-emerald-400">
          {busy === "resolve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Resolved
        </Button>
      </div>
    </div>
  );
}

function ManualAdd({
  onAdd,
}: {
  onAdd: (a: {
    member_ref: string;
    email: string | null;
    full_name: string | null;
    issue_type: IssueType;
  }) => Promise<boolean>;
}) {
  const [show, setShow] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<
    { id: string; email: string | null; full_name: string | null }[]
  >([]);
  const [picked, setPicked] = useState<
    { id: string; email: string | null; full_name: string | null } | null
  >(null);
  const [issue, setIssue] = useState<IssueType>("payment_failed");
  const [busy, setBusy] = useState(false);

  const run = async (v: string) => {
    setQ(v);
    setPicked(null);
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    setResults(await searchRosterMembers(v));
  };

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    const ok = await onAdd({
      member_ref: picked.id,
      email: picked.email,
      full_name: picked.full_name,
      issue_type: issue,
    });
    setBusy(false);
    if (ok) {
      toast.success("Flag added");
      setShow(false);
      setQ("");
      setResults([]);
      setPicked(null);
    } else {
      toast.error("Couldn't add");
    }
  };

  if (!show) {
    return (
      <Button size="sm" variant="outline" onClick={() => setShow(true)} className="gap-1 h-8">
        <Plus className="h-3.5 w-3.5" /> Add manually
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Flag a member manually</span>
        <button onClick={() => setShow(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => run(e.target.value)}
          placeholder="Search name or email…"
          className="pl-7 h-8 text-sm"
        />
      </div>
      {!picked && results.length > 0 && (
        <div className="max-h-40 overflow-auto rounded-md border border-border/60 divide-y divide-border/40">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setPicked(r);
                setResults([]);
                setQ(r.full_name || r.email || "");
              }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
            >
              <div className="truncate">{r.full_name || "(no name)"}</div>
              <div className="text-[11px] text-muted-foreground truncate">{r.email}</div>
            </button>
          ))}
        </div>
      )}
      {picked && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={issue}
            onChange={(e) => setIssue(e.target.value as IssueType)}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="payment_failed">Payment failed</option>
            <option value="mandate_cancelled">Mandate cancelled</option>
          </select>
          <Button size="sm" onClick={add} disabled={busy} className="gap-1 h-8">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add flag
          </Button>
        </div>
      )}
    </div>
  );
}

export function PaymentIssuesPanel() {
  const { open, resolved, loading, error, sendWhatsApp, markResolved, reopen, addManualFlag } =
    usePaymentFlags();
  const [showResolved, setShowResolved] = useState(false);

  const counts = useMemo(() => {
    const failed = open.filter((f) => f.issue_type === "payment_failed").length;
    const mandate = open.filter((f) => f.issue_type === "mandate_cancelled").length;
    return { failed, mandate };
  }, [open]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <div className="font-semibold text-sm">Payment issues</div>
              <div className="text-[11px] text-muted-foreground">
                {counts.failed} failed · {counts.mandate} mandate cancelled
              </div>
            </div>
          </div>
          <ManualAdd onAdd={addManualFlag} />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {error} — has the SQL been run?
          </p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            🎉 No open payment issues. Nice and clean.
          </p>
        ) : (
          <div className="space-y-2">
            {open.map((f) => (
              <FlagRow key={f.id} f={f} onSend={sendWhatsApp} onResolve={markResolved} />
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowResolved((s) => !s)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:underline"
            >
              {showResolved ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
            </button>
            {showResolved && (
              <div className="space-y-1 mt-2">
                {resolved.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-xs border-b border-border/40 py-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="flex-1 truncate">{f.full_name || f.email}</span>
                    <IssueBadge type={f.issue_type} />
                    <button onClick={() => reopen(f)} className="text-[10px] text-muted-foreground hover:underline shrink-0">
                      reopen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentIssuesPanel;
