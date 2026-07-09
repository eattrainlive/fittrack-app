import JSZip from "jszip";
import { toast } from "sonner";

type SetLoading = (isLoading: boolean) => void;

export async function downloadSourceCode(setIsZipping: SetLoading) {
  setIsZipping(true);

  try {
    toast.info("Bundling files... this might take a few seconds.");
    const zip = new JSZip();

    const srcFiles = import.meta.glob("/src/**/*", { query: "?raw" });
    const publicFiles = import.meta.glob("/public/**/*", { query: "?raw" });
    const rootFiles = import.meta.glob("/*.{html,json,js,ts,md,cjs,mjs}", { query: "?raw" });

    const allFiles = { ...srcFiles, ...publicFiles, ...rootFiles };
    let fileCount = 0;

    for (const path in allFiles) {
      try {
        const module = await (allFiles[path] as () => Promise<{ default: string }>)();
        const content = module.default;
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        zip.file(cleanPath, content);
        fileCount++;
      } catch (error) {
        console.warn(`Could not read ${path}`, error);
      }
    }

    if (fileCount === 0) {
      throw new Error("No files found to bundle.");
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fittrack-source.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Source code downloaded! (${fileCount} files)`);
  } catch (error) {
    console.error(error);
    toast.error("Failed to download source code.");
  } finally {
    setIsZipping(false);
  }
}
