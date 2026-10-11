# Catch-up prompt — paste into the builder (HEIC conversion still produced .HEIC)

**Problem:** After the HEIC fix shipped, re-uploaded iPhone photos were *still* stored as `.HEIC` (they
download as HEIC and don't render). Cause: `heic2any` is UMD with an awkward export shape
(`module.exports = fn` **and** `module.exports.default = fn`). Vite's interop can hand back the wrong
thing for `(await import("heic2any")).default`, so calling it throws and the helper silently falls back to
the original HEIC. The old helper also cast heic2any's result straight to a Blob, but heic2any can return
`Blob[]` (multi-image HEIC).

**File:** `src/lib/imageUpload.ts` — replace the whole file with this robust version (resolves the callable
whatever the wrapping, handles the array return, and logs the real error instead of swallowing it):

```ts
export async function toDisplayableImage(file: File): Promise<File> {
  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  try {
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
    const out = await convert({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = (Array.isArray(out) ? out[0] : out) as Blob;
    if (!blob) throw new Error("heic2any returned no blob");
    const name = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch (err) {
    console.error("[toDisplayableImage] HEIC->JPEG conversion failed:", err);
    return file;
  }
}
```

No other files change. Keep all the upload handlers routing through `toDisplayableImage` as they already do.

> Note: previously-uploaded HEIC photos stay HEIC — they must be re-uploaded after this is deployed.
> If a fresh upload STILL downloads as .HEIC after this, open the browser console and read the
> `[toDisplayableImage] …` error — that means heic2any can't decode that file and we'll switch approach.
