import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, UserPlus, Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  member: {
    id: string;
    email: string;
    full_name?: string;
    product?: string | null;
    membership?: string | null;
    onApp?: boolean;
    invitedPending?: boolean;
    notInvited?: boolean;
    invited_at?: string | null;
  };
  staffSecret: string;
  defaultAccess: string[];
  onInvited?: () => void;
}

/** Sensible default access per membership bucket. */
export function accessForProduct(product?: string | null): string[] {
  const s = (product || "").toLowerCase();
  if (/trial/.test(s)) return ["Foundations", "Stronger", "Group PT"];
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s))
    return ["Stronger", "Performance", "Group PT"];
  if (/team\s*training|classes?/.test(s)) return ["Fusion", "Group PT"];
  if (/core|open\s*gym|24\s*hour|gym\s*member/.test(s))
    return ["Foundations", "Stronger"];
  return ["Foundations", "Stronger", "Fusion", "Performance", "Group PT"];
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

/**
 * Status badge + Invite/Reinvite button for a member card.
 * Shows On app (green), Invited — not joined (blue), or Not on app (amber).
 */
export function MemberAppStatus({
  member,
  staffSecret,
  defaultAccess,
  onInvited,
}: Props) {
  const [sending, setSending] = useState(false);
  const [justInvited, setJustInvited] = useState(false);

  const onApp = !!member.onApp;
  const invitedPending = !!member.invitedPending;

  const handleInvite = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: {
            action: "invite",
            name: member.full_name || member.email,
            email: member.email,
            allowed: defaultAccess,
            staffSecret,
          },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setJustInvited(true);
      onInvited?.();
    } catch (e: any) {
      console.error("Invite failed", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {onApp ? (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
          <CheckCircle2 className="h-3 w-3" /> On app
        </Badge>
      ) : invitedPending || justInvited ? (
        <>
          <Badge className="gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[11px] font-semibold">
            <Clock className="h-3 w-3" /> Invited — not joined
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            disabled={sending}
            onClick={handleInvite}
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            Reinvite
          </Button>
        </>
      ) : (
        <>
          <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold">
            <UserPlus className="h-3 w-3" /> Not on app
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            disabled={sending}
            onClick={handleInvite}
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            Invite
          </Button>
        </>
      )}
      {(invitedPending || justInvited) &&
        (member.invited_at || justInvited) && (
          <span className="text-[10px] text-muted-foreground">
            {justInvited ? "just now" : `invited ${fmtDate(member.invited_at)}`}
          </span>
        )}
    </div>
  );
}
