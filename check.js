import { execSync } from "child_process";
try {
  console.log(execSync("npx tsc --noEmit").toString());
} catch (e) {
  console.log(e.stdout.toString());
  console.log(e.stderr.toString());
}