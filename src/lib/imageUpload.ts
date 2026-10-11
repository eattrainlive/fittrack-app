/**
 * Ensure a user-picked image is browser-displayable. iPhones produce HEIC/HEIF,
 * which won't render in <img>, so convert those to JPEG. Everything else passes
 * through. Best-effort: if conversion fails, return the original file.
 */
export async function toDisplayableImage(file: File): Promise<File> {
  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  try {
    // heic2any is UMD with an awkward shape (module.exports = fn AND
    // module.exports.default = fn), so Vite's interop can hand us the wrong
    // thing. Resolve the actual callable whatever the wrapping.
    const mod: any = await import("heic2any");
    const convert =
      typeof mod === "function"
        ? mod
        : typeof mod.default === "function"
          ? mod.default
          : typeof mod.default?.default === "function"
            ? mod.default.default
            : null;
    if (typeof convert !== "function") {
      throw new Error("heic2any export is not callable");
    }
    const out = await convert({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    // heic2any returns a Blob, or an array of Blobs for multi-image HEIC.
    const blob = (Array.isArray(out) ? out[0] : out) as Blob;
    if (!blob) throw new Error("heic2any returned no blob");
    const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch (err) {
    // Surface the real reason (don't swallow silently) so a persistent
    // failure is diagnosable, then fall back to the original file.
    console.error("[toDisplayableImage] HEIC->JPEG conversion failed:", err);
    return file;
  }
}
