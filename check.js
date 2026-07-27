const { execSync } = require("child_process");
try {
  const out = execSync("npx tsc --noEmit").toString();
  console.log(out);
} catch (e) {
  console.log(e.stdout ? e.stdout.toString() : e.toString());
}