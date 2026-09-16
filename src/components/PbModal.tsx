import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PB {
  exercise: string;
  weight: number;
  reps: number;
}

interface PbModalProps {
  pbModal: PB[] | null;
  onClose: () => void;
  onShare: (pbs: PB[]) => void;
  exerciseLibrary: any[];
}

export function PbModal({
  pbModal,
  onClose,
  onShare,
  exerciseLibrary,
}: PbModalProps) {
  return (
    <Dialog open={!!pbModal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm text-center bg-card border-border max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-heading tracking-wider text-center">
            🏆 New Personal Record!
          </DialogTitle>
        </DialogHeader>
        {pbModal && (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col items-center gap-4 animate-in zoom-in duration-500 py-6">
              <div className="text-6xl mt-2 mb-4">🏆</div>
              <div className="space-y-3 w-full">
                {pbModal.map((pb, i) => {
                  const libEx = exerciseLibrary.find(
                    (e) => String(e.id) === String(pb.exercise),
                  );
                  return (
                    <div
                      key={i}
                      className="bg-muted/50 p-3 rounded-lg border border-border"
                    >
                      <p className="font-bold text-lg">
                        {libEx?.name || pb.exercise}
                      </p>
                      <p className="text-primary font-heading tracking-wider text-2xl">
                        {pb.weight}kg &times; {pb.reps}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
              <Button
                className="w-full text-lg h-12 font-bold tracking-wide"
                onClick={() => {
                  onShare(pbModal);
                  toast.success("Shared to feed!");
                  onClose();
                }}
              >
                Share to feed
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Not now
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
