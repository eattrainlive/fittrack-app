import { useNavigate } from "react-router-dom";
import {
  Facebook,
  CalendarDays,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import UpcomingEvents from "@/components/UpcomingEvents";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/307886632668642";

interface CommunityCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
  external?: boolean;
  soon?: boolean;
  href?: string;
}

function CommunityCard({
  icon,
  title,
  subtitle,
  onClick,
  external,
  soon,
  href,
}: CommunityCardProps) {
  const className =
    "group text-left bg-card border border-border rounded-2xl p-5 flex items-start gap-4 active:scale-[.99] transition hover:border-primary/40";

  // External links render as a real <a> so the PWA hands off to the system
  // browser / Facebook app (an iframe/embed would be blocked by Facebook's
  // X-Frame-Options).
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-lg leading-tight tracking-wide">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-bold text-lg leading-tight tracking-wide">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {soon && (
        <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-full font-bold shrink-0">
          Soon
        </span>
      )}
    </button>
  );
}

export default function Community() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      <header className="text-center space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Community
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect with the ETL tribe — share wins, find events, stay motivated.
        </p>
      </header>

      <section className="space-y-3">
        <CommunityCard
          icon={<Facebook className="h-6 w-6" />}
          title="Facebook Group"
          subtitle="Join the ETL Facebook community"
          external
          href={FACEBOOK_GROUP_URL}
        />
        <CommunityCard
          icon={<CalendarDays className="h-6 w-6" />}
          title="Upcoming Events"
          subtitle="What's on at ETL"
          onClick={() =>
            document
              .getElementById("events")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />
        <CommunityCard
          icon={<MessageSquare className="h-6 w-6" />}
          title="Community Wall"
          subtitle="Share wins, photos and shout-outs"
          onClick={() => navigate("/community/wall")}
        />
      </section>

      <section id="events" className="space-y-3 scroll-mt-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-xl font-bold tracking-wide">
            Upcoming Events
          </h2>
        </div>
        <UpcomingEvents />
      </section>
    </div>
  );
}
