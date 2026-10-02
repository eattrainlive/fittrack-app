// Resolve a video poster/thumbnail URL for Vimeo / YouTube / Loom.
// Vimeo uses oEmbed (network fetch); YouTube is a static URL (no fetch).
// Results are cached in localStorage so we don't refetch every render.

const cacheKey = (url: string) => `video_thumb:${url}`;
const memCache: Record<string, string | null> = {};

const youtubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/embed/"))
        return u.pathname.split("/")[2] || null;
    }
  } catch {}
  return null;
};

const isVimeo = (url: string): boolean => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    return host === "vimeo.com" || host === "player.vimeo.com";
  } catch {
    return false;
  }
};

// Returns a thumbnail URL, or null if none can be resolved.
// For Vimeo this is async (oEmbed); for YouTube it's synchronous.
export const getVideoThumbnail = async (
  url: string,
): Promise<string | null> => {
  if (!url) return null;
  if (memCache[url] !== undefined) return memCache[url];

  // YouTube — static, no fetch
  const yt = youtubeId(url);
  if (yt) {
    const thumb = `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
    memCache[url] = thumb;
    return thumb;
  }

  // Vimeo — oEmbed
  if (isVimeo(url)) {
    // check localStorage first
    try {
      const cached = localStorage.getItem(cacheKey(url));
      if (cached) {
        memCache[url] = cached;
        return cached;
      }
    } catch {}

    try {
      const r = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=800`,
      );
      if (r.ok) {
        const data = await r.json();
        if (data?.thumbnail_url) {
          memCache[url] = data.thumbnail_url;
          try {
            localStorage.setItem(cacheKey(url), data.thumbnail_url);
          } catch {}
          return data.thumbnail_url as string;
        }
      }
    } catch {}
  }

  memCache[url] = null;
  return null;
};
