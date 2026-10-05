import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getEmbedUrl(url: string | undefined): string {
  if (!url) return "";
  // Already a Vimeo embed URL — use as-is (preserves any ?h= unlisted hash)
  if (url.includes("player.vimeo.com")) return url;
  // Vimeo — supports unlisted videos with a hash: vimeo.com/<id>/<hash>
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (vim)
    return `https://player.vimeo.com/video/${vim[1]}${vim[2] ? `?h=${vim[2]}` : ""}`;
  // YouTube — watch, short, youtu.be, embed
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]+)/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}
