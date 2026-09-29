import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MailCheck, CheckCircle2 } from "lucide-react";
import type { RosterMember } from "@/lib/rosterStatus";

interface Props {
  member: RosterMember;
  onInvite?: (member: RosterMember) => void;
  busy?: boolean;
}

export function MemberAppStatusBadge({ member, onInvite, busy }: Props) {
  if (member.appStatus === "onApp") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold"
      >
        <CheckCircle2 className="h-3 w-3" /> On app
      </Badge>
    );
  }
  if (member.appStatus === "invited") {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge
          variant="secondary"
          className="gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[11px] font-semibold"
        >
          <Mail className="h-3 w-3" /> Invited
        </Badge>
        {onInvite && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px] gap-1"
            disabled={busy}
            onClick={() => onInvite(member)}
          >
            <MailCheck className="h-3 w-3" /> Reinvite
          </Button>
        )}
      </div>
    );
  }
  // notInvited
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Badge
        variant="secondary"
        className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold"
      >
        Not on app
      </Badge>
      {onInvite && (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-7 px-2 text-[11px] gap-1"
          disabled={busy}
          onClick={() => onInvite(member)}
        >
          <Mail className="h-3 w-3" /> Invite
        </Button>
      )}
    </div>
  );
}
