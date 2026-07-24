import { execSync } from 'child_process';
try {
  console.log(execSync('node test_build.js').toString());
} catch (e) {
  console.log(e.stdout.toString());
  console.log(e.stderr.toString());
}
