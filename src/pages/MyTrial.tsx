import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isTrialEligible } from "@/lib/trialSummary";
import { getMyGymMember } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { TrialSetup } from "@/components/TrialSetup";
import { TrialMomentum } from "@/components/TrialMomentum";
import { CoachWhatsAppButton } from "@/components/CoachWhatsAppButton";

const MyTrial = () => {
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [setupDone, setSetupDone] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkState = useCallback(async () => {
    try {
      const member = await getMyGymMember();
      const ok = !!member && isTrialEligible(member.product);
      setEligible(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: goals } = await supabase
          .from("trial_goals")
          .select("setup_done")
          .eq("member_id", user.id)
          .maybeSingle();
        setSetupDone(!!goals?.setup_done);
      } else {
        setSetupDone(false);
      }
    } catch {
      setEligible(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkState();
  }, [checkState]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 pt-20 space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="max-w-md mx-auto p-6 pt-24 text-center space-y-3">
        <h1 className="font-heading text-2xl tracking-wide uppercase">
          Not available
        </h1>
        <p className="text-sm text-muted-foreground">
          Your 30-day progress is part of the trial experience.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pt-16 md:pt-20 pb-24 space-y-5">
      {setupDone ? (
        <TrialMomentum />
      ) : (
        <TrialSetup
          onFinished={() => {
            setSetupDone(true);
          }}
        />
      )}

      <CoachWhatsAppButton context="trial" />

      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => navigate("/progress")}
        >
          Full progress <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MyTrial;
