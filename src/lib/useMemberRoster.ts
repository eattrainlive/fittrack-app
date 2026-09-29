import { useCallback, useState } from "react";
import {
  loadRosterMembers,
  inviteRosterMember,
  bulkInviteRoster,
  accessForProduct,
  type RosterMember,
  type RosterStats,
} from "@/lib/memberRoster";

/**
 * Encapsulates the Staff Hub members roster: the loaded members (every
 * gym_members row, enriched with onApp/invitedPending/notInvited), adoption
 * stats, and the invite / reinvite / bulk-invite handlers. Kept out of the
 * (very large) Admin page so the page just consumes it.
 */
export function useMemberRoster(staffSecret: string) {
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [stats, setStats] = useState<RosterStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { members, stats } = await loadRosterMembers(staffSecret);
      setMembers(members);
      setStats(stats);
    } catch (e) {
      console.error("Failed to load members", e);
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);

  const invite = useCallback(
    async (member: {
      full_name: string;
      email: string;
      product?: string | null;
    }) => {
      await inviteRosterMember(staffSecret, member);
      await load();
    },
    [staffSecret, load],
  );

  const bulkInvite = useCallback(
    async (
      list: { full_name: string; email: string; product?: string | null }[],
    ) => {
      const res = await bulkInviteRoster(staffSecret, list);
      await load();
      return res;
    },
    [staffSecret, load],
  );

  return {
    members,
    setMembers,
    stats,
    loading,
    load,
    invite,
    bulkInvite,
    accessForProduct,
  };
}
