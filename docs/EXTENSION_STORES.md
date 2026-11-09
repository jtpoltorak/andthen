# Publishing the browser extension

How to put AndThen in the Chrome Web Store, Edge Add-ons and Firefox Add-ons (AMO), and how
to ship an update. Brave, Opera, Vivaldi and other Chromium browsers install from the
Chrome Web Store, so they need nothing extra.

All the listing text, privacy answers and images are in
[apps/extension/store](../apps/extension/store/LISTING.md). Copy and paste from there.

## 1. Build the uploads

From the repository root, on a clean commit of `main`:

```sh
npm ci
npm run package:extension
```

This builds the extension and writes four files to `apps/extension/dist/packages/`:

| File                            | Upload to                                     |
| ------------------------------- | --------------------------------------------- |
| `andthen-chrome-<version>.zip`  | Chrome Web Store                              |
| `andthen-edge-<version>.zip`    | Edge Add-ons                                  |
| `andthen-firefox-<version>.zip` | Firefox Add-ons                               |
| `andthen-source-<version>.zip`  | Firefox Add-ons, when it asks for source code |

The version comes from `apps/extension/package.json`. Every upload needs a higher version
than the last one in that store.

## 2. Developer accounts (once)

Each store shows the publisher name on the listing. Without an LLC, that's your own name;
you can change it to the company's later (Chrome and Edge let you edit the publisher name,
and on AMO the listing shows the account's display name).

| Store            | Sign up at                                                     | Cost     | Needs                                                                                  |
| ---------------- | -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Chrome Web Store | https://chrome.google.com/webstore/devconsole                  | $5, once | A Google account with 2-step verification; verify the contact email; a publisher name. |
| Edge Add-ons     | https://partner.microsoft.com/dashboard/microsoftedge/overview | Free     | A Microsoft account; register as an Individual (or Company, with the LLC's details).   |
| Firefox Add-ons  | https://addons.mozilla.org/developers/                         | Free     | A Mozilla account with two-factor authentication; accept the developer agreement.      |

Use hello@andthenhabits.com as the public contact email where the store asks for one.

## 3. Chrome Web Store

1. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), **Add new
   item** and upload `andthen-chrome-<version>.zip`.
2. **Store listing**: description, category, language, store icon (`apps/extension/public/icons/icon-128.png`),
   the five screenshots in order, the small promo tile, and the homepage and support URLs.
3. **Privacy**: single purpose, a justification for each permission and the host, "no remote
   code", the data-usage boxes and the privacy policy URL. All in `LISTING.md`.
4. **Distribution**: Public, all regions. Free.
5. **Test instructions**: paste the reviewer notes.
6. **Submit for review**. A first review usually takes a few days. You can choose to publish
   by hand once it's approved, rather than straight away.

## 4. Edge Add-ons

1. In [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview),
   **Create new extension** and upload `andthen-edge-<version>.zip`.
2. **Availability**: Public, all markets.
3. **Properties**: category Productivity, privacy policy URL, website and support URLs.
4. **Store listings** → English: description, short description, the Extension Store logo
   (`logo-300.png`), screenshots, the small promo tile (optional) and search terms.
5. **Submit**, with the reviewer notes under "Notes for certification". Reviews take up to
   about a week.

## 5. Firefox Add-ons

1. On [AMO's developer hub](https://addons.mozilla.org/developers/), **Submit a New Add-on** →
   **On this site** (listed), and upload `andthen-firefox-<version>.zip`.
2. When asked whether the code is minified or bundled, say **Yes** and upload
   `andthen-source-<version>.zip`, with the Firefox build instructions from `LISTING.md`.
3. Listing: name, summary, description, categories, tags, support email and site, license
   **All Rights Reserved**, and the privacy policy (paste the link, or the policy's text if AMO
   asks for text).
4. Paste the reviewer notes, then submit. Listed add-ons are usually available within a day;
   a human review may follow later.

## 6. After the first approval

Put each store's link into `EXTENSION_STORES` in
`apps/web/src/app/help/articles/using.ts`. The help article shows "coming soon" for a
browser until its link is there. That's a small web PR: bump the web version and add a
release note as usual.

## Shipping an update

1. Bump `apps/extension/package.json` (`npm install` keeps the lockfile in step) and add an
   entry to `apps/extension/CHANGELOG.md`.
2. Merge, then `npm run package:extension` on `main`.
3. Upload the new zip to each store's existing item (Chrome: **Package** → **Upload new
   package**; Edge: **Extension overview** → **Update**; Firefox: **Upload New Version**, with
   the new source zip).
4. If the update adds a permission, each browser asks people to approve it before the update
   applies, and Chrome turns the extension off until they do. Avoid it where you can, and say
   why in the changelog when you can't.
