import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function CheckInHeaderButton() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  if (!user) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <QrCode className="w-4 h-4 text-primary" /> Check-in
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <QRCodeSVG
              value={user.id}
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

export default CheckInHeaderButton;
