// Bundles the API into dist/ as plain JavaScript, including @andthen/core
// (which ships as TypeScript), so the production image needs only Node.
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

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
  // Some bundled CommonJS packages call require(); give ESM output one.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});

// Marks the bundle as ES modules for Node, wherever dist/ is copied to.
await writeFile('dist/package.json', JSON.stringify({ type: 'module' }) + '\n');
