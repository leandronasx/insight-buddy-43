import { execSync } from 'child_process';
try {
  execSync('bun run tsc --noEmit', { stdio: 'inherit' });
  execSync('bun run test', { stdio: 'inherit' });
  console.log("All tests passed");
} catch(e) {
  console.log("Tests failed");
}
