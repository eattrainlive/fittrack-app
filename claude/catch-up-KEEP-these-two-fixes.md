# Catch-up prompt — paste into the builder (TWO fixes that keep getting reverted)

These two fixes have been correct in the repo but keep getting dropped on each export. Apply BOTH and keep
them in every future export — do not revert them.

---

## FIX 1 — `src/lib/imageUpload.ts` (HEIC conversion was silently failing)

iPhone photos (HEIC) were still being stored as HEIC and showing broken, because `heic2any` is UMD with an
awkward shape (`module.exports = fn` AND `module.exports.default = fn`), so `(await import("heic2any")).default`
could hand back the wrong thing → `convert()` threw → silent fallback to the original HEIC. Replace the WHOLE
file with this robust version (resolves the real callable, handles the array return, logs the real error):

```ts
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

---

## FIX 2 — `src/components/AccountabilityPreview.tsx` (client dropdown showed an id, not a name)

In the Preview tab with Data source = Real client, the client dropdown showed the raw `user_id`.
`acc_clients` only stores `user_id`, so the name must be resolved from `members`.

1. Add import: `import { supabase } from "@/lib/supabase";`
2. Add state: `const [names, setNames] = useState<Record<string, string>>({});`
3. In `load()`, after `setClients(cs)` (inside `if (c) { ... }`):
```ts
const uids = cs.map((x) => x.user_id).filter(Boolean);
if (uids.length) {
  const { data: mem } = await supabase
    .from("members")
    .select("id, full_name, email")
    .in("id", uids);
  const map: Record<string, string> = {};
  for (const m of (mem as any[]) ?? []) {
    map[m.id] = m.full_name || m.email?.split("@")[0] || "";
  }
  setNames(map);
}
```
4. In the client `SelectItem`, use the name with the id as fallback:
```tsx
{names[c.user_id] || `${c.user_id.slice(0, 8)}…`} ·{" "}
{c.onboarding_done ? "Onboarded" : "Pending"}
```

No schema changes for either fix.
