import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export type AppStatus = "all" | "onApp" | "invited" | "notInvited";

export interface Adoption {
  onApp: number;
  invited: number;
  notInvited: number;
  total: number;
}

interface Props {
  appStatusFilter: AppStatus;
  setAppStatusFilter: (v: AppStatus) => void;
  adoption: Adoption | null;
  onBulkInvite?: (members: any[]) => void;
  members: any[];
}

export function MemberAppStatusFilter({
  appStatusFilter,
  setAppStatusFilter,
  adoption,
  onBulkInvite,
  members,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Select
        value={appStatusFilter}
        onValueChange={(v) => setAppStatusFilter(v as AppStatus)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="App status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All members</SelectItem>
          <SelectItem value="onApp">On app</SelectItem>
          <SelectItem value="invited">Invited</SelectItem>
          <SelectItem value="notInvited">Not on app</SelectItem>
        </SelectContent>
      </Select>
      {adoption && (
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {adoption.onApp}
          </span>{" "}
          of {adoption.total} on the app
          {adoption.notInvited > 0 && (
            <>
              {" · "}
              <span className="text-amber-600 dark:text-amber-400">
                {adoption.notInvited} not invited
              </span>
            </>
          )}
        </span>
      )}
      {onBulkInvite && adoption && adoption.notInvited > 0 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1 ml-auto"
          onClick={() => onBulkInvite(members)}
        >
          <Mail className="h-3.5 w-3.5" /> Invite all not on app
        </Button>
      )}
    </div>
  );
}
