# Catch-up prompt — paste into the builder (replace heic2any with heic-to; new image helper)

**Why:** `heic2any` uses an old, abandoned libheif build that can't decode the HEIC variant modern iPhones
produce — it throws `code: 2, "ERR_LIBHEIF format not supported"`, so photos stayed HEIC/broken. Switch to
`heic-to` (modern libheif) and add a native-canvas path that handles HEIC on iOS natively AND downscales
every photo (phone photos were several MB and were timing out on upload).

## 1. Dependencies
- Remove `heic2any`. Add `heic-to` (^1.6.6). (i.e. `npm remove heic2any && npm i heic-to`.)
- Keep every photo upload handler routing through `toDisplayableImage` exactly as they do now — no handler
  changes needed.

## 2. Replace `src/lib/imageUpload.ts` entirely with:

```ts
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

function loadImageEl(src: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image could not be decoded natively")); };
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
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas.toBlob failed"))), "image/jpeg", JPEG_QUALITY));
  const name = origName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export async function toDisplayableImage(file: File): Promise<File> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  // 1. Native decode + downscale (JPEG/PNG everywhere; HEIC on iOS Safari).
  try {
    const img = await loadImageEl(file);
    return await imgToJpegFile(img, file.name);
  } catch { /* native couldn't decode (e.g. HEIC on desktop Chrome) */ }
  // 2. HEIC fallback via heic-to (modern libheif), then downscale.
  if (isHeic) {
    try {
      const { heicTo } = await import("heic-to");
      const jpegBlob: Blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
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
  return file;
}
```

Do NOT reintroduce heic2any. Keep this file in every future export.
