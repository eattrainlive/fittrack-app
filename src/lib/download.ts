import JSZip from "jszip";
import { toast } from "sonner";

export const downloadSourceCode = async (
  setIsZipping: (val: boolean) => void,
) => {
  setIsZipping(true);
  try {
    toast.info("Bundling files... this might take a few seconds.");
    const zip = new JSZip();

    const srcFiles = import.meta.glob("/src/**/*", { query: "?raw" });
    const publicFiles = import.meta.glob("/public/**/*", { query: "?raw" });
    const rootFiles = import.meta.glob("/*.{html,json,js,ts,md,cjs,mjs}", {
      query: "?raw",
    });

    const allFiles = { ...srcFiles, ...publicFiles, ...rootFiles };

    // Explicit fallback in case import.meta.glob skips self or specific files
    if (!allFiles["/src/lib/download.ts"]) {
      try {
        const selfRaw = await import("./download?raw");
        allFiles["/src/lib/download.ts"] = () => Promise.resolve(selfRaw);
      } catch (_) {}
    }

    let fileCount = 0;

    for (const path in allFiles) {
      try {
        const module = await (
          allFiles[path] as () => Promise<{ default: string }>
        )();
        const content = module.default;
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        zip.file(cleanPath, content);
        fileCount++;
      } catch (e) {
        console.warn(`Could not read ${path}`, e);
      }
    }

    if (fileCount === 0) throw new Error("No files found");

    const blob = await zip.generateAsync({ type: "blob" });

    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: "fittrack-source.zip",
          types: [
            {
              description: "ZIP Archive",
              accept: { "application/zip": [".zip"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success(`Source code downloaded!`);
        setIsZipping(false);
        return;
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setIsZipping(false);
        return;
      }
      console.warn(
        "File picker failed, falling back to standard download",
        err,
      );
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fittrack-source.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Source code downloaded!`);
  } catch (error) {
    toast.error("Failed to download source code.");
  } finally {
    setIsZipping(false);
  }
};
