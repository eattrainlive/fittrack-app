/**
 * Service worker registration with auto-update logic + runtime version gate.
 *
 * Strategy:
 * - Registers /sw.js (hand-rolled, network-first for navigations, cache-first for hashed assets).
 * - On updatefound + statechange → new SW is installed → skipWaiting + reload.
 * - Checks for updates on app launch and when the tab regains focus.
 * - Runtime version gate: fetches /version.json (never cached) and force-reloads
 *   if the server build differs from the running build — so installed PWAs
 *   auto-update on next open/focus instead of serving a stale bundle (white screen).
 * - Last-resort recovery: if a stale HTML references a missing JS/CSS asset,
 *   clears all caches and reloads once.
 */

let refreshing = false;

const RUNNING_BUILD = import.meta.env.VITE_BUILD_ID ?? "dev";

async function checkForStaleApp() {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = await res.json();
    const serverBuild = data?.build;
    if (serverBuild && serverBuild !== RUNNING_BUILD) {
      // Guard against reload loops — only reload once per unique build id.
      const key = "ft_reloaded_for";
      if (sessionStorage.getItem(key) === serverBuild) return;
      sessionStorage.setItem(key, serverBuild);
      // Purge all caches + update SW so the fresh bundle loads cleanly.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((x) => caches.delete(x)));
      } catch {}
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      } catch {}
      window.location.reload();
    }
  } catch {
    // Offline or unreachable — ignore.
  }
}

export function startVersionGate() {
  checkForStaleApp();
  // iOS PWA re-open fires visibilitychange — this is how an installed app
  // detects a new deploy when the user opens it from the home screen.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForStaleApp();
  });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Only register in production (dev uses Vite HMR which conflicts with SW caching).
  if (import.meta.env.DEV) return;

  // Last-resort recovery: a stale HTML referencing a purged JS/CSS asset fails to load.
  // Catch that, clear caches, and reload once — so the app self-heals instead of white-screening.
  window.addEventListener(
    "error",
    (e) => {
      const target = e?.target as HTMLElement | undefined;
      if (
        target &&
        (target.tagName === "SCRIPT" || target.tagName === "LINK")
      ) {
        const key = "ft_asset_recovered";
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
        try {
          caches
            ?.keys?.()
            .then((keys) => Promise.all(keys.map((x) => caches.delete(x))))
            .finally(() => window.location.reload());
        } catch {
          window.location.reload();
        }
      }
    },
    true, // capture phase — resource load errors don't bubble
  );

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // Always revalidate sw.js from network (default can cache up to 24h)
      });

      // Watch for new service workers.
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // A new version is installed. Tell it to skip waiting.
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // When the new SW takes over, reload the page once.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn("SW registration failed:", err);
    }
  });

  // Check for updates when the tab regains focus.
  let lastFocusCheck = 0;
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    // Throttle to once per 30s.
    if (now - lastFocusCheck < 30_000) return;
    lastFocusCheck = now;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } catch {
      // ignore
    }
  });
}
