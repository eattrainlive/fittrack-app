const { execSync } = require("child_process");
try {
  console.log(execSync("npx tsc --noEmit").toString());
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e);
}