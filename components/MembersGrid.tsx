import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  History,
  Target,
  Archive,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  LayoutGrid,
  KanbanSquare,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isTrialEligible } from "@/lib/trialSummary";
import { CoachTrialReviewModal } from "@/components/CoachTrialReviewModal";
import { CurrentTrialistsBoard } from "@/components/CurrentTrialistsBoard";
import SyncMembershipsCard from "@/components/SyncMembershipsCard";
import { NeedsLinkingCard } from "@/components/NeedsLinkingCard";
import { MemberActivityModal } from "@/components/MemberActivityModal";
import { MemberEngagementBoard } from "@/components/MemberEngagementBoard";

const TRIAL_LENGTH_DAYS = 30;

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

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

interface GymRosterRow {
  product?: string | null;
  joined_on?: string | null;
  status?: string | null;
  full_name?: string | null;
}

interface MembersGridProps {
  members: any[];
  staffSecret: string;
  onSetAccess: (memberId: string, acc: string, checked: boolean) => void;
  onViewActivity: (member: any) => void;
  onInviteMember?: (member: { name: string; email: string }) => void;
  onSetStaff?: (memberId: string, isStaff: boolean) => Promise<void>;
  onMembershipsSynced?: () => void;
}

export function MembersGrid({
  members,
  staffSecret,
  onSetAccess,
  onViewActivity,
  onInviteMember,
  onSetStaff,
  onMembershipsSynced,
}: MembersGridProps) {
  // Trial status lives on the Quoox roster (gym_members, matched by email), NOT
  // on the members rows. Load it once when the grid mounts and gate the Trial
  // Review button on the email-matched roster row.
  const [rosterMap, setRosterMap] = useState<Record<string, GymRosterRow>>({});
  const [reviewMap, setReviewMap] = useState<
    Record<string, { status: string; appointment_at?: string | null }>
  >({});
  const [trialReviewMember, setTrialReviewMember] = useState<any | null>(null);
  const [trialReviewOpen, setTrialReviewOpen] = useState(false);
  const [activityMember, setActivityMember] = useState<any | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [showEngagement, setShowEngagement] = useState(false);
  const [onlyUpcomingReviews, setOnlyUpcomingReviews] = useState(false);
  const [onlyNeedsBooking, setOnlyNeedsBooking] = useState(false);
  // Pipeline board view ("Current Trialists") vs the normal member grid.
  const [pipelineMode, setPipelineMode] = useState(false);

  const loadRoster = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("gym_members")
        .select("email,product,joined_on,status,full_name");
      if (!data) return;
      const map: Record<string, GymRosterRow> = {};
      for (const r of data) {
        const key = String(r.email || "")
          .toLowerCase()
          .trim();
        if (!key) continue;
        const prev = map[key];
        if (
          !prev ||
          r.status === "active" ||
          (r.status === "paused" && prev.status !== "active")
        ) {
          map[key] = r as GymRosterRow;
        }
      }
      setRosterMap(map);
    } catch {
      // gym_members may not exist / not readable — soft-fail (no trial data)
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadRoster().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [loadRoster]);

  // Load the review-call booking status map (email -> status/appointment).
  // Mirrored from the external calendar via the webhook; readable by staff.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("review_bookings")
          .select("email,appointment_at,status");
        if (!data || !mounted) return;
        const map: Record<
          string,
          { status: string; appointment_at?: string | null }
        > = {};
        for (const r of data) {
          const key = String(r.email || "")
            .toLowerCase()
            .trim();
          if (!key) continue;
          map[key] = {
            status: String(r.status || "")
              .toLowerCase()
              .trim(),
            appointment_at: r.appointment_at ?? null,
          };
        }
        if (mounted) setReviewMap(map);
      } catch {
        // review_bookings may not exist / not readable — soft-fail
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewActivity = (member: any) => {
    setActivityMember(member);
    setActivityOpen(true);
  };

  const openTrialReview = (member: any) => {
    const gr =
      rosterMap[
        String(member.email || "")
          .toLowerCase()
          .trim()
      ];
    setTrialReviewMember({
      ...member,
      product: member.product ?? gr?.product ?? null,
      joined_on: member.joined_on ?? gr?.joined_on ?? null,
    });
    setTrialReviewOpen(true);
  };

  // Review window = the final stretch of the trial (day 21 onward). This is
  // when nurture starts pushing the review call, so "Needs booking" only
  // surfaces here — before day 21 it's too early to chase.
  const REVIEW_WINDOW_DAY = 21;
  const inReviewWindow = (joinedOn?: string | null) => {
    const tw = trialWindow(joinedOn);
    if (!tw) return false;
    if (Date.now() >= tw.end.getTime()) return false; // trial already ended
    return tw.dayCount >= REVIEW_WINDOW_DAY;
  };

  const emailKey = (email?: string | null) =>
    String(email || "")
      .toLowerCase()
      .trim();

  // Review-call booking status mirrored from the calendar webhook (by email).
  const reviewInfoFor = (email?: string | null) => reviewMap[emailKey(email)];

  const isReviewBooked = (email?: string | null) => {
    const rb = reviewInfoFor(email);
    return !!rb && (rb.status === "booked" || rb.status === "completed");
  };

  const isTrialistFor = (member: any) => {
    const gr = rosterMap[emailKey(member.email)];
    return (
      isTrialEligible(gr?.product) ||
      isTrialEligible(member.product) ||
      isTrialEligible(member.membership_type) ||
      String(member.product || "")
        .toLowerCase()
        .includes("trial")
    );
  };

  const visibleMembers = members.filter((member) => {
    if (!onlyUpcomingReviews && !onlyNeedsBooking) return true;
    if (!isTrialistFor(member)) return false;
    const gr = rosterMap[emailKey(member.email)];
    // "Upcoming reviews" surfaces trialists in the review window (day ≥ 21).
    if (!inReviewWindow(gr?.joined_on)) return false;
    // "Needs booking only" further excludes anyone who's already booked.
    if (onlyNeedsBooking && isReviewBooked(member.email)) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Button
          type="button"
          size="sm"
          variant={showEngagement ? "default" : "outline"}
          className="gap-2"
          onClick={() => {
            setShowEngagement((v) => !v);
            setPipelineMode(false);
            setOnlyUpcomingReviews(false);
            setOnlyNeedsBooking(false);
          }}
        >
          <Activity className="h-4 w-4" />
          {showEngagement ? "Showing activity" : "Member activity"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pipelineMode ? "default" : "outline"}
          className="gap-2"
          onClick={() => {
            setPipelineMode((v) => !v);
            setOnlyUpcomingReviews(false);
            setOnlyNeedsBooking(false);
            setShowEngagement(false);
          }}
        >
          <KanbanSquare className="h-4 w-4" />
          {pipelineMode ? "Showing pipeline" : "Current Trialists"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={onlyUpcomingReviews && !pipelineMode ? "default" : "outline"}
          className="gap-2"
          onClick={() => {
            setPipelineMode(false);
            setOnlyUpcomingReviews((v) => !v);
            setOnlyNeedsBooking(false);
          }}
        >
          <CalendarClock className="h-4 w-4" />
          {onlyUpcomingReviews ? "Showing review window" : "Review window"}
        </Button>
        {(onlyUpcomingReviews || onlyNeedsBooking) && (
          <Button
            type="button"
            size="sm"
            variant={onlyNeedsBooking ? "default" : "outline"}
            className="gap-2"
            onClick={() => {
              setOnlyNeedsBooking((v) => !v);
              if (!onlyUpcomingReviews) setOnlyUpcomingReviews(true);
            }}
          >
            <CalendarX className="h-4 w-4" />
            {onlyNeedsBooking ? "Showing needs booking" : "Needs booking only"}
          </Button>
        )}
        {onlyUpcomingReviews && !pipelineMode && (
          <span className="text-xs text-muted-foreground">
            {onlyNeedsBooking
              ? "Trialists in the review window (day 21+) with no review booked"
              : "Trialists in the review window (day 21+ of their trial)"}
          </span>
        )}
      </div>
      {showEngagement && (
        <MemberEngagementBoard
          staffSecret={staffSecret}
          onViewMember={(m) => {
            const full = members.find((x) => x.id === m.id) || m;
            setActivityMember(full);
            setActivityOpen(true);
          }}
        />
      )}
      {!pipelineMode && !showEngagement && (
        <div className="mb-4 space-y-4">
          <SyncMembershipsCard
            onDone={() => {
              loadRoster();
              onMembershipsSynced?.();
            }}
          />
          <NeedsLinkingCard
            staffSecret={staffSecret}
            onLinked={() => onMembershipsSynced?.()}
          />
        </div>
      )}
      {pipelineMode ? (
        <CurrentTrialistsBoard
          members={members}
          onSelectMember={(m) => openTrialReview(m as any)}
          onInviteMember={onInviteMember}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleMembers.map((member) => {
            const gr = rosterMap[emailKey(member.email)];
            const isTrialist = isTrialistFor(member);
            const tw = trialWindow(gr?.joined_on);
            // Active = trialist AND within the 30-day window (or no join date to
            // tell, so keep the button). Past = trialist whose window has ended.
            const trialEnded = tw ? Date.now() >= tw.end.getTime() : false;
            const isActiveTrial = isTrialist && !trialEnded;
            const isPastTrial = isTrialist && trialEnded;
            const rb = reviewInfoFor(member.email);
            const reviewBooked =
              !!rb && (rb.status === "booked" || rb.status === "completed");
            // "Needs booking" only surfaces in the review window (day ≥ 21). A
            // booked review badge shows any time — a booked review is always good.
            const showNeedsBooking =
              !reviewBooked && inReviewWindow(gr?.joined_on);
            return (
              <Card
                key={member.id}
                className="bg-card border-border flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {member.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg">
                        {member.full_name}
                      </CardTitle>
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
                  <div className="pl-[52px] -mt-1 flex flex-wrap gap-1">
                    {member.membership ? (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                          /trial/i.test(member.membership)
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : /pt/i.test(member.membership)
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {member.membership}
                        {member.membership_status &&
                        member.membership_status !== "active"
                          ? ` · ${member.membership_status}`
                          : ""}
                      </span>
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
                            rb?.appointment_at
                              ? `Review booked · ${new Date(
                                  rb.appointment_at,
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
                          {rb?.appointment_at
                            ? ` · ${fmtDate(new Date(rb.appointment_at))}`
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
                    <Label className="text-xs text-muted-foreground">
                      Access
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "Foundations",
                        "Stronger",
                        "Fusion",
                        "Performance",
                        "Group PT",
                      ].map((acc) => {
                        const hasAccess = (
                          member.allowed_access || []
                        ).includes(acc);
                        return (
                          <div
                            key={acc}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`mem-${member.id}-${acc}`}
                              checked={hasAccess}
                              onCheckedChange={(c) =>
                                onSetAccess(member.id, acc, !!c)
                              }
                            />
                            <Label
                              htmlFor={`mem-${member.id}-${acc}`}
                              className="text-xs"
                            >
                              {acc}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {onSetStaff && (
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
                          await onSetStaff(member.id, checked);
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
                  <div className="flex flex-col gap-2 mt-auto">
                    {isActiveTrial && (
                      <Button
                        variant="default"
                        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => openTrialReview(member)}
                      >
                        <Target className="h-4 w-4" /> Trial Review
                      </Button>
                    )}
                    {isPastTrial && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => openTrialReview(member)}
                      >
                        <Archive className="h-4 w-4" /> View Past Trial
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        const gr = rosterMap[emailKey(member.email)];
                        setActivityMember({
                          ...member,
                          product: member.product ?? gr?.product ?? null,
                          joined_on: member.joined_on ?? gr?.joined_on ?? null,
                        });
                        setActivityOpen(true);
                      }}
                    >
                      <History className="h-4 w-4" /> View Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {visibleMembers.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>
                {onlyNeedsBooking
                  ? "No trialists needing a booking right now — all caught up."
                  : onlyUpcomingReviews
                    ? "No trialists in the review window yet (day 21+ of their trial)."
                    : "No members found yet. Members will appear here once they log in."}
              </p>
            </div>
          )}
        </div>
      )}
      <CoachTrialReviewModal
        member={trialReviewMember}
        staffSecret={staffSecret}
        open={trialReviewOpen}
        onOpenChange={setTrialReviewOpen}
      />
      <MemberActivityModal
        member={activityMember}
        staffSecret={staffSecret}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </>
  );
}
