/**
 * Make a user-picked image browser-displayable and upload-friendly.
 *
 * Two problems this solves:
 *  1. iPhones save HEIC/HEIF, which browsers can't render in <img>. We convert to JPEG.
 *  2. Phone photos are ~12MP / several MB, which makes uploads slow (and was timing out).
 *     We downscale the longest edge to MAX_EDGE and re-encode as JPEG.
 *
 * Strategy (in order):
 *  1. Native decode via <img> + canvas. Works for JPEG/PNG everywhere, and for HEIC on
 *     iOS Safari (which decodes HEIC natively) — i.e. the device most members upload from.
 *     Also downscales.
 *  2. HEIC fallback via `heic-to` (modern libheif-wasm) for browsers that can't decode HEIC
 *     natively (desktop Chrome/Firefox). Result is then downscaled too.
 *  3. If everything fails, return the original file (best-effort) and log the reason.
 */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

function loadImageEl(src: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image could not be decoded natively"));
    };
    img.src = url;
  });
}

async function imgToJpegFile(img: HTMLImageElement, origName: string): Promise<File> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("image has no dimensions");
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("canvas.toBlob failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
  const name = origName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export async function toDisplayableImage(file: File): Promise<File> {
  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

  // 1. Native decode + downscale (JPEG/PNG everywhere; HEIC on iOS Safari).
  try {
    const img = await loadImageEl(file);
    return await imgToJpegFile(img, file.name);
  } catch {
    // Native couldn't decode it (e.g. HEIC on desktop Chrome) — fall through.
  }

  // 2. HEIC fallback via heic-to (modern libheif), then downscale the JPEG.
  if (isHeic) {
    try {
      const { heicTo } = await import("heic-to");
      const jpegBlob: Blob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.9,
      });
      try {
        const img = await loadImageEl(jpegBlob);
        return await imgToJpegFile(img, file.name);
      } catch {
        const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        return new File([jpegBlob], name, { type: "image/jpeg" });
      }
    } catch (err) {
      console.error("[toDisplayableImage] HEIC->JPEG conversion failed:", err);
      return file;
    }
  }

  // 3. Non-HEIC that failed native decode (rare) — upload as-is.
  return file;
}
