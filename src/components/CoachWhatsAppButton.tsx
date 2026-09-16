import { useEffect, useState } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getCoachWhatsAppSettings,
  buildWhatsAppUrl,
  type CoachWhatsAppSettings,
} from "@/lib/coachWhatsApp";

interface CoachWhatsAppButtonProps {
  /** "trial" adds trial-specific copy to the pre-filled message. */
  context?: "trial" | "general";
  /** Compact variant for tight spaces. */
  compact?: boolean;
}

export function CoachWhatsAppButton({
  context = "general",
  compact = false,
}: CoachWhatsAppButtonProps) {
  const [settings, setSettings] = useState<CoachWhatsAppSettings | null>(null);
  const [profile, setProfile] = useState<{
    firstName: string;
    email: string;
  }>({ firstName: "", email: "" });

  useEffect(() => {
    getCoachWhatsAppSettings().then(setSettings);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const fullName = (user.user_metadata?.full_name as string) || "";
      const firstName = fullName.split(" ")[0] || "";
      setProfile({ firstName, email: user.email || "" });
    });
  }, []);

  // Respect the per-context enable flag.
  if (!settings) return null;
  const enabled =
    context === "trial" ? settings.enabledOnTrial : settings.enabledEverywhere;
  if (!enabled || !settings.number) return null;

  const url = buildWhatsAppUrl(
    settings.number,
    profile.firstName,
    profile.email,
    context,
  );
  if (!url) return null;

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white font-bold text-xs px-3 py-2 active:scale-95 transition"
      >
        <MessageCircle className="w-3.5 h-3.5" /> Message a coach
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base uppercase tracking-wide leading-none">
            Need help? Chat to a coach
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            We usually reply within a few hours during gym hours.
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] text-white font-bold text-sm px-4 py-2.5 active:scale-[0.98] transition"
      >
        Message a coach <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default CoachWhatsAppButton;
