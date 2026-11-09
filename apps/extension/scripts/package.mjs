// Zips the built extension for the stores, into dist/packages:
//
//   andthen-chrome-<version>.zip    upload to the Chrome Web Store
//   andthen-edge-<version>.zip      upload to Edge Add-ons
//   andthen-firefox-<version>.zip   upload to Firefox Add-ons (AMO)
//   andthen-source-<version>.zip    AMO's "source code" upload, because background.js
//                                   and the popup are bundled and minified
//
// Run `npm run build:extension` first (or `npm run package:extension`, which does both).
// The source zip is every file git tracks, so commit before packaging a release.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { TARGETS } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..', '..');
const dist = join(root, 'dist');
const out = join(dist, 'packages');

/** A fixed date inside the zips, so packaging the same files twice gives the same bytes. */
const MTIME = new Date('2026-01-01T00:00:00Z');

/** Every file under `dir`, as zip paths (always forward slashes) mapped to their bytes. */
export function filesUnder(dir) {
  const files = {};
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else files[relative(dir, path).split(sep).join('/')] = readFileSync(path);
    }
  };
  walk(dir);
  return files;
}

/** Zips a map of paths to bytes. PNGs and fonts are already compressed, so they're stored. */
export function zip(files) {
  const entries = {};
  for (const [path, bytes] of Object.entries(files)) {
    const level = /\.(png|woff2?)$/.test(path) ? 0 : 9;
    entries[path] = [bytes, { level, mtime: MTIME }];
  }
  return zipSync(entries);
}

function packageAll() {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  mkdirSync(out, { recursive: true });

  for (const target of Object.keys(TARGETS)) {
    const folder = join(dist, target);
    const manifest = join(folder, 'manifest.json');
    if (!existsSync(manifest)) {
      throw new Error(`No build in dist/${target}. Run npm run build:extension first.`);
    }
    const built = JSON.parse(readFileSync(manifest, 'utf8')).version;
    if (built !== version) {
      throw new Error(`dist/${target} is version ${built}, not ${version}. Build again first.`);
    }
    const file = join(out, `andthen-${target}-${version}.zip`);
    writeFileSync(file, zip(filesUnder(folder)));
    console.log(`Packaged ${relative(repo, file)}`);
  }

  // Firefox reviewers rebuild from this, following apps/extension/README.md.
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' })
    .split('\0')
    .filter((path) => path && existsSync(join(repo, path)));
  const source = Object.fromEntries(tracked.map((path) => [path, readFileSync(join(repo, path))]));
  const file = join(out, `andthen-source-${version}.zip`);
  writeFileSync(file, zip(source));
  console.log(`Packaged ${relative(repo, file)} (${tracked.length} files)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) packageAll();
