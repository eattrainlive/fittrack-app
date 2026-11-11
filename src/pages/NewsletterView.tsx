// Public newsletter page at /n/:slug — readable without logging in (the GHL
// email links here). App users see the same via the in-app Newsletter list.
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/authUser";
import { useParams, Link } from "react-router-dom";
import { Loader2, Dumbbell } from "lucide-react";
import { getNewsletter, type Newsletter } from "@/lib/newsletters";
import { NewsletterRenderer } from "@/components/NewsletterRenderer";
import { supabase } from "@/lib/supabase";

export default function NewsletterView() {
  const { slug } = useParams<{ slug: string }>();
  const [issue, setIssue] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    getCurrentUser().then(({ data }) => {
      if (alive) setLoggedIn(!!data.user);
    });
    (async () => {
      if (!slug) return;
      const n = await getNewsletter(slug);
      if (alive) {
        setIssue(n);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border flex items-center justify-center px-4 sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span className="font-heading text-lg uppercase tracking-wider mt-0.5">
            Eat Train Live
          </span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !issue ? (
        <div className="text-center py-24 px-6">
          <p className="font-bold">Newsletter not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This issue may have been unpublished.
          </p>
        </div>
      ) : (
        <>
          <div className="pt-5">
            <NewsletterRenderer issue={issue} />
          </div>
          {/* Drive onto the app */}
          <div className="max-w-2xl mx-auto px-4 pb-16">
            <div className="rounded-2xl bg-foreground text-background p-5 text-center">
              <p className="font-heading uppercase tracking-wide text-lg">
                Get all this in the ETL app
              </p>
              <p className="text-background/70 text-sm mt-1 mb-3">
                Workouts, meal plans, events and every newsletter — in your
                pocket.
              </p>
              <Link
                to={loggedIn ? "/" : "/auth"}
                className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3 no-underline"
              >
                {loggedIn ? "Open the app" : "Open / get the app"} →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
