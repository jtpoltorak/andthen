# Releasing a new version

AndThen's version lives in one place: `version` in the root `package.json`.
The web app shows it in **Settings → About**, and the api reports it at `/health`.

## Which number to bump

| Bump | When | Example |
| --- | --- | --- |
| Major (`2.0.0`) | The app works in a fundamentally different way, or old backups or synced data stop working | A new data format |
| Minor (`1.1.0`) | A new feature or page | Terms of Use, the help guide |
| Patch (`1.0.1`) | Fixes, wording, styling; nothing new to learn | A reminder firing at the wrong time |

## Steps (in the same PR as the change)

1. Bump the version: `npm version minor --no-git-tag-version` (or `major` / `patch`).
2. Add an entry at the top of `apps/web/src/app/about/release-notes.ts`: the version, today's date,
   and a few short lines written for people who use the app.
3. Run `npm run changelog` to rewrite `CHANGELOG.md`, and commit it.
4. After the PR merges, tag the merge commit: `git tag v1.1.0 && git push origin v1.1.0`.
   Optionally, create a GitHub Release from the tag and paste the notes.

Tests fail if the version has no release note, and CI fails if `CHANGELOG.md` is out of date.

People with the app open see "A new version of AndThen is ready. Reload" once their device has
downloaded it, and "Updated to AndThen 1.1.0 · What's new" after reloading.

## Keep Help in step

When a feature changes, update its article in `apps/web/src/app/help/articles/` in the same PR.
New articles go in `help-articles.ts` (title, summary, keywords) and `help.routes.ts`; the tests
check that every article has a route, a body, and only links to articles that exist.
