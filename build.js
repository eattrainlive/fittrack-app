import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

try {
  execSync("npm run build", { stdio: "inherit" });
} catch (e) {
  process.exit(1);
}

// Post-build: inject a build ID into sw.js so its bytes change every deploy.
// The browser only detects a "new" service worker when sw.js bytes differ —
// without this, the installed PWA never updates and serves a stale shell.
try {
  const buildId = String(Date.now());
  let sw = readFileSync("dist/sw.js", "utf8");
  sw = sw.replace(/__BUILD_ID__/g, buildId);
  writeFileSync("dist/sw.js", sw);
  console.log(`✓ Service worker build ID injected: ${buildId}`);
} catch (err) {
  console.warn("⚠ Could not inject build ID into sw.js:", err.message);
}
