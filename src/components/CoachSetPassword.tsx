// Staff-only: set or reset a member's password directly (for people who can't
// use the email reset flow). Calls the manage-members edge function, which does
// the update with the service role — the password never hits any table and the
// staff member's own session is untouched.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { setMemberPassword } from "@/lib/memberAccessActions";

export function CoachSetPassword({
  staffSecret,
  authId,
  email,
}: {
  staffSecret: string;
  authId: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const gen = () => {
    // Readable temporary password: Etl-xxxx-9999
    const r = Math.random().toString(36).slice(2, 6);
    const n = Math.floor(1000 + Math.random() * 9000);
    setPw(`Etl-${r}-${n}`);
    setDone(false);
  };

  const save = async () => {
    if (pw.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await setMemberPassword(staffSecret, authId, pw.trim(), email);
      setDone(true);
      toast.success("Password set — share it with the member");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't set password");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          setOpen(true);
          gen();
        }}
      >
        <KeyRound className="h-4 w-4" /> Set / reset password
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <Label className="text-xs flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" /> Set a password for this member
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setDone(false);
          }}
          placeholder="New password"
          className="h-9 font-mono"
        />
        <Button variant="ghost" size="sm" onClick={gen} className="shrink-0">
          Generate
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={saving}
          onClick={save}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : done ? (
            <Check className="h-4 w-4" />
          ) : null}
          {done ? "Set" : "Save password"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            navigator.clipboard?.writeText(pw);
            toast.success("Copied");
          }}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">
        Give this password to the member so they can log in with their email, then
        they can change it in their profile. Nothing is stored in plain text.
      </p>
    </div>
  );
}
