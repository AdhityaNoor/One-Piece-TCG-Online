import react from '@vitejs/plugin-react';
// Imported from 'vitest/config' rather than 'vite' so the `test` field below
// is properly typed — it re-exports Vite's own defineConfig plus that typing.
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

// Plain Vite + React config. No path aliases — the rest of the codebase
// (src/engine, src/cards) uses relative imports throughout, so the app
// layer follows the same convention rather than introducing a second style.
export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped at build time from package.json — read as __APP_VERSION__ anywhere in src/.
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    // 'node' is the right default: every test under src/engine and
    // src/cards proves those layers have zero DOM dependency, which is
    // itself a useful regression guard (see those layers' module docs on
    // injected FetchLike/StorageLike instead of touching `window`).
    //
    // Tests under src/app DO touch real browser globals indirectly via
    // src/app/lib/runtime.ts (window.fetch / window.localStorage). Such a
    // test needs jsdom — add the pragma `// @vitest-environment jsdom` as
    // the first line of that specific test file (per-file override, no
    // config change needed) and add `jsdom` to devDependencies first.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
