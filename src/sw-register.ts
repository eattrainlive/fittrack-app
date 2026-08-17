/**
 * Service worker registration with auto-update logic.
 *
 * Strategy:
 * - Registers /sw.js (hand-rolled, network-first for navigations, cache-first for hashed assets).
 * - On updatefound + statechange → new SW is installed → skipWaiting + reload.
 * - Checks for updates on app launch and when the tab regains focus.
 * - Shows a toast when an update is applied.
 */

let refreshing = false;

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Only register in production (dev uses Vite HMR which conflicts with SW caching).
  if (import.meta.env.DEV) return;

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
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
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
