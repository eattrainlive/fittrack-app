import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

// Generate ONE build id used everywhere: passed to Vite via env,
// stamped into sw.js, and written to version.json for the runtime version gate.
const buildId = String(Date.now());

try {
  execSync("npm run build", {
    stdio: "inherit",
    env: { ...process.env, VITE_BUILD_ID: buildId },
  });
} catch (e) {
  process.exit(1);
}

// Post-build: inject the build id into sw.js + write version.json
try {
  // (a) cache-bust the service worker so its bytes change every deploy
  let sw = readFileSync("dist/sw.js", "utf8");
  sw = sw.replace(/__BUILD_ID__/g, buildId);
  writeFileSync("dist/sw.js", sw);

  // (b) a tiny version file the app can always fetch fresh (never cached by the SW)
  writeFileSync("dist/version.json", JSON.stringify({ build: buildId }));

  console.log(`✓ Build id ${buildId} → sw.js + version.json`);
} catch (err) {
  console.warn("⚠ build id inject failed:", err.message);
}
