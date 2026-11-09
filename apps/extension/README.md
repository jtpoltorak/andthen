# AndThen browser extension

Today in your toolbar, for Chrome, Edge and Firefox. Click the AndThen icon on any page
to see today's routines and check off the next habit with Done, Did 2 min or Skip.
Anything that needs more room, like editing routines, Progress or Help, opens
[andthenhabits.com](https://andthenhabits.com) in a tab.

The plan and mockups are in the [extension plan](https://claude.ai/artifact/GpSvbUdhf3x7hXyF2Y7hc8).

## Build and try it

```sh
npm run build:extension      # from the repo root
```

This writes one folder per browser:

| Browser | Folder         | How to load it                                                                                                             |
| ------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Chrome  | `dist/chrome`  | `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → pick the folder.                                  |
| Edge    | `dist/edge`    | `edge://extensions` → turn on **Developer mode** → **Load unpacked** → pick the folder.                                    |
| Firefox | `dist/firefox` | `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `manifest.json` (it stays until Firefox quits). |

After a rebuild, press the reload arrow on the extension's card (Chrome, Edge) or **Reload**
(Firefox). Pin the icon from the puzzle-piece menu so it stays in the toolbar.

## How it's put together

- **Popup** (`src/app/popup.*`): a small Angular app. It reuses the web app's `HabitStore`,
  `PreferencesStore` and day ring through the `@web/*` path (see `tsconfig.json`), and the
  web app's colors from `apps/web/src/styles.css`.
- **Storage**: the same `SyncingHabitRepository` from `packages/data`. Browsers keep an
  extension's storage separate from every website's, so the extension has its own copy of
  your habits. Sync is what will keep it in step with the app.
- **Manifests**: `manifest.base.json` holds what every browser shares.
  `scripts/build.mjs` adds the version (from this package.json) and each browser's
  differences, such as Firefox's add-on id.
- **Sync**: the popup uses the web app's `SyncService` (so `SyncEngine` from `packages/data`)
  and catches up each time it opens. Sign-in is the 6-digit code only; the step is kept in
  localStorage for the 10 minutes a code lasts, because the popup closes while you read
  your email.
- **Permissions**: just one host, `https://api.andthenhabits.com/*`, so the popup can reach
  the sync server. With it, the browser doesn't apply CORS to those requests, so the API
  needs no change. No other permissions, and no access to the pages you visit.
- **No remote code.** Manrope ships inside the extension and the popup has no inline scripts.

## Version

The extension has its own version, separate from the web app's, because each store upload
needs a new one. It starts at 0.1.0 and becomes 1.0.0 at store launch. Changes are listed
in [CHANGELOG.md](CHANGELOG.md).
