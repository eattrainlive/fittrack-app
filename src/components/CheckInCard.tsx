import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { QrCode, X, Maximize2 } from "lucide-react";

/**
 * Member's personal check-in QR card.
 * Shows a static QR encoding the member's app user id (opaque UUID).
 * Can expand to full-screen for easy scanning at reception.
 */
export function CheckInCard() {
  const [user, setUser] = useState<any>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  if (!user) return null;

  const qr = (
    <div className="bg-white rounded-2xl p-4 inline-flex">
      <QRCodeSVG
        value={user.id}
        size={180}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
        includeMargin
      />
    </div>
  );

  // Full-screen scan mode (tap to open, tap X to close)
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
        onClick={() => setFullscreen(false)}
      >
        <button
          className="absolute top-4 right-4 p-2"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen(false);
          }}
        >
          <X className="h-7 w-7 text-muted-foreground" />
        </button>
        <div className="bg-white rounded-3xl p-6 mb-6">
          <QRCodeSVG
            value={user.id}
            size={300}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            includeMargin
          />
        </div>
        <p className="text-lg font-heading uppercase tracking-wider text-foreground">
          Show this at reception
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap anywhere to close
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={() => setFullscreen(true)}
      className="w-full flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-3 text-left shadow-sm active:scale-[0.99] transition"
    >
      <div className="w-14 h-14 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <QrCode className="w-7 h-7 text-primary" />
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
      <Maximize2 className="w-5 h-5 text-primary shrink-0" />
    </button>
  );
}
