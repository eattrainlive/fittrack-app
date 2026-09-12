import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, Maximize2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function CheckInCodeCard() {
  const [user, setUser] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  if (!user) return null;

  const code = user.id;

  return (
    <>
      <button
        onClick={() => setFullscreen(true)}
        className="w-full flex items-center gap-3 bg-card border border-border border-l-4 border-l-primary rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <QrCode className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Check in
          </p>
          <p className="font-heading text-lg tracking-wide uppercase leading-none">
            My check-in code
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Show this at reception to check in
          </p>
        </div>
        <Maximize2 className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <QRCodeSVG
              value={code}
              size={280}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin
            />
          </div>
          <p className="font-heading text-xl uppercase tracking-wider mt-6 text-foreground">
            Show this at reception
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tap anywhere to close
          </p>
        </div>
      )}
    </>
  );
}
