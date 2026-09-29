import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { type AppStatusFilter, type AdoptionStats } from "@/lib/rosterMembers";

const BUCKETS = ["Trial", "PT", "Classes", "Gym", "Other"];

export const membershipBucket = (raw?: string | null): string => {
  const s = (raw || "").toLowerCase();
  if (!s) return "Other";
  if (/trial/.test(s)) return "Trial";
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s)) return "PT";
  if (/team\s*training|classes?/.test(s)) return "Classes";
  if (/core|open\s*gym|24\s*hour|gym\s*member/.test(s)) return "Gym";
  return "Other";
};

interface Props {
  query: string;
  setQuery: (v: string) => void;
  membershipFilter: string;
  setMembershipFilter: (v: string) => void;
  presentBuckets: string[];
  visibleCount: number;
  totalCount: number;
  appStatusFilter: AppStatusFilter;
  setAppStatusFilter: (v: AppStatusFilter) => void;
  staffOnly: boolean;
  setStaffOnly: (v: boolean) => void;
  adoption?: AdoptionStats | null;
  onBulkInvite?: () => void;
  bulkInviting?: boolean;
}

export function MemberSearchFilter({
  query,
  setQuery,
  membershipFilter,
  setMembershipFilter,
  presentBuckets,
  visibleCount,
  totalCount,
  appStatusFilter,
  setAppStatusFilter,
  staffOnly,
  setStaffOnly,
  adoption,
  onBulkInvite,
  bulkInviting,
}: Props) {
  const hasFilters =
    query !== "" ||
    membershipFilter !== "all" ||
    appStatusFilter !== "all" ||
    staffOnly;
  const notOnAppCount = adoption
    ? (adoption.invited ?? 0) + (adoption.notInvited ?? 0)
    : 0;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[180px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name…"
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Select
        value={membershipFilter}
        onValueChange={(v) => setMembershipFilter(v)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All memberships" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All memberships</SelectItem>
          {presentBuckets.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={appStatusFilter}
        onValueChange={(v) => setAppStatusFilter(v as AppStatusFilter)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="App status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All app status</SelectItem>
          <SelectItem value="onApp">On app</SelectItem>
          <SelectItem value="invitedPending">Invited</SelectItem>
          <SelectItem value="notInvited">Not on app</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant={staffOnly ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => setStaffOnly(!staffOnly)}
      >
        Staff only
      </Button>
      <div className="flex items-center gap-2 ml-auto">
        {adoption && (
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {adoption.onApp} of {adoption.total} on the app
          </span>
        )}
        {onBulkInvite && notOnAppCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={bulkInviting}
            onClick={onBulkInvite}
          >
            {bulkInviting
              ? "Inviting…"
              : `Invite all not on app (${notOnAppCount})`}
          </Button>
        )}
        {hasFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground"
            onClick={() => {
              setQuery("");
              setMembershipFilter("all");
              setAppStatusFilter("all");
              setStaffOnly(false);
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          Showing {visibleCount} of {totalCount} members
        </span>
      </div>
    </div>
  );
}

export { BUCKETS };
