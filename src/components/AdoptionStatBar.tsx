import { Button } from "@/components/ui/button";
import { Users, UserCheck, Mail, UserPlus } from "lucide-react";
import type { AdoptionStats } from "@/lib/useRosterMembers";

export type AppStatusFilter = "all" | "onApp" | "invitedPending" | "notInvited";

interface Props {
  adoption: AdoptionStats | null;
  filter: AppStatusFilter;
  setFilter: (v: AppStatusFilter) => void;
  onBulkInvite: () => void;
  bulkInviting: boolean;
}

export function AdoptionStatBar({
  adoption,
  filter,
  setFilter,
  onBulkInvite,
  bulkInviting,
}: Props) {
  const onApp = adoption?.onApp ?? 0;
  const invited = adoption?.invited ?? 0;
  const notInvited = adoption?.notInvited ?? 0;
  const total = adoption?.total ?? 0;

  const pct = total > 0 ? Math.round((onApp / total) * 100) : 0;

  const chips: {
    key: AppStatusFilter;
    label: string;
    count: number;
    active: boolean;
  }[] = [
    { key: "all", label: "All", count: total, active: filter === "all" },
    { key: "onApp", label: "On app", count: onApp, active: filter === "onApp" },
    {
      key: "invitedPending",
      label: "Invited",
      count: invited,
      active: filter === "invitedPending",
    },
    {
      key: "notInvited",
      label: "Not on app",
      count: notInvited,
      active: filter === "notInvited",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">{onApp}</span>
        <span className="text-muted-foreground">of {total} on the app</span>
        <span className="text-xs text-muted-foreground">({pct}%)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={
              "text-xs px-2.5 py-1 rounded-full border font-medium transition " +
              (c.active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40")
            }
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>
      {notInvited > 0 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 ml-auto"
          disabled={bulkInviting}
          onClick={onBulkInvite}
        >
          {bulkInviting ? (
            <UserPlus className="h-3.5 w-3.5 animate-pulse" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {bulkInviting ? "Inviting…" : `Invite all not on app (${notInvited})`}
        </Button>
      )}
    </div>
  );
}
