import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Target,
  Archive,
  TrendingUp,
  Users,
  UserPlus,
  CheckCircle2,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const TRIAL_LENGTH_DAYS = 30;
const DAY_MS = 86400000;

interface CohortRow {
  email: string;
  trial_start: string | null;
  trial_end: string | null;
  converted: boolean | null;
  converted_product?: string | null;
  full_name?: string | null;
}

interface ReviewRow {
  email: string;
  status: string;
  appointment_at?: string | null;
}

interface GymRosterRow {
  email: string;
  full_name?: string | null;
  joined_on?: string | null;
}

interface BoardMember {
  id: string;
  email?: string;
  full_name?: string;
  activated?: boolean | null;
  created_at?: string | null;
}

export type BoardColumn =
  | "week1"
  | "week2"
  | "week3"
  | "needsReview"
  | "bookedReview"
  | "purchased"
  | "didntPurchase";

const COLUMN_DEFS: {
  key: BoardColumn;
  label: string;
  icon: typeof Target;
}[] = [
  { key: "week1", label: "Week 1", icon: Target },
  { key: "week2", label: "Week 2", icon: Target },
  { key: "week3", label: "Week 3", icon: Target },
  { key: "needsReview", label: "Needs review", icon: CalendarX },
  { key: "bookedReview", label: "Booked review", icon: CalendarClock },
  { key: "purchased", label: "Membership purchased", icon: CalendarCheck },
  { key: "didntPurchase", label: "Didn't purchase", icon: Archive },
];

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const emailKey = (e?: string | null) =>
  String(e || "")
    .toLowerCase()
    .trim();

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);

interface CurrentTrialistsBoardProps {
  members: BoardMember[];
  onSelectMember: (member: BoardMember) => void;
  onInviteMember?: (member: { name: string; email: string }) => void;
}

export function CurrentTrialistsBoard({
  members,
  onSelectMember,
  onInviteMember,
}: CurrentTrialistsBoardProps) {
  // Invite timestamps persisted in Supabase (member_invites) so the "Invited"
  // hint survives page reloads across sessions. Seeded optimistically when the
  // coach clicks "Invite to app", then confirmed from the server on next load.
  const [invitedEmails, setInvitedEmails] = useState<Record<string, number>>(
    {},
  );
  const [inviteMap, setInviteMap] = useState<Record<string, string>>({});
  const [cohort, setCohort] = useState<CohortRow[]>([]);
  const [reviewMap, setReviewMap] = useState<
    Record<string, { status: string; appointment_at?: string | null }>
  >({});
  // gym_members roster — for display name + joined_on fallback (most trialists
  // aren't app users, so this is the primary name source).
  const [rosterMap, setRosterMap] = useState<Record<string, GymRosterRow>>({});
  const [loading, setLoading] = useState(true);
  const [onlyNotOnApp, setOnlyNotOnApp] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
        const [
          { data: cRows },
          { data: rRows },
          { data: gRows },
          { data: iRows },
        ] = await Promise.all([
          supabase
            .from("trial_cohort")
            .select(
              "email,trial_start,trial_end,converted,converted_product,full_name",
            )
            .gte("trial_end", since)
            .order("trial_start", { ascending: true }),
          supabase
            .from("review_bookings")
            .select("email,appointment_at,status"),
          supabase.from("gym_members").select("email,full_name,joined_on"),
          supabase.from("member_invites").select("email,invited_at"),
        ]);
        if (!mounted) return;
        setCohort((cRows || []) as CohortRow[]);
        const rmap: Record<
          string,
          { status: string; appointment_at?: string | null }
        > = {};
        for (const r of (rRows || []) as ReviewRow[]) {
          const k = emailKey(r.email);
          if (!k) continue;
          rmap[k] = {
            status: String(r.status || "")
              .toLowerCase()
              .trim(),
            appointment_at: r.appointment_at ?? null,
          };
        }
        setReviewMap(rmap);
        const gmap: Record<string, GymRosterRow> = {};
        for (const g of (gRows || []) as GymRosterRow[]) {
          const k = emailKey(g.email);
          if (!k) continue;
          gmap[k] = g;
        }
        setRosterMap(gmap);
        // Invite timestamps from Supabase (persisted across sessions).
        const imap: Record<string, string> = {};
        for (const ir of (iRows || []) as {
          email: string;
          invited_at: string;
        }[]) {
          const k = emailKey(ir.email);
          if (!k) continue;
          imap[k] = ir.invited_at;
        }
        setInviteMap(imap);
      } catch {
        // tables may not exist / not readable — soft-fail (empty board)
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // App members — only to resolve on-app status + open the Trial Review panel.
  const appMemberByEmail = useMemo(() => {
    const m: Record<string, BoardMember> = {};
    for (const mb of members) {
      const k = emailKey(mb.email);
      if (!k) continue;
      if (!m[k]) m[k] = mb;
    }
    return m;
  }, [members]);

  const columns = useMemo(() => {
    const buckets: Record<
      BoardColumn,
      (CohortRow & {
        member?: BoardMember;
        name: string;
        startIso: string;
        day: number;
      })[]
    > = {
      week1: [],
      week2: [],
      week3: [],
      needsReview: [],
      bookedReview: [],
      purchased: [],
      didntPurchase: [],
    };

    const now = new Date();
    const trialEnded = (r: CohortRow) =>
      r.trial_end ? new Date(r.trial_end).getTime() < now.getTime() : false;

    for (const r of cohort) {
      const k = emailKey(r.email);
      const member = appMemberByEmail[k];
      const gr = rosterMap[k];
      // Name: gym_members.full_name (most trialists aren't app users) → cohort
      // full_name → app member full_name → email.
      const name = gr?.full_name || r.full_name || member?.full_name || r.email;
      // trial_start fallback to gym_members.joined_on.
      const startIso = r.trial_start || gr?.joined_on || r.trial_start || "";
      const day = startIso ? daysBetween(startIso, now.toISOString()) + 1 : 0; // day 1 = trial_start
      const row = { ...r, member, name, startIso, day };
      const rb = reviewMap[k];
      const rbLive =
        !!rb &&
        (rb.status === "booked" || rb.status === "completed") &&
        (!rb.appointment_at ||
          new Date(rb.appointment_at).getTime() >= now.getTime());

      // Priority 1: converted
      if (r.converted === true) {
        buckets.purchased.push(row);
        continue;
      }
      // Priority 2: trial ended, not converted, no live review -> didn't purchase
      if (trialEnded(r) && !rbLive) {
        buckets.didntPurchase.push(row);
        continue;
      }
      // Priority 3: live booked review
      if (rbLive) {
        buckets.bookedReview.push(row);
        continue;
      }
      // Priority 4: ongoing, day >= 21, no booked review
      if (!trialEnded(r) && day >= 21) {
        buckets.needsReview.push(row);
        continue;
      }
      // Priorities 5-7: by trial day
      if (day >= 15) buckets.week3.push(row);
      else if (day >= 8) buckets.week2.push(row);
      else buckets.week1.push(row);
    }
    return buckets;
  }, [cohort, reviewMap, rosterMap, appMemberByEmail]);

  const conversion = useMemo(() => {
    const p = columns.purchased.length;
    const d = columns.didntPurchase.length;
    const total = p + d;
    return { p, d, rate: total ? Math.round((p / total) * 100) : 0 };
  }, [columns]);

  const adoption = useMemo(() => {
    let onApp = 0;
    let invited = 0;
    for (const r of cohort) {
      const mb = appMemberByEmail[emailKey(r.email)];
      if (mb?.activated) onApp++;
      else if (mb) invited++;
    }
    return { onApp, invited, total: cohort.length };
  }, [cohort, appMemberByEmail]);

  const hasAny = cohort.length > 0;

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading trial pipeline…
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>
          No current trialists yet. The pipeline board will populate here once a
          Quoox membership event lands a cohort row — run{" "}
          <code className="text-xs">trial_cohort_setup.sql</code> (with its
          backfill) and deploy <code className="text-xs">gymos-webhook</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <p className="text-muted-foreground">
            {cohort.length} current / recent trialist
            {cohort.length === 1 ? "" : "s"} · auto-buckets by trial day &amp;
            status.
          </p>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary">{adoption.onApp}</span>
            <span className="text-muted-foreground">
              of {adoption.total} on FitTrack
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOnlyNotOnApp((v) => !v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              onlyNotOnApp
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {onlyNotOnApp ? "Showing not on app" : "Not on app only"}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-600 dark:text-emerald-400">
            {conversion.p} purchased
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{conversion.d} didn't</span>
          <span className="text-muted-foreground">
            ({conversion.rate}% conversion)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {COLUMN_DEFS.map(({ key, label, icon: Icon }) => {
          let rows = columns[key];
          if (onlyNotOnApp) {
            // "Not set up" = not invited OR invited-but-inactive (chase list).
            rows = rows.filter((r) => {
              const mb = appMemberByEmail[emailKey(r.email)];
              return !mb || !mb.activated;
            });
          }
          const isWin = key === "purchased";
          const isLoss = key === "didntPurchase";
          return (
            <div
              key={key}
              className={`flex flex-col rounded-xl border min-h-[180px] ${
                isWin
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : isLoss
                    ? "border-border bg-muted/20"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider truncate">
                    {label}
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                  {rows.length}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto">
                {rows.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60 mx-auto my-auto">
                    0
                  </span>
                ) : (
                  rows.map((r) => {
                    const k = emailKey(r.email);
                    const mb = appMemberByEmail[k];
                    // Three states: activated (on app) / invited-but-inactive / not invited.
                    const onApp = !!mb?.activated;
                    const invitedNotSetup = !!mb && !mb.activated;
                    const rb = reviewMap[k];
                    const hint =
                      key === "purchased"
                        ? r.converted_product
                          ? `→ ${r.converted_product}`
                          : "Converted"
                        : key === "bookedReview"
                          ? rb?.appointment_at
                            ? `review ${fmtDateTime(rb.appointment_at)}`
                            : "review booked"
                          : key === "needsReview"
                            ? r.trial_end
                              ? `trial ends ${fmtDate(new Date(r.trial_end))}`
                              : "in review window"
                            : `Day ${Math.min(r.day, TRIAL_LENGTH_DAYS)}/${TRIAL_LENGTH_DAYS}`;
                    return (
                      <div
                        key={r.email}
                        className="rounded-lg border border-border bg-background/60 hover:bg-muted/40 transition-colors px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            r.member
                              ? onSelectMember(r.member)
                              : onSelectMember({
                                  id: r.email,
                                  email: r.email,
                                  full_name: r.name,
                                })
                          }
                          className="text-left w-full focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold truncate">
                              {r.name}
                            </span>
                            {key !== "purchased" &&
                              key !== "didntPurchase" &&
                              key !== "bookedReview" && (
                                <span className="text-[10px] font-bold tabular-nums text-muted-foreground shrink-0">
                                  D{Math.min(r.day, TRIAL_LENGTH_DAYS)}
                                </span>
                              )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {hint}
                          </p>
                        </button>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          {(() => {
                            // Invite timestamp: prefer the persisted Supabase
                            // value, fall back to the optimistic in-memory one.
                            const k = emailKey(r.email);
                            const invitedAt =
                              inviteMap[k] ||
                              (invitedEmails[k]
                                ? new Date(invitedEmails[k]).toISOString()
                                : null);
                            const invitedLabel = invitedAt
                              ? `Invited ${fmtDateTime(invitedAt)}`
                              : null;
                            if (onApp)
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                                  title="Accepted invite & logged in"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> On app
                                </span>
                              );
                            if (invitedNotSetup || invitedAt)
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                                  title={invitedLabel || "Invited, not set up"}
                                >
                                  <Smartphone className="h-3 w-3" /> Invited
                                </span>
                              );
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
                                title="No FitTrack invite sent yet"
                              >
                                <Smartphone className="h-3 w-3" /> Not on app
                              </span>
                            );
                          })()}
                          {!onApp && onInviteMember && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const now = Date.now();
                                const iso = new Date(now).toISOString();
                                const ek = emailKey(r.email);
                                // Optimistic update so the badge flips instantly.
                                setInvitedEmails((prev) => ({
                                  ...prev,
                                  [ek]: now,
                                }));
                                setInviteMap((prev) => ({
                                  ...prev,
                                  [ek]: iso,
                                }));
                                // Persist to Supabase so the hint survives reloads.
                                supabase
                                  .from("member_invites")
                                  .upsert({ email: r.email, invited_at: iso })
                                  .then(({ error }) => {
                                    if (error) {
                                      // Soft-fail: the optimistic state still shows.
                                      console.warn(
                                        "member_invites upsert failed",
                                        error,
                                      );
                                    }
                                  });
                                onInviteMember({
                                  name: r.name,
                                  email: r.email,
                                });
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 hover:bg-amber-500/20 transition-colors"
                            >
                              <UserPlus className="h-3 w-3" />
                              {invitedNotSetup ||
                              inviteMap[emailKey(r.email)] ||
                              invitedEmails[emailKey(r.email)]
                                ? "Resend"
                                : "Invite to app"}
                            </button>
                          )}
                          {!onApp &&
                            (inviteMap[emailKey(r.email)] ||
                              invitedEmails[emailKey(r.email)]) && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
                                title={`Invited ${fmtDateTime(
                                  inviteMap[emailKey(r.email)] ||
                                    new Date(
                                      invitedEmails[emailKey(r.email)]!,
                                    ).toISOString(),
                                )}`}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Sent
                              </span>
                            )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
