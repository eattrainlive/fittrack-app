// Staff: manage a member's alternate emails so Evolt scans (and anything keyed
// on email) still match when they used a different address elsewhere.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { staffName } from "@/components/staffHubShared";
import {
  listMemberEmails,
  addMemberEmail,
  removeMemberEmail,
  type MemberEmail,
} from "@/lib/evoltScans";

export function LinkedEmailsCard({ userId }: { userId: string }) {
  const [emails, setEmails] = useState<MemberEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEmails(await listMemberEmails(userId));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const e = value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return toast.error("Enter a valid email");
    setSaving(true);
    const r = await addMemberEmail(userId, e, undefined, staffName() || "Staff");
    setSaving(false);
    if (r.ok) {
      setValue("");
      load();
    } else toast.error(r.error?.includes("duplicate") ? "That email is already linked to someone" : r.error || "Couldn't add");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Mail className="h-4 w-4" /> Linked emails
      </p>
      <p className="text-[11px] text-muted-foreground">
        Add other addresses this member has used (e.g. for Evolt scans or GymOS) so their data matches.
      </p>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          {emails.length > 0 && (
            <div className="space-y-1">
              {emails.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{m.email}</span>
                  <button className="text-muted-foreground" onClick={() => removeMemberEmail(m.id).then(load)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="another@email.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              className="h-9"
            />
            <Button size="sm" className="gap-1 shrink-0" disabled={saving} onClick={add}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default LinkedEmailsCard;
