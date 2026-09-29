import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Users,
  History,
  Target,
  CalendarClock,
  CalendarX,
  KanbanSquare,
  Activity,
  UserPlus,
  Smartphone,
  Mail,
  MailCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isTrialEligible } from "@/lib/trialSummary";
import { CoachTrialReviewModal } from "@/components/CoachTrialReviewModal";
import { CurrentTrialistsBoard } from "@/components/CurrentTrialistsBoard";
import SyncMembershipsCard from "@/components/SyncMembershipsCard";
import SyncPaxtonCard from "@/components/SyncPaxtonCard";
import { NeedsLinkingCard } from "@/components/NeedsLinkingCard";
import { MemberActivityModal } from "@/components/MemberActivityModal";
import { MemberEngagementBoard } from "@/components/MemberEngagementBoard";
import { CheckInReport } from "@/components/CheckInReport";
import { MemberCard } from "@/components/MemberCard";
import {
  MemberSearchFilter,
  membershipBucket,
  BUCKETS,
} from "@/components/MemberSearchFilter";
import {
  APP_STATUS_OPTIONS,
  computeAdoption,
  type AppStatusFilter,
  type AdoptionStats,
} from "@/lib/rosterMembers";
import { clearMemberAccessOverride } from "@/lib/memberAccessActions";

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

interface GymRosterRow {
  product?: string | null;
  joined_on?: string | null;
  status?: string | null;
  full_name?: string | null;
}

interface MembersGridProps {
  members: any[];
  staffSecret: string;
  adoption?: AdoptionStats | null;
  onSetAccess: (memberId: string, acc: string, checked: boolean) => void;
  onViewActivity: (member: any) => void;
  onInviteMember?: (member: { name: string; email: string }) => void;
  onSetStaff?: (memberId: string, isStaff: boolean) => Promise<void>;
  onSetOnlineClient?: (memberId: string, value: boolean) => void;
  onMembershipsSynced?: () => void;
  onBulkInvite?: (members: any[]) => Promise<void>;
  onClearAccessOverride?: (memberId: string) => Promise<void>;
}

export function MembersGrid({
  members,
  staffSecret,
  adoption,
  onSetAccess,
  onViewActivity,
  onInviteMember,
  onSetStaff,
  onSetOnlineClient,
  onMembershipsSynced,
  onBulkInvite,
  onClearAccessOverride,
}: MembersGridProps) {
  const [membersState, setMembersState] = useState<any[]>(members);
  useEffect(() => setMembersState(members), [members]);
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
  const [pipelineMode, setPipelineMode] = useState(false);
  const [query, setQuery] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [appStatusFilter, setAppStatusFilter] =
    useState<AppStatusFilter>("all");
  const [staffOnly, setStaffOnly] = useState(false);
  const [bulkInviting, setBulkInviting] = useState(false);

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
      // gym_members may not exist / not readable — soft-fail
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
        // review_bookings may not exist — soft-fail
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const emailKey = (email?: string | null) =>
    String(email || "")
      .toLowerCase()
      .trim();

  const reviewInfoFor = (email?: string | null) => reviewMap[emailKey(email)];

  const isReviewBooked = (email?: string | null) => {
    const rb = reviewInfoFor(email);
    return !!rb && (rb.status === "booked" || rb.status === "completed");
  };

  const REVIEW_WINDOW_DAY = 21;
  const inReviewWindow = (joinedOn?: string | null) => {
    const tw = trialWindow(joinedOn);
    if (!tw) return false;
    if (Date.now() >= tw.end.getTime()) return false;
    return tw.dayCount >= REVIEW_WINDOW_DAY;
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

  const q = query.trim().toLowerCase();
  const visibleMembers = membersState.filter((member) => {
    if (onlyUpcomingReviews || onlyNeedsBooking) {
      if (!isTrialistFor(member)) return false;
      const gr = rosterMap[emailKey(member.email)];
      if (!inReviewWindow(gr?.joined_on)) return false;
      if (onlyNeedsBooking && isReviewBooked(member.email)) return false;
    }
    if (q) {
      const hay =
        `${member.full_name || ""} ${member.email || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (membershipFilter !== "all") {
      const mm = membershipBucket(
        member.membership || member.product || member.membership_type,
      );
      if (mm !== membershipFilter) return false;
    }
    if (appStatusFilter !== "all") {
      if (appStatusFilter === "onApp" && !member.onApp) return false;
      if (appStatusFilter === "invitedPending" && !member.invitedPending)
        return false;
      if (appStatusFilter === "notInvited" && !member.notInvited) return false;
    }
    if (staffOnly && !member.is_staff) return false;
    return true;
  });

  const presentBuckets = useMemo(() => {
    const set = new Set<string>();
    for (const m of membersState)
      set.add(membershipBucket(m.membership || m.product || m.membership_type));
    return BUCKETS.filter((b) => set.has(b));
  }, [membersState]);

  const hasFilters =
    q !== "" ||
    membershipFilter !== "all" ||
    appStatusFilter !== "all" ||
    staffOnly;

  const stats = adoption ?? computeAdoption(membersState);

  const notOnAppMembers = useMemo(
    () => membersState.filter((m) => !m.onApp && m.email),
    [membersState],
  );

  const handleBulkInvite = async () => {
    if (!onBulkInvite) return;
    setBulkInviting(true);
    try {
      await onBulkInvite(notOnAppMembers);
    } finally {
      setBulkInviting(false);
    }
  };

  const handleClearOverride = async (memberId: string) => {
    if (
      !confirm(
        "Reset this member's access to match their membership? Any manual changes will be replaced.",
      )
    )
      return;
    try {
      const res = await clearMemberAccessOverride(staffSecret, memberId);
      const granted = res?.allowed_access ?? null;
      setMembersState((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? {
                ...m,
                access_override: false,
                ...(granted ? { allowed_access: granted } : {}),
              }
            : m,
        ),
      );
    } catch {
      // soft-fail; parent reload can recover
    }
  };

  const openTrialReview = (member: any) => {
    const gr = rosterMap[emailKey(member.email)];
    setTrialReviewMember({
      ...member,
      product: member.product ?? gr?.product ?? null,
      joined_on: member.joined_on ?? gr?.joined_on ?? null,
    });
    setTrialReviewOpen(true);
  };

  const handleViewActivity = (member: any) => {
    const gr = rosterMap[emailKey(member.email)];
    setActivityMember({
      ...member,
      product: member.product ?? gr?.product ?? null,
      joined_on: member.joined_on ?? gr?.joined_on ?? null,
    });
    setActivityOpen(true);
  };

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
      {!pipelineMode && !showEngagement && (
        <MemberSearchFilter
          query={query}
          setQuery={setQuery}
          membershipFilter={membershipFilter}
          setMembershipFilter={setMembershipFilter}
          presentBuckets={presentBuckets}
          visibleCount={visibleMembers.length}
          totalCount={membersState.length}
          appStatusFilter={appStatusFilter}
          setAppStatusFilter={setAppStatusFilter}
          staffOnly={staffOnly}
          setStaffOnly={setStaffOnly}
          adoption={stats}
          onBulkInvite={onBulkInvite ? handleBulkInvite : undefined}
          bulkInviting={bulkInviting}
        />
      )}
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
          <SyncPaxtonCard
            staffSecret={staffSecret}
            onDone={() => onMembershipsSynced?.()}
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
            const rb = reviewInfoFor(member.email);
            const reviewBooked =
              !!rb && (rb.status === "booked" || rb.status === "completed");
            const showNeedsBooking =
              !reviewBooked && inReviewWindow(gr?.joined_on);
            return (
              <MemberCard
                key={member.id}
                member={member}
                rosterProduct={gr?.product}
                rosterJoinedOn={gr?.joined_on}
                isTrialist={isTrialist}
                reviewBooked={reviewBooked}
                showNeedsBooking={showNeedsBooking}
                reviewAppointmentAt={rb?.appointment_at}
                onSetAccess={onSetAccess}
                onSetStaff={onSetStaff}
                onSetOnlineClient={onSetOnlineClient}
                onInviteMember={onInviteMember}
                onOpenTrialReview={openTrialReview}
                onViewActivity={handleViewActivity}
                onClearAccessOverride={handleClearOverride}
              />
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
                    : hasFilters
                      ? "No members match your search."
                      : "No members found yet. Members will appear here once they log in."}
              </p>
            </div>
          )}
        </div>
      )}

      <CheckInReport />

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
