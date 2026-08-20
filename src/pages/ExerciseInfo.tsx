import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dumbbell } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://juvofqqtvakltlwqqhkn.supabase.co";

// vimeo / youtube -> embeddable iframe src
function embedSrc(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/) || url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return url; // already an embed url
}

export default function ExerciseInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ex, setEx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    (async () => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/exercise-info?id=${encodeURIComponent(id || "")}`);
        const data = await resp.json();
        setEx(data);
      } catch {
        setEx(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!ex) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold mb-2">Exercise not found</p>
          <p className="text-sm text-muted-foreground">Check the QR code or ask a coach.</p>
        </div>
      </div>
    );
  }

  const src = embedSrc(ex.videoUrl);

  return (
    <div className="min-h-screen bg-background">
      {/* brand header */}
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <Dumbbell className="h-5 w-5 text-primary" />
        <span className="font-heading tracking-wider uppercase text-lg">Eat Train Live</span>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-heading tracking-wide uppercase">{ex.name}</h1>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {[ex.equipment, ex.muscle, ex.difficulty].filter(Boolean).map((t: string) => (
              <span key={t} className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {t}
              </span>
            ))}
          </div>
        </div>

        {src ? (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            <iframe
              src={src}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={ex.name}
            />
          </div>
        ) : (
          <div className="aspect-video w-full rounded-xl bg-muted grid place-items-center text-muted-foreground text-sm">
            No video yet
          </div>
        )}

        <p className="text-sm text-muted-foreground">Scan any machine in the gym to see how to use it.</p>

        {/* CTA — non-members: JOIN; members: open the app */}
        {signedIn ? (
          <button
            onClick={() => navigate("/workouts")}
            className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3"
          >
            Open in the app
          </button>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <p className="font-bold">Want your own plan, videos &amp; tracking?</p>
            <p className="text-sm text-muted-foreground">Join the Eat Train Live app — free to set up.</p>
            <button
              onClick={() => navigate(`/auth?redirect=/x/${id}`)}
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3"
            >
              Join / sign up
            </button>
            <p className="text-[11px] text-muted-foreground">On iPhone: tap Share → Add to Home Screen to install.</p>
          </div>
        )}
      </div>
    </div>
  );
}
