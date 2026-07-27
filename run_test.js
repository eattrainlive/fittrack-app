const { execSync } = require("child_process");
try {
  const out = execSync("npx tsc --noEmit").toString();
  require("fs").writeFileSync("tsc_out.txt", out);
} catch (e) {
  require("fs").writeFileSync("tsc_out.txt", e.stdout ? e.stdout.toString() : e.toString());
}