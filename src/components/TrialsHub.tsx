import { useState } from "react";
import { CalendarClock, CalendarCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MemberActivityModal } from "@/components/MemberActivityModal";
import { TrialsDashboard } from "@/components/TrialsDashboard";
import { TrialNurtureCockpit } from "@/components/TrialNurtureCockpit";
import { TrialistPipeline } from "@/components/TrialistPipeline";
import { TrialHubSettings } from "@/components/TrialHubSettings";
import { EmptyState, staffName } from "@/components/staffHubShared";
import { useStaffHubData } from "@/lib/useStaffHubData";
import { useTrialStages, type EnrichedTrialist } from "@/lib/trialStages";

type Sub = "dashboard" | "nurture" | "trialists" | "reviews" | "settings";

const SUBS: { key: Sub; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "nurture", label: "Nurture" },
  { key: "trialists", label: "Trialists" },
  { key: "reviews", label: "Reviews" },
  { key: "settings", label: "Settings" },
];

/**
 * Consolidated "Trials" hub — one door for all the trialist tooling Carla works.
 * Reuses the existing components; the shell is just tabs + layout.
 */
export function TrialsHub({ staffSecret }: { staffSecret: string }) {
  const [sub, setSub] = useState<Sub>("dashboard");
  const [logged, setLogged] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg tracking-wide">Trials</h3>

      {/* sub-tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {SUBS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`flex-1 min-w-[6rem] rounded-md px-3 py-2 text-sm font-medium transition ${
              sub === t.key
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "dashboard" ? (
        <TrialsDashboard />
      ) : sub === "nurture" ? (
        <TrialNurtureCockpit staffSecret={staffSecret} />
      ) : sub === "settings" ? (
        <TrialHubSettings />
      ) : sub === "trialists" ? (
        <TrialistsPanel
          staffSecret={staffSecret}
          logged={logged}
          onLogged={(email, outcome) =>
            setLogged((s) => ({ ...s, [email]: outcome }))
          }
        />
      ) : (
        <ReviewsPanel staffSecret={staffSecret} />
      )}
    </div>
  );
}

/** Trialists pipeline — reuses the shared proxy data. */
function TrialistsPanel({
  staffSecret,
  logged,
  onLogged,
}: {
  staffSecret: string;
  logged: Record<string, string>;
  onLogged: (email: string, outcome: string) => void;
}) {
  const { data, loading, error } = useStaffHubData();
  const trialists = data?.trialists;
  const staffOnly =
    trialists === undefined &&
    data?.reachout === undefined &&
    data?.lapsed === undefined;

  if (staffOnly) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          Visible to staff only
        </CardContent>
      </Card>
    );
  }
  if (error && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Reconnect to load the trialists.
        </CardContent>
      </Card>
    );
  }

  return (
    <TrialistPipeline
      list={trialists ?? []}
      logged={logged}
      staffSecret={staffSecret}
      onLogged={onLogged}
    />
  );
}

/**
 * Reviews — the review-window view. Reuses the proxy trialists + useTrialStages
 * to surface the "booked review" and "needs review" (in the review window)
 * buckets, so Carla can see who needs a review booked / is booked.
 */
function ReviewsPanel({ staffSecret }: { staffSecret: string }) {
  const { data, loading } = useStaffHubData();
  const trialists = data?.trialists ?? [];
  const {
    byStage,
    enriched,
    loading: stagesLoading,
  } = useTrialStages(trialists, staffName());
  const [activityMember, setActivityMember] = useState<any | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  if (data && trialists === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          Visible to staff only
        </CardContent>
      </Card>
    );
  }

  // Review window = booked reviews + ongoing trials at day >= 21 that still
  // need a review booked (to_contact in the review window).
  const booked = byStage.booked_review ?? [];
  const needsReview = (byStage.to_contact ?? []).filter(
    (t) => daysIntoTrial(t) >= 21 && !t.converted,
  );
  // Anyone who's set up a membership while on trial (incl. £21 Kickstart) — a
  // running "joined this month" view. `converted` here already includes an
  // active non-trial membership (see trialStages), so it catches both.
  const joined = byStage.joined ?? [];
  const reviewing = [...booked, ...needsReview, ...joined];

  const openActivity = (t: EnrichedTrialist) => {
    setActivityMember({
      id: null,
      email: t.email,
      full_name: t.name,
      membership: t.trial ?? null,
      online_client: false,
    });
    setActivityOpen(true);
  };

  if (loading || stagesLoading) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground py-4">
        Loading review window…
      </p>
    );
  }

  if (reviewing.length === 0) {
    return <EmptyState text="No one in the review window right now ✅" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReviewColumn
          title="Needs review"
          icon={
            <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          }
          empty="No reviews to book"
          rows={needsReview}
          hint={(t) =>
            `Day ${Math.min(daysIntoTrial(t), 30)}/30 · book their review`
          }
          onOpen={openActivity}
        />
        <ReviewColumn
          title="Booked review"
          icon={<CalendarCheck className="h-4 w-4 text-primary" />}
          empty="No reviews booked"
          rows={booked}
          hint={(t) =>
            t.reviewAt ? `Review ${fmtDateTime(t.reviewAt)}` : "review booked"
          }
          onOpen={openActivity}
        />
        <ReviewColumn
          title="Joined"
          icon={
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          }
          empty="No one joined yet"
          rows={joined}
          hint={(t) =>
            t.convertedProduct
              ? `→ ${t.convertedProduct}`
              : "membership set up"
          }
          onOpen={openActivity}
        />
      </div>

      <MemberActivityModal
        member={activityMember}
        staffSecret={staffSecret}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
}

function ReviewColumn({
  title,
  icon,
  empty,
  rows,
  hint,
  onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  rows: EnrichedTrialist[];
  hint: (t: EnrichedTrialist) => string;
  onOpen: (t: EnrichedTrialist) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title} {rows.length}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <Card key={t.key}>
              <CardContent className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.trial}
                      {t.category ? ` · ${t.category}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpen(t)}
                    className="shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Activity
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{hint(t)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const DAY_MS = 86400000;
function daysIntoTrial(t: EnrichedTrialist): number {
  if (!t.start) return 0;
  const start = new Date(t.start + "T00:00:00").getTime();
  if (Number.isNaN(start)) return 0;
  return Math.floor((Date.now() - start) / DAY_MS) + 1;
}
function fmtDateTime(s: string): string {
  try {
    return new Date(s).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}
