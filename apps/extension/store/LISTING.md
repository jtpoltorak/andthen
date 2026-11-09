# Store listing: copy and paste

Everything the three stores ask for, in one place. The step-by-step upload guide is
[docs/EXTENSION_STORES.md](../../../docs/EXTENSION_STORES.md).

## Name

AndThen

## Short description

Used as the Chrome Web Store summary (132 characters at most), the Edge short description
and the Firefox summary. It matches the manifest's `description`.

> Small habits, linked to what you already do. Check off today's routine from your toolbar.

## Description

> AndThen helps you build small habits by linking each one to something you already do: after I pour my coffee, drink a glass of water, and then stretch, and then write tomorrow's top three.
>
> This extension puts today's routine in your browser's toolbar, so you can check off the next habit without opening a tab.
>
> WHAT IT DOES
> • Click the AndThen icon to see today, with the next habit up front. Answer with Done, Did 2 min or Skip, and undo a tap if you slip.
> • A small number on the icon shows how many habits are left today.
> • Optional reminders at each routine's usual time, if something's still left.
> • Open it in the side panel (the sidebar in Firefox) to keep today beside the page you're on, with this week's dots and a tiny journal for how each habit felt.
> • Missed a day? There's no streak to lose. The 2-minute version moves to the front, so you don't miss twice.
>
> WORKS ON ITS OWN, OR WITH YOUR PHONE
> No account needed. Pick a starter routine and go: your habits stay in this browser. If you already use AndThen at andthenhabits.com, sign in with your email (a 6-digit code, no password) and your routines stay in step with your phone and other devices.
>
> Editing routines, Progress and the weekly reflection open andthenhabits.com in a tab.
>
> PRIVATE BY DESIGN
> • No ads, no analytics, no tracking.
> • It can't see or change the pages you visit.
> • Nothing leaves your browser unless you turn on sync.
>
> Help: https://andthenhabits.com/help/browser-extension
> Privacy: https://andthenhabits.com/privacy

## Links

| Field                        | Value                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Website / homepage           | https://andthenhabits.com                                                             |
| Support URL                  | https://andthenhabits.com/help/browser-extension                                      |
| Support email                | hello@andthenhabits.com                                                               |
| Privacy policy               | https://andthenhabits.com/privacy                                                     |
| Language                     | English                                                                               |
| Category (Chrome)            | Productivity → Workflow & Planning                                                    |
| Category (Edge)              | Productivity                                                                          |
| Categories (Firefox)         | Alerts & Updates, Other                                                               |
| Search terms (Edge, up to 7) | habits, habit tracker, routine, daily habits, habit stacking, reminders, productivity |
| Tags (Firefox, up to 10)     | habits, habit tracker, routine, productivity, reminders                               |

## Images (in this folder)

| File                           | Size     | Use                                                   |
| ------------------------------ | -------- | ----------------------------------------------------- |
| `screenshot-1-today.png`       | 1280×800 | All three stores, in this order                       |
| `screenshot-2-side-panel.png`  | 1280×800 |                                                       |
| `screenshot-3-journal.png`     | 1280×800 |                                                       |
| `screenshot-4-reminders.png`   | 1280×800 |                                                       |
| `screenshot-5-welcome.png`     | 1280×800 |                                                       |
| `promo-small-440x280.png`      | 440×280  | Chrome "small promo tile" (required); Edge (optional) |
| `logo-300.png`                 | 300×300  | Edge "Extension Store logo"                           |
| `../public/icons/icon-128.png` | 128×128  | Chrome "store icon" (it's also inside the zip)        |

The screenshots are the real extension (version 1.0.0) with sample routines, set in a plain
browser window. Remake them after a visible change to the popup.

## Privacy answers

### Single purpose (Chrome)

> Shows the person's daily habit routine in the toolbar so they can check off habits, with optional reminders and an optional side panel.

### Why each permission (Chrome and Edge)

| Permission                             | Justification                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                              | Saves the person's routines, check-ins and extension settings (reminders on/off, badge on/off) in the browser.                                                                           |
| `alarms`                               | Wakes the extension once a minute to update the count on its icon and to show a reminder when a routine's usual time arrives, and every 15 minutes to sync if the person turned sync on. |
| `notifications`                        | Shows habit reminders. Reminders are off until the person turns them on in the extension's settings.                                                                                     |
| `sidePanel`                            | Lets the person open the same Today view in the side panel, beside the page they're on.                                                                                                  |
| Host `https://api.andthenhabits.com/*` | AndThen's own sync server. Used only after the person signs in, to keep their habits the same on their other devices. No other sites are accessed.                                       |

### Remote code (Chrome)

> No, I am not using remote code. All scripts and fonts are packaged in the extension.

### Data usage (Chrome)

Tick only these, because they're sent to our server only when the person turns on sync:

- **Personally identifiable information** (their email address, to sign in)
- **Authentication information** (the emailed sign-in code)

Also tick all three certifications: not sold to third parties; not used or transferred for
purposes unrelated to the extension's single purpose; not used to determine
creditworthiness or for lending.

Habits and check-ins also go to the server with sync. They don't match any of Chrome's
categories (they aren't health, financial or location data), and the privacy policy describes
them.

### Firefox data collection

Already in the manifest: `required: none`, and `optional: personallyIdentifyingInfo,
authenticationInfo`. Firefox asks for the optional two when the person taps **Email me a
code**, and the extension won't sync without them.

## Notes for reviewers

Paste into Chrome's "Test instructions", Edge's "Notes for certification" and Firefox's
"Notes to reviewer".

> AndThen works without an account. To try it: click the toolbar icon → "Pick a starter routine" → choose one → tap Done or Did 2 min on the next habit. The gear in the footer turns on reminders; the panel button opens the side panel (Chrome, Edge) or sidebar (Firefox).
>
> Sync is optional: "Sign in" emails a 6-digit code to the address you enter, and the extension then syncs with https://api.andthenhabits.com. Any email address you can read works; no test account is needed.
>
> The extension has no content scripts and requests no access to the pages you visit.

Firefox only, also add:

> The popup and background script are built from TypeScript with Angular and esbuild, so the uploaded source is the whole repository. To rebuild: Node 22 or later, then from the repository root run `npm ci` and `npm run build:extension`. The add-on is written to `apps/extension/dist/firefox`. Details are in `apps/extension/README.md`.
