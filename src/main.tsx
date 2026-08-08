import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa-manifest";
import { registerServiceWorker } from "./sw-register";

createRoot(document.getElementById("root")!).render(<App />);

// Register the self-updating service worker (production only).
registerServiceWorker();
