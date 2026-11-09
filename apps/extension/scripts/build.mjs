// Builds the extension for each browser: dist/chrome, dist/edge and dist/firefox.
//
// The popup is one Angular build (dist/popup), and the background worker one esbuild
// bundle (background.js). Each browser gets a copy of both plus its own manifest.json,
// made from manifest.base.json and the small per-browser differences below. Load a folder with "Load unpacked" (Chrome, Edge) or
// about:debugging → "Load Temporary Add-on" (Firefox).
import { execFileSync } from 'node:child_process';
import { buildSync } from 'esbuild';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** Chrome and Edge run the background script as a service worker. */
const CHROMIUM = {
  background: { service_worker: 'background.js' },
};

/**
 * Firefox runs it as an event page instead, needs a fixed add-on id, and asks every
 * new add-on what data it collects.
 */
const FIREFOX = {
  background: { scripts: ['background.js'] },
  browser_specific_settings: {
    gecko: {
      id: 'extension@andthenhabits.com',
      strict_min_version: '140.0',
      // AndThen collects nothing: habits stay in the browser unless you turn on sync.
      data_collection_permissions: { required: ['none'] },
    },
  },
};

/** Chrome and Edge share one build today; each gets its own folder for its own store. */
export const TARGETS = {
  chrome: CHROMIUM,
  edge: CHROMIUM,
  firefox: FIREFOX,
};

/** The manifest for one browser. The version comes from apps/extension/package.json. */
export function manifestFor(target, base = readJson(join(root, 'manifest.base.json'))) {
  const { version } = readJson(join(root, 'package.json'));
  const { $comment, ...rest } = base;
  return { ...rest, version, ...TARGETS[target] };
}

function build() {
  const skipNg = process.argv.includes('--skip-ng');
  if (!skipNg) {
    execFileSync('npx', ['ng', 'build'], { cwd: root, stdio: 'inherit' });
  }
  const popup = join(dist, 'popup', 'browser');
  if (!existsSync(join(popup, 'popup.html'))) {
    throw new Error('No popup build found in dist/popup. Run without --skip-ng first.');
  }
  // One plain script, no modules, so it runs the same as a service worker and an event page.
  const background = join(dist, 'background.js');
  buildSync({
    entryPoints: [join(root, 'src', 'background', 'main.ts')],
    outfile: background,
    bundle: true,
    format: 'iife',
    target: ['chrome120', 'firefox128'],
    minify: true,
    legalComments: 'none',
    tsconfig: join(root, 'tsconfig.app.json'),
  });
  const licenses = join(dist, 'popup', '3rdpartylicenses.txt');
  for (const target of Object.keys(TARGETS)) {
    const out = join(dist, target);
    rmSync(out, { recursive: true, force: true });
    cpSync(popup, out, { recursive: true });
    cpSync(background, join(out, 'background.js'));
    if (existsSync(licenses)) cpSync(licenses, join(out, '3rdpartylicenses.txt'));
    writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifestFor(target), null, 2) + '\n');
    console.log(`Built ${target}: ${out}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
