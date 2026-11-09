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

## Package it for the stores

```sh
npm run package:extension    # from the repo root: builds, then zips
```

This writes `andthen-chrome|edge|firefox-<version>.zip` to `dist/packages`, plus
`andthen-source-<version>.zip` (every file git tracks) for Firefox's source-code review.
The store listing, images and privacy answers are in [store/](store/LISTING.md), and the
upload steps in [docs/EXTENSION_STORES.md](../../docs/EXTENSION_STORES.md).

### Rebuilding the Firefox add-on from source (for reviewers)

1. Install Node.js 22 or later (it comes with npm).
2. Unzip the source and open a terminal in its root folder.
3. Run `npm ci`, then `npm run build:extension`.
4. The add-on is in `apps/extension/dist/firefox`. `background.js` is bundled by esbuild from
   `src/background/main.ts`; the popup is an Angular build of `src/app` (which also uses
   `apps/web/src/app` and `packages/`).

## How it's put together

- **Popup** (`src/app/popup.*`): a small Angular app. It reuses the web app's `HabitStore`,
  `PreferencesStore` and day ring through the `@web/*` path (see `tsconfig.json`), and the
  web app's colors from `apps/web/src/styles.css`.
- **Storage**: the same `SyncingHabitRepository` from `packages/data`. Browsers keep an
  extension's storage separate from every website's, so the extension has its own copy of
  your habits. Sync is what will keep it in step with the app.
- **Side panel** (`sidepanel.html`): the same page as the popup, with
  `<html data-mode="panel">` added by `scripts/build.mjs`. In that mode the popup fills the
  panel and adds the web app's week panel and a journal for today's check-ins. Chrome and
  Edge use `side_panel` (and the `sidePanel` permission); Firefox uses `sidebar_action`.
  Open pages tell each other about changes with a runtime message, `andthen:changed`.
- **Manifests**: `manifest.base.json` holds what every browser shares.
  `scripts/build.mjs` adds the version (from this package.json) and each browser's
  differences, such as Firefox's add-on id.
- **Sync**: the popup uses the web app's `SyncService` (so `SyncEngine` from `packages/data`)
  and catches up each time it opens. Sign-in is the 6-digit code only; the step is kept in
  localStorage for the 10 minutes a code lasts, because the popup closes while you read
  your email.
- **Background worker** (`src/background/`): plain TypeScript bundled by esbuild into
  `background.js` (a service worker in Chrome and Edge, an event page in Firefox). Alarms
  wake it once a minute to update the badge and send reminders (`today-status.ts`, using
  the core reminder rules), and every 15 minutes to sync with `SyncEngine`. The popup tells
  it when habits change, so the badge catches up straight away.
- **Settings** shared by the popup and the worker (reminders, badge, week start) live in
  `chrome.storage.local` (`src/shared/ext-settings.ts`), since the worker can't read the
  popup's localStorage. The extension APIs are typed by hand in `src/shared/chrome.d.ts`.
- **Permissions**: `alarms`, `notifications` and `storage` (plus `sidePanel` in Chrome and Edge), plus one host,
  `https://api.andthenhabits.com/*`, so it can reach the sync server. With that host the
  browser doesn't apply CORS to those requests, so the API needs no change. No access to the
  pages you visit.
- **Firefox data consent**: Firefox asks before an extension sends data anywhere. Nothing
  leaves the browser without sync, so the manifest declares `required: none`, and sync's
  email and sign-in code as optional. The sign-in screen asks for them first
  (`src/shared/data-consent.ts`), and the popup and worker don't sync if they're taken back.
- **No remote code.** Manrope ships inside the extension and the popup has no inline scripts.

## Version

The extension has its own version, separate from the web app's, because each store upload
needs a new one. It starts at 0.1.0 and becomes 1.0.0 at store launch. Changes are listed
in [CHANGELOG.md](CHANGELOG.md).
