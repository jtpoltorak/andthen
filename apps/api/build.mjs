// Bundles the API into dist/ as plain JavaScript, including @andthen/core
// (which ships as TypeScript), so the production image needs only Node.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

// The app's version lives in the root package.json; /health reports it.
const { version } = JSON.parse(await readFile('../../package.json', 'utf8'));

await build({
  entryPoints: ['src/main.ts', 'src/migrate.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  // pg tries to load this optional native driver; it isn't installed.
  external: ['pg-native'],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Some bundled CommonJS packages call require(); give ESM output one.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

// Marks the bundle as ES modules for Node, wherever dist/ is copied to.
await writeFile('dist/package.json', JSON.stringify({ type: 'module' }) + '\n');
