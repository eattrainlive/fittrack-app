/**
 * Staff-only "Staff Guides" tile for the Coaching hub.
 * Renders a tappable card that opens the StaffGuides section.
 * Only shown to staff (gated by the caller).
 */
export function StaffGuidesTile({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 active:scale-[0.98] transition"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-xl">
        📚
      </div>
      <div className="flex-1">
        <p className="font-heading text-lg uppercase tracking-wider leading-none">
          Staff Guides
        </p>
        <p className="text-xs text-muted-foreground leading-tight">
          How-to guides for running the app · Staff only
        </p>
      </div>
      <span className="text-xs font-bold text-primary">Open ›</span>
    </button>
  );
}
