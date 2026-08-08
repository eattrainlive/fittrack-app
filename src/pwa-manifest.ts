const ICON_192 = "https://vibe.filesafe.space/1783496939163756206/assets/60958a58-30eb-46b3-aa66-1dc239801e11.png";
const ICON_512 = "https://vibe.filesafe.space/1783496939163756206/assets/47ceb7ee-bcd5-4fa6-99d2-4488264ded35.png";

const manifest = {
  background_color: "#0a0a0a",
  description: "Your personal training app — follow coach-built programmes, track your workouts, hit new PBs, and build daily nutrition habits.",
  display: "standalone",
  icons: [
    { purpose: "any", sizes: "192x192", src: ICON_192, type: "image/png" },
    { purpose: "any", sizes: "512x512", src: ICON_512, type: "image/png" },
    { purpose: "maskable", sizes: "512x512", src: ICON_512, type: "image/png" },
    { purpose: "any", sizes: "180x180", src: ICON_192, type: "image/png" }
  ],
  name: "FitTrack — Train. Track. Progress.",
  orientation: "portrait",
  scope: "/",
  short_name: "FitTrack",
  start_url: "/",
  theme_color: "#a3e635"
};

const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
const link = document.createElement("link");
link.rel = "manifest";
link.href = URL.createObjectURL(blob);
document.head.appendChild(link);
