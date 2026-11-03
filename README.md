# AndThen

Small habits, linked to what you already do.

AndThen is a simple, low-friction habit app built around **routine chains**: pick something you already do every day (an anchor, like "after I pour my coffee"), then chain a few tiny habits after it. Every habit has a 2-minute version, so a busy day still counts, and a miss never breaks the chain.

## How it's built

| Path | What it is |
| --- | --- |
| `packages/core` | Framework-free TypeScript: the data model, chain logic, and "never miss twice" rules. Shared by every future client (web, Android, browser extension). |
| `apps/web` | The Angular web app (standalone components, signals). Installable as a PWA and works offline. |

Data stays on the device in IndexedDB (via [Dexie](https://dexie.org)). No account is needed. Screens talk to a `HabitRepository` interface; the one in use (`SyncingHabitRepository`) also keeps an outbox of changes while sync is on.

**Sync across devices** is optional and free. Sign in with an emailed code in Settings, and `apps/web/src/app/sync/sync.service.ts` keeps the device in step with `apps/api` in the background: on open, on return to the app, when back online, a few seconds after an edit, and every five minutes. When two devices edit the same thing, the later edit wins.

Habits can run every day, on chosen days (like weekdays), or N times a week. Off days are rest days: they never count as a miss, so streaks, the "don't miss twice" nudge, Progress, reminders and backups all follow the schedule (`packages/core/src/schedule.ts`).

Once a week (the last day of the week, with the next day as a grace day), Today offers a two-minute **weekly reflection**: how each habit went, a one-tap way to make a hard one easier (shrink it to its 2-minute version, move it to another anchor, or do it first), and two optional notes. The logic lives in `packages/core/src/reflection.ts`.

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

## Deploying

Pushes to `main` deploy automatically to Railway, which builds the `Dockerfile` (Node build, then Caddy serving the static files). The domain and DNS are in Cloudflare. See [docs/DEPLOY.md](docs/DEPLOY.md) for the one-time setup and custom domain.
