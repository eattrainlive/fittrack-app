import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AdoptionStats {
  onApp: number;
  invited: number;
  notInvited: number;
  total: number;
}

export interface RosterMember {
  id: string;
  gym_member_id?: string;
  email: string;
  full_name: string;
  product?: string | null;
  membership?: string | null;
  membership_status?: string | null;
  joined_on?: string | null;
  allowed_access?: string[];
  online_client?: boolean;
  is_staff?: boolean;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  onApp: boolean;
  invitedPending: boolean;
  notInvited: boolean;
  status: "onApp" | "invitedPending" | "notInvited";
}

/**
 * Loads the full roster (every gym_members row) enriched with app-account
 * status via the `rosterStatus` manage-members action. Replaces the old
 * `list` action which only returned members with an app account.
 */
export function useRosterMembers(staffSecret: string) {
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [adoption, setAdoption] = useState<AdoptionStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: { action: "rosterStatus", staffSecret },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.roster) {
        setMembers(data.roster as RosterMember[]);
        setAdoption({
          onApp: data.onApp ?? 0,
          invited: data.invited ?? 0,
          notInvited: data.notInvited ?? 0,
          total: data.total ?? data.roster.length,
        });
      }
    } catch (e) {
      console.error("Failed to load roster", e);
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);

  return { members, setMembers, adoption, loading, load };
}
