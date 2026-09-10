// Stub for the builder's "Download Source" button.
// The real implementation lives only inside the AI Studio builder and is NOT included in the
// exported source, so AppLayout's `import { downloadSourceCode } from "@/lib/download"` points at
// a file that doesn't exist — which fails the production build (vite:load-fallback ENOENT).
// This no-op keeps the import valid so the app builds. The button simply does nothing.
// Permanent fix: have the builder remove the "Download Source" button + its import from AppLayout.tsx.

export async function downloadSourceCode(setIsZipping?: (v: boolean) => void): Promise<void> {
  try {
    setIsZipping?.(true);
  } finally {
    setIsZipping?.(false);
  }
}

export default downloadSourceCode;
