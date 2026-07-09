import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getEmbedUrl(url: string | undefined): string {
  if (!url) return "";
  
  // Handle Vimeo
  if (url.includes("vimeo.com")) {
    if (url.includes("player.vimeo.com")) return url;
    const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/) || url.match(/(\d{8,})/);
    // Use match[1] if from the first regex, or match[0] if from the fallback
    const id = match ? (match[1] || match[0]) : null;
    if (id) {
      return `https://player.vimeo.com/video/${id}`;
    }
  }
  
  // Handle YouTube
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
  }
  
  return url;
}
