import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dumbbell } from "lucide-react";
import machinePages from "@/data/machinePages.json";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://juvofqqtvakltlwqqhkn.supabase.co";

function embedSrc(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/) || url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return url;
}

export default function MachinePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const machine = (machinePages as any)[slug || ""];
  const [videos, setVideos] = useState<Record<string, any>>({});
  const [signedIn, setSignedIn] = useState(false);

  const ids = useMemo(
    () => (machine?.exercises || []).map((e: any) => e.exerciseId).filter(Boolean),
    [machine]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session?.user));
    if (!ids.length) return;
    fetch(`${SUPABASE_URL}/functions/v1/exercise-info?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, any> = {};
        (Array.isArray(data) ? data : []).forEach((x: any) => { map[String(x.id)] = x; });
        setVideos(map);
      })
      .catch(() => {});
  }, [ids.join(",")]);

  if (!machine) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold mb-2">Machine not found</p>
          <p className="text-sm text-muted-foreground">Check the QR code or ask a coach.</p>
        </div>
      </div>
    );
  }

  const variations = (machine.exercises || [])
    .map((v: any) => ({ v, src: v.exerciseId && videos[v.exerciseId] ? embedSrc(videos[v.exerciseId].videoUrl) : null }))
    .filter((x: any) => x.src);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <Dumbbell className="h-5 w-5 text-primary" />
        <span className="font-heading tracking-wider uppercase text-lg">Eat Train Live</span>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">
        <div>
          <p className="text-xs uppercase text-muted-foreground font-bold">How to use</p>
          <h1 className="text-2xl font-heading tracking-wide uppercase">{machine.title}</h1>
        </div>

        {!signedIn && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
            <p className="font-bold">Get the full app — plans, videos &amp; tracking</p>
            <button
              onClick={() => navigate(`/auth?redirect=/machine/${slug}`)}
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3"
            >
              Join / sign up
            </button>
            <p className="text-[11px] text-muted-foreground">On iPhone: Share → Add to Home Screen to install.</p>
          </div>
        )}

        {variations.map(({ v, src }: any, i: number) => (
          <div key={i} className="space-y-2">
            <h2 className="font-bold">{v.label}</h2>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe
                src={src}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={v.label}
              />
            </div>
          </div>
        ))}

        {variations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Videos coming soon for this machine.</p>
        )}

        {signedIn && (
          <button
            onClick={() => navigate("/workouts")}
            className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3"
          >
            Open in the app
          </button>
        )}
      </div>
    </div>
  );
}
