import {
  PlayCircle,
  FileText,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";

interface Resource {
  id: string;
  page: string;
  section_id: string | null;
  title: string;
  url: string;
  type: string;
  description?: string;
  thumbnail_url?: string | null;
}

const isVideo = (u: string) =>
  /vimeo|youtube|youtu\.be|player\./i.test(u || "");

export function ResourceItem({
  r,
  sectionItems,
  index,
  isStaff,
  onOpen,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  r: Resource;
  sectionItems: Resource[];
  index: number;
  isStaff: boolean;
  onOpen: (r: Resource) => void;
  onEdit: (r: Resource) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="w-full flex items-center gap-3 border border-border rounded-xl p-3 text-left active:scale-[0.99] transition">
      <button
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        onClick={() => onOpen(r)}
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
          {r.thumbnail_url ? (
            <img
              src={r.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : isVideo(r.url) ? (
            <PlayCircle className="w-5 h-5 text-primary" />
          ) : (
            <FileText className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{r.title}</p>
          {r.description && (
            <p className="text-xs text-muted-foreground truncate">
              {r.description}
            </p>
          )}
        </div>
      </button>
      {isStaff && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            disabled={index === sectionItems.length - 1}
            onClick={onMoveDown}
            className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(r)}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(r.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
