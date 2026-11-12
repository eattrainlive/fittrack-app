// Contact hub — one place for all member outreach: trial nurture, member
// retention, a combined "waiting for reply" view, and a quick member lookup.
// Replaces hopping between the Call Lists tab and the Members engagement toggle.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Clock, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/staffHubShared";
import { StaffHubTab } from "@/components/StaffHubTab";
import { RetentionCockpit } from "@/components/RetentionCockpit";
import { MemberActivityModal } from "@/components/MemberActivityModal";
import { getNurtureBoard } from "@/lib/trialNurture";
import { getRetentionBoard } from "@/lib/retentionNurture";
import { loadRosterMembers } from "@/lib/rosterMembers";

type Section = "trials" | "members" | "waiting" | "find";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "trials", label: "Trials" },
  { key: "members", label: "Members" },
  { key: "waiting", label: "Waiting for reply" },
  { key: "find", label: "Find a member" },
];

export function ContactHub({ staffSecret }: { staffSecret: string }) {
  const [section, setSection] = useState<Section>("trials");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              section === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "trials" && <StaffHubTab staffSecret={staffSecret} />}
      {section === "members" && <RetentionCockpit staffSecret={staffSecret} />}
      {section === "waiting" && <WaitingCombined staffSecret={staffSecret} />}
      {section === "find" && <FindMember staffSecret={staffSecret} />}
    </div>
  );
}

// ── Combined "waiting for reply" across trials + members ─────────────────────
interface WaitRow {
  name: string;
  email: string;
  kind: "Trial" | "Member";
}
function WaitingCombined({ staffSecret }: { staffSecret: string }) {
  const [rows, setRows] = useState<WaitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      const [trial, retention] = await Promise.all([
        getNurtureBoard().catch(() => null),
        getRetentionBoard(staffSecret).catch(() => ({ members: [] as any[] })),
      ]);
      const out: WaitRow[] = [];
      for (const t of trial?.waiting ?? [])
        out.push({ name: t.name || t.email, email: t.email, kind: "Trial" });
      for (const m of (retention?.members ?? []) as any[])
        if (m.awaitingReply) out.push({ name: m.name || m.email, email: m.email, kind: "Member" });
      if (live) {
        setRows(out);
        setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [staffSecret]);

  if (loading)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  if (rows.length === 0) return <EmptyState text="Nobody's mid-conversation right now ✅" />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> {rows.length} messaged and awaiting a reply
      </p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-400/60 bg-card p-3">
          <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{r.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
          </div>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
            {r.kind}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Quick member lookup → open their activity/scan/PB profile ────────────────
function FindMember({ staffSecret }: { staffSecret: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { members } = await loadRosterMembers(staffSecret);
      setMembers(members);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return members
      .filter(
        (m) =>
          String(m.full_name || "").toLowerCase().includes(t) ||
          String(m.email || "").toLowerCase().includes(t),
      )
      .slice(0, 20);
  }, [members, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search a member by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
        </div>
      ) : q.trim() === "" ? (
        <p className="text-xs text-muted-foreground">Start typing to find anyone and open their profile.</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">No members match "{q}".</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((m) => (
            <button
              key={m.id || m.email}
              onClick={() => {
                setSelected(m);
                setOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition"
            >
              <span className="font-medium">{m.full_name || m.email}</span>
              {m.full_name && m.email && (
                <span className="ml-1.5 text-[11px] text-muted-foreground">· {m.email}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <MemberActivityModal
        member={selected}
        staffSecret={staffSecret}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export default ContactHub;
