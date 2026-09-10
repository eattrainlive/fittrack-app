// src/lib/download.ts — "Download Source" button implementation.
// The AI-Studio builder injects this file into its own preview environment but strips it from the
// exported source, so AppLayout's `import { downloadSourceCode } from "@/lib/download"` breaks the
// production build (vite:load-fallback ENOENT). This is a real, working version: it bundles the
// project's source at build time and zips it in the browser (jszip is already a dependency).
//
// NOTE: this zips the source that is DEPLOYED (bundled at build time) — i.e. a backup/export of
// what's live. To pull your latest *builder* changes out, keep using the button inside the builder
// preview (that runs the builder's own copy of this file).

import JSZip from "jszip";

// Source files (text only — skip binaries like images so nothing gets corrupted).
const srcFiles = import.meta.glob("/src/**/*.{ts,tsx,js,jsx,css,json,html,md,svg}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Key project-root files so the zip is a complete, buildable project.
const rootFiles = import.meta.glob(["/index.html", "/*.ts", "/*.js", "/*.json"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export async function downloadSourceCode(setIsZipping?: (v: boolean) => void): Promise<void> {
  try {
    setIsZipping?.(true);
    const zip = new JSZip();
    const all: Record<string, string> = { ...rootFiles, ...srcFiles };
    for (const [path, content] of Object.entries(all)) {
      zip.file(path.replace(/^\//, ""), content ?? "");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fittrack-source-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error("Download source failed:", e);
    alert("Could not build the source zip — see the browser console for details.");
  } finally {
    setIsZipping?.(false);
  }
}

export default downloadSourceCode;
