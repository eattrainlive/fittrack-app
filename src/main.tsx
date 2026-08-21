import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa-manifest";
import { registerServiceWorker } from "./sw-register";

// Machine QR redirects — run before React mounts so the site never flashes for a machine slug
const MACHINE_REDIRECTS: Record<string, string> = {
  "leg-press": "https://etlfittrack.netlify.app/machine/leg-press",
  "lying-leg-curl": "https://etlfittrack.netlify.app/machine/lying-leg-curl",
  "hack-squat": "https://etlfittrack.netlify.app/machine/hack-squat",
  "adductor-abductor": "https://etlfittrack.netlify.app/machine/adductor-abductor",
  "leg-extension": "https://etlfittrack.netlify.app/machine/leg-extension",
  "smith-machine": "https://etlfittrack.netlify.app/machine/smith-machine",
  "lat-pulldown": "https://etlfittrack.netlify.app/machine/lat-pulldown",
  "seated-cable-row": "https://etlfittrack.netlify.app/machine/seated-cable-row",
  "dual-arm-pulley": "https://etlfittrack.netlify.app/machine/dual-arm-pulley",
  "seated-row": "https://etlfittrack.netlify.app/machine/seated-row",
  "shoulder-press-machine": "https://etlfittrack.netlify.app/machine/shoulder-press-machine",
  "incline-plate-chest-press": "https://etlfittrack.netlify.app/machine/incline-plate-chest-press",
  "seated-chest-press": "https://etlfittrack.netlify.app/machine/seated-chest-press",
  "assisted-chin": "https://etlfittrack.netlify.app/machine/assisted-chin",
  "iso-chest-press": "https://etlfittrack.netlify.app/machine/iso-chest-press",
  "functional-trainer": "https://etlfittrack.netlify.app/machine/functional-trainer",
  "preacher-curl": "https://etlfittrack.netlify.app/machine/preacher-curl",
  "pec-rev-flye": "https://etlfittrack.netlify.app/machine/pec-rev-flye",
  "glute-drive": "https://etlfittrack.netlify.app/machine/glute-drive",
};

const _slug = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
if (MACHINE_REDIRECTS[_slug]) {
  window.location.replace(MACHINE_REDIRECTS[_slug]);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
  // Register the self-updating service worker (production only).
  registerServiceWorker();
}
