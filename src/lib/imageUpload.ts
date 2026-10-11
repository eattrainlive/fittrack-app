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
    const heic2any = (await import("heic2any")).default;
    const blob = (await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    })) as Blob;
    const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // fall back to the original; worst case it's the current behaviour
  }
}
