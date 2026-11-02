# AndThen

Small habits, linked to what you already do.

AndThen is a simple, low-friction habit app built around **routine chains**: pick something you already do every day (an anchor, like "after I pour my coffee"), then chain a few tiny habits after it. Every habit has a 2-minute version, so a busy day still counts, and a miss never breaks the chain.

## How it's built

| Path | What it is |
| --- | --- |
| `packages/core` | Framework-free TypeScript: the data model, chain logic, and "never miss twice" rules. Shared by every future client (web, Android, browser extension). |
| `apps/web` | The Angular web app (standalone components, signals). Installable as a PWA and works offline. |

Data stays on the device in IndexedDB (via [Dexie](https://dexie.org)). No account is needed. Screens talk to a `HabitRepository` interface, so a sync-backed store can be added later without touching the UI.

Because data never leaves the browser, **Settings → Your data** can save everything to a JSON backup file and restore it later (also offered on the welcome screen, for a new device). The file format and its validation live in `packages/core/src/backup.ts`; restoring checks every record and asks before replacing anything.

## Getting started

Requires Node 22.22.3 or newer.

```bash
npm install
npm start          # dev server at http://localhost:4200
npm test           # core + web unit tests
npm run build      # production build in apps/web/dist/web
```

The service worker only runs in production builds. To try offline/install behavior, serve `apps/web/dist/web/browser` with any static server.
