import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Target,
  Archive,
  CalendarCheck,
  CalendarX,
  UserPlus,
  Smartphone,
  Mail,
  Loader2,
  RotateCcw,
} from "lucide-react";

const TRIAL_LENGTH_DAYS = 30;

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const trialWindow = (joinedOn?: string | null) => {
  if (!joinedOn) return null;
  const start = new Date(joinedOn);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + TRIAL_LENGTH_DAYS * 86400000);
  const dayCount = Math.min(
    TRIAL_LENGTH_DAYS,
    Math.max(
      0,
      Math.round(
        (Math.min(end.getTime(), Date.now()) - start.getTime()) / 86400000,
      ) + 1,
    ),
  );
  return { start, end, dayCount };
};

interface MemberCardProps {
  member: any;
  rosterProduct?: string | null;
  rosterJoinedOn?: string | null;
  isTrialist: boolean;
  reviewBooked: boolean;
  showNeedsBooking: boolean;
  reviewAppointmentAt?: string | null;
  onSetAccess: (memberId: string, acc: string, checked: boolean) => void;
  onSetStaff?: (memberId: string, isStaff: boolean) => Promise<void>;
  onSetOnlineClient?: (memberId: string, value: boolean) => void;
  onInviteMember?: (member: { name: string; email: string }) => void;
  onOpenTrialReview: (member: any) => void;
  onViewActivity: (member: any) => void;
  onClearAccessOverride?: (memberId: string) => void;
}

export function MemberCard({
  member,
  rosterProduct,
  rosterJoinedOn,
  isTrialist,
  reviewBooked,
  showNeedsBooking,
  reviewAppointmentAt,
  onSetAccess,
  onSetStaff,
  onSetOnlineClient,
  onInviteMember,
  onOpenTrialReview,
  onViewActivity,
  onClearAccessOverride,
}: MemberCardProps) {
  const [inviting, setInviting] = useState(false);
  const [reverting, setReverting] = useState(false);

  const tw = trialWindow(rosterJoinedOn ?? member.joined_on);
  const trialEnded = tw ? Date.now() >= tw.end.getTime() : false;
  const isActiveTrial = isTrialist && !trialEnded;
  const isPastTrial = isTrialist && trialEnded;

  const onApp = !!member.onApp || !!member.last_sign_in_at;
  const invitedPending =
    !onApp && (!!member.invitedPending || !!member.invited_at);

  const handleInvite = async () => {
    if (!onInviteMember) return;
    setInviting(true);
    try {
      await onInviteMember({
        name: member.full_name || member.name || "",
        email: member.email || "",
      });
    } finally {
      setInviting(false);
    }
  };

  // The app-account id (members.id) used by setAccess / clearAccessOverride /
  // setStaff / setOnlineClient — NOT the gym_members roster id. Null when the
  // member hasn't signed up yet, so controls are disabled for them.
  const accountId =
    member.user_id ?? (!member.gym_member_id ? member.id : null);
  const canManage = !!accountId;

  const handleRevert = async () => {
    if (!onClearAccessOverride || !canManage) return;
    setReverting(true);
    try {
      await onClearAccessOverride(accountId);
    } finally {
      setReverting(false);
    }
  };

  const accessOverride = !!member.access_override;

  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            {member.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{member.full_name}</CardTitle>
            <CardDescription className="text-xs">
              {member.email}
            </CardDescription>
          </div>
          {tw && isActiveTrial && (
            <Badge
              variant="secondary"
              className="shrink-0 gap-1 bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold"
              title={`Trial ends ${fmtDate(tw.end)}`}
            >
              <Target className="h-3 w-3" />
              Day {tw.dayCount} of 30
            </Badge>
          )}
          {tw && isPastTrial && (
            <Badge
              variant="secondary"
              className="shrink-0 gap-1 bg-muted text-muted-foreground border border-border text-[11px] font-semibold"
              title={`Trial ended ${fmtDate(tw.end)}`}
            >
              <Archive className="h-3 w-3" />
              Past trial
            </Badge>
          )}
        </div>

        {/* App status badge */}
        <div className="pl-[52px] -mt-1 flex flex-wrap gap-1">
          {onApp ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 inline-flex items-center gap-1">
              <Smartphone className="h-3 w-3" /> On app
            </span>
          ) : invitedPending ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> Invited — not joined
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> Not on app
            </span>
          )}
          {member.online_client && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
              Online client
            </span>
          )}
          {member.membership || member.product ? (
            <>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                  /trial/i.test(member.membership || member.product || "")
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : /\bpt\b|semi[\s-]?private/i.test(
                          member.membership || member.product || "",
                        )
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {member.membership || member.product}
              </span>
              {(() => {
                const ms = String(
                  member.membership_status || member.status || "",
                )
                  .toLowerCase()
                  .trim();
                // Only render a status pill for the membership lifecycle
                // (active/paused/cancelled) — not the app-status string.
                if (!ms || !["active", "paused", "cancelled"].includes(ms))
                  return null;
                const cls =
                  ms === "active"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : ms === "paused"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border";
                return (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold capitalize ${cls}`}
                  >
                    {ms}
                  </span>
                );
              })()}
            </>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50">
              No membership on file
            </span>
          )}
        </div>

        {tw && isActiveTrial && (
          <p className="text-[11px] text-muted-foreground pl-[52px] -mt-1">
            Trial ends {fmtDate(tw.end)}
          </p>
        )}
        {tw && isPastTrial && (
          <p className="text-[11px] text-muted-foreground pl-[52px] -mt-1">
            Trial ended {fmtDate(tw.end)}
          </p>
        )}
        {isTrialist && (reviewBooked || showNeedsBooking) && (
          <div className="pl-[52px] -mt-1">
            {reviewBooked ? (
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold"
                title={
                  reviewAppointmentAt
                    ? `Review booked · ${new Date(
                        reviewAppointmentAt,
                      ).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Review booked"
                }
              >
                <CalendarCheck className="h-3 w-3" />
                Review booked
                {reviewAppointmentAt
                  ? ` · ${fmtDate(new Date(reviewAppointmentAt))}`
                  : ""}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold"
                title="No review call booked yet — in the review window"
              >
                <CalendarX className="h-3 w-3" />
                Needs booking
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Access</Label>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                accessOverride
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {accessOverride ? "Manual override" : "Following membership"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Foundations",
              "Stronger",
              "Fusion",
              "Performance",
              "Group PT",
            ].map((acc) => {
              const hasAccess = (member.allowed_access || []).includes(acc);
              return (
                <div key={acc} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mem-${member.id}-${acc}`}
                    checked={hasAccess}
                    disabled={!canManage}
                    onCheckedChange={(c) =>
                      canManage && onSetAccess(accountId, acc, !!c)
                    }
                  />
                  <Label
                    htmlFor={`mem-${member.id}-${acc}`}
                    className={`text-xs ${!canManage ? "opacity-50" : ""}`}
                  >
                    {acc}
                  </Label>
                </div>
              );
            })}
          </div>
          {!canManage && (
            <p className="text-[11px] text-muted-foreground">
              Invite this member to manage their app access.
            </p>
          )}
          {accessOverride && onClearAccessOverride && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              disabled={reverting}
              onClick={handleRevert}
            >
              {reverting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Revert to membership
            </Button>
          )}
        </div>
        {onSetStaff && canManage && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`mem-${member.id}-staff`}
              checked={!!member.is_staff}
              onCheckedChange={async (c) => {
                const checked = !!c;
                if (
                  checked &&
                  !confirm(
                    `Give ${member.full_name} staff access to member data?`,
                  )
                )
                  return;
                await onSetStaff(accountId, checked);
              }}
            />
            <Label
              htmlFor={`mem-${member.id}-staff`}
              className="text-xs font-semibold"
            >
              Staff
            </Label>
          </div>
        )}
        {onSetOnlineClient && canManage && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`mem-${member.id}-online`}
              checked={!!member.online_client}
              onCheckedChange={(c) => onSetOnlineClient(accountId, !!c)}
            />
            <Label
              htmlFor={`mem-${member.id}-online`}
              className="text-xs font-semibold"
            >
              Online client
            </Label>
          </div>
        )}
        <div className="flex flex-col gap-2 mt-auto">
          {isActiveTrial && (
            <Button
              variant="default"
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onOpenTrialReview(member)}
            >
              <Target className="h-4 w-4" /> Trial Review
            </Button>
          )}
          {isPastTrial && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => onOpenTrialReview(member)}
            >
              <Archive className="h-4 w-4" /> View Past Trial
            </Button>
          )}
          {onInviteMember && !onApp && (
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={inviting}
              onClick={handleInvite}
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {invitedPending ? "Reinvite" : "Invite"}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => onViewActivity(member)}
          >
            <History className="h-4 w-4" /> View Activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
