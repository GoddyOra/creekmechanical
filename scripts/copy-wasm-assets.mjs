// Copies the occt-import-js WASM binary into public/wasm/ so the browser
// can fetch it at a stable URL (the glue JS is imported normally through
// Vite/Astro's bundler in parse-worker.ts, so only the binary needs this).
// Runs as npm's predev/prebuild lifecycle hook. Not committed to git (see
// .gitignore) — always sourced fresh from whatever occt-import-js version
// is actually installed.
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(rootDir, 'node_modules', 'occt-import-js', 'dist');
const destDir = path.join(rootDir, 'public', 'wasm');

mkdirSync(destDir, { recursive: true });
copyFileSync(path.join(srcDir, 'occt-import-js.wasm'), path.join(destDir, 'occt-import-js.wasm'));

console.log('Copied occt-import-js.wasm to public/wasm/');
