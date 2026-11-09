/**
 * Release notes, newest first. This is the one place they're written: the
 * "What's new" page shows them, and `npm run changelog` copies them into CHANGELOG.md.
 *
 * Every version bump in the root package.json needs an entry here (a test checks).
 * Write for the people who use AndThen, not for developers: what changed for them, in plain words.
 *
 * Kept free of Angular imports and TypeScript-only syntax beyond types, so Node can
 * load it directly when writing the changelog.
 */
export interface Release {
  /** Semantic version, matching the root package.json. */
  version: string;
  /** Release day, YYYY-MM-DD. */
  date: string;
  /** Optional one-line headline. */
  title?: string;
  /** What changed, one short sentence each. */
  notes: string[];
}

export const RELEASES: readonly Release[] = [
  {
    version: '1.34.0',
    date: '2026-11-09',
    title: 'Getting ready for the browser extension.',
    notes: [
      "A new help article, The browser extension, covers AndThen for Chrome, Edge and Firefox: today in your toolbar, a count of what's left on the icon, reminders and a side panel.",
      "Privacy now has a section on the extension: what it keeps, and why it asks for each permission. It can't see the pages you visit.",
      "The extension will be in each browser's store soon. The help article will link to it there.",
    ],
  },
  {
    version: '1.33.1',
    date: '2026-11-09',
    title: 'Groundwork for the browser extension.',
    notes: [
      'Behind the scenes, the parts that save your habits and keep sync running now live in one shared place, ready for the AndThen browser extension.',
      'Nothing changes in the app itself, and your data stays exactly where it is.',
    ],
  },
  {
    version: '1.33.0',
    date: '2026-11-08',
    title: 'An easy-reading font.',
    notes: [
      'A new option under Settings → Easier to read switches the app to Atkinson Hyperlegible Next, a typeface designed for low vision.',
      'Letters that are easy to mix up, like I, l and 1, or O and 0, each get a clear shape of their own.',
      'It works with Larger text and More contrast, and only downloads if you turn it on.',
    ],
  },
  {
    version: '1.32.0',
    date: '2026-11-08',
    title: 'Dots you can tell apart by shape.',
    notes: [
      'A 2-minute dot is now half filled with a ring around it, so it stands apart from a solid Done dot even when teal and amber are hard to tell apart.',
      'Skips stay a dashed ring and days with no check-in a plain grey dot.',
      'The new shapes show on Progress, This week, the weekly recap, Run and your share card.',
    ],
  },
  {
    version: '1.31.0',
    date: '2026-11-08',
    title: 'The anchor draws itself.',
    notes: [
      'When you make a new routine, its chain draws itself once: the anchor, then a line down to your first habit.',
      'It shows the idea at the heart of AndThen, after this comes that, right from day one.',
      'If your device is set to reduce motion, the chain simply appears.',
    ],
  },
  {
    version: '1.30.0',
    date: '2026-11-08',
    title: 'Your day at a glance.',
    notes: [
      'A new card on Progress lays your routines on a timeline of the day: when you planned them, when they usually happen, and today’s check-ins.',
      'Each check-in now notes the time, so the timeline fills in over the next few days.',
      'If a routine keeps starting well off its planned time, the card offers to move it, and its reminder moves too.',
    ],
  },
  {
    version: '1.29.0',
    date: '2026-11-08',
    title: 'A sky that follows the day.',
    notes: [
      'A new option under Settings → Look: a soft sky behind the top of Today.',
      'It shows a sunrise in the morning, daylight with a cloud, a warm dusk, then a moon and stars at night, and changes on its own as the hours pass.',
      'It works in light and dark, and it’s off unless you turn it on.',
    ],
  },
  {
    version: '1.28.0',
    date: '2026-11-08',
    title: 'Gentle milestones.',
    notes: [
      'Quiet markers for how far you’ve come: your first check-in, 25, 100 and more check-ins, and 7, 30, 100 and 365 days showed up.',
      'When you reach one, a small card says so on Today, once. Tap Thanks and it’s put away.',
      'Progress lists every milestone you’ve reached, with the date, and what’s next.',
      'They only count up. Missed days never take one away.',
    ],
  },
  {
    version: '1.27.0',
    date: '2026-11-08',
    title: 'Your year at a glance.',
    notes: [
      'A new year view shows the last 12 months as little calendars, each day shaded by how much of it you did.',
      'Look at all your routines together or one at a time, with the days you showed up, your check-ins and your best month.',
      'Skips, rest days and pauses are never shaded as misses. Find it under See your year on Progress.',
    ],
  },
  {
    version: '1.26.0',
    date: '2026-11-08',
    title: 'Your week, ready to post.',
    notes: [
      'Share your week now comes in two sizes: Story, for Instagram, Facebook and WhatsApp stories, and Post, for a feed or a message.',
      'Your garden is on the card too: a few plants on a post, and the whole garden on a story.',
      'Posting somewhere public? Switch off habit and routine names, or what went well, and the card leaves them out.',
    ],
  },
  {
    version: '1.25.0',
    date: '2026-11-07',
    title: 'A little garden.',
    notes: [
      'Each routine now grows its own plant, from a seed to a sprout, a seedling, a young plant, a bud and full bloom.',
      'Every Done and every 2-minute check-in helps it grow. Skips and missed days never take growth away, and plants never wilt.',
      'A paused routine, or one that’s been quiet for a week, rests with a little moon until your next check-in.',
      'See each plant at the foot of its card on Today, and the whole garden on Progress.',
    ],
  },
  {
    version: '1.24.1',
    date: '2026-11-06',
    notes: [
      'The Run screen no longer shows an empty progress bar for a routine with just one habit.',
    ],
  },
  {
    version: '1.24.0',
    date: '2026-11-06',
    title: 'Smoother moves.',
    notes: [
      'Screens now cross-fade as you switch tabs, and the sidebar stays still on a laptop.',
      'Tapping Run grows the routine’s card into the Run screen, and Back shrinks it home.',
      'Checking off a habit now draws its tick in.',
      'All of it switches off when your device is set to reduce motion.',
    ],
  },
  {
    version: '1.23.0',
    date: '2026-11-06',
    title: 'Routine icons.',
    notes: [
      'Give each routine an icon, like a mug, a moon or a laptop, so they’re easy to tell apart on Today, Routines, Progress and the Run screen.',
      'Ready-made routines come with an icon, and a shared routine brings its icon along.',
      'Icons are kept in backups and sync to your other devices.',
    ],
  },
  {
    version: '1.22.0',
    date: '2026-11-06',
    title: 'Am I getting steadier?',
    notes: [
      'Each habit on Progress now has a tiny trend line for the last 8 weeks, with a few words on which way it’s heading.',
    ],
  },
  {
    version: '1.21.0',
    date: '2026-11-06',
    title: 'The AndThen idea, in one picture.',
    notes: [
      'A new diagram on the Help home and in “Chain it” shows how one thing you already do leads to a few tiny habits, each cueing the next.',
      'Further reading now lists more books and free-to-read research on building habits, with a line on what each is good for.',
    ],
  },
  {
    version: '1.20.1',
    date: '2026-11-06',
    title: 'A steadier sidebar.',
    notes: [
      'On a laptop, the left sidebar and the AndThen logo now sit in exactly the same place in the app and in Help, so nothing jumps when you switch.',
    ],
  },
  {
    version: '1.20.0',
    date: '2026-11-06',
    title: 'Help, made for bigger screens.',
    notes: [
      'On a laptop or desktop, Help lists every topic down the left side, with a search box on top and the one you’re reading highlighted.',
      'Articles read in a wider, roomier column, and longer ones get an “On this page” list to jump between sections.',
      'Phones look the same as before.',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-11-06',
    title: 'Made for bigger screens too.',
    notes: [
      'On a laptop or desktop, the tabs move to a rail on the left and pages get more room.',
      'Today shows a This week card beside your routines: a dot for each day, and the week’s totals.',
      'Phones look the same as before.',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-11-06',
    title: 'Easier to read.',
    notes: [
      'New in Settings → You: Larger text makes everything about 15% bigger, buttons too.',
      'More contrast darkens gray text, lines and borders, in light and dark.',
      'On Today, a long anchor now gets its own line instead of squeezing into a narrow column.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-11-06',
    title: 'A better app icon, and easier to install.',
    notes: [
      'New Install AndThen card in Settings: one tap on Chrome, Edge and Android, or the steps for iPhone and iPad.',
      'The app icon is centered, with proper versions for Android home screens and for computers.',
      'The install screen now shows a preview of the app, and on Android you can press and hold the icon to jump to Today or Progress.',
      'In dark mode, the browser’s title bar goes dark too.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-11-06',
    title: 'Morning, afternoon, evening.',
    notes: [
      'Today groups your routines by their usual time: Morning, Afternoon, Evening, and Anytime for routines without one.',
      'A finished routine folds into one quiet line with a check, so what’s left stands out.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-11-06',
    title: 'Your day at a glance.',
    notes: [
      'A small ring beside the Today title fills in as you go: one piece per habit, teal for Done, amber for 2 minutes.',
      'It closes with a check once every habit has its answer.',
    ],
  },
  {
    version: '1.14.2',
    date: '2026-11-06',
    title: 'Friendlier first weeks on Progress.',
    notes: [
      'A new habit’s dot grid now starts the week you added it and grows a column each week, up to 8 weeks.',
      'The rest of this week shows as faint rings, waiting to fill in.',
      'Every day of the week is labeled down the side, not just Monday, Wednesday and Friday.',
    ],
  },
  {
    version: '1.14.1',
    date: '2026-11-06',
    title: 'A tidier welcome screen.',
    notes: [
      'If you already use AndThen, “Sign in to sync” and “Restore from a backup” now sit together under “Already use AndThen?”.',
      'Nothing wraps awkwardly on small phones any more.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-11-05',
    title: 'Share a routine.',
    notes: [
      'Send a friend a link to any routine: open it in Routines and tap “Share a link…”.',
      'They see the chain and add it with one tap, no account needed. It becomes their own copy.',
      'Only the habits travel. Your check-ins, notes and reasons why stay with you.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-11-05',
    title: 'A tiny journal.',
    notes: [
      'After Done or Did 2 min, tap how it felt (Felt good, Okay or Hard) and add a few words if you like. It’s optional.',
      'Progress marks those days on the dot grid and lists each habit’s latest notes, so patterns are easy to spot.',
      'Notes are in your backups and sync between your devices.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-11-05',
    title: 'Friendlier empty screens.',
    notes: [
      'Rest days and breaks on Today now come with a small drawing and a kind word, not just a blank space.',
      'Today, Routines and Progress each get a clearer “nothing here yet” screen, with a one-line example to get you started.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-11-05',
    title: 'See the chain.',
    notes: [
      'Each routine on Today is now drawn as a chain: your anchor at the top, then each habit, joined by a line.',
      'The link fills in as you go: teal for Done, amber for 2 minutes, dashed for a skip.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-11-05',
    title: 'See where you’re signed in.',
    notes: [
      'Settings → Sync now lists every device signed in to your account, with when each was last active.',
      'Sign out an old phone or a borrowed computer right from the list. Its data stays on it, but it stops syncing.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-11-05',
    title: 'Your week, as a card.',
    notes: [
      'New “Share your week” on Progress and in the weekly reflection: a picture of your week with each habit’s dots.',
      'Share it from your phone, or save it as an image. It includes “what went well” if you reflected.',
      'It’s drawn on your device in your theme and accent color. Nothing is uploaded.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-11-05',
    title: 'Run a routine, one habit at a time.',
    notes: [
      'Tap Run on a routine’s card for a calm, full-screen view: your anchor, “and then…”, and one habit at a time with big buttons.',
      'Your “why” and make-it-easy notes show along the way, and a bar at the top fills in as you go.',
      'Undo the last answer right there, and finish with a little celebration.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-11-05',
    title: 'Pick an accent color.',
    notes: [
      'Choose Teal, Blue, Plum, Clay or Slate in Settings → You. Buttons, checkmarks and highlights follow along, in light and dark.',
      'The amber for “Did 2 min” stays put, so it always stands out.',
      'New help article: Make it yours.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-11-05',
    title: 'Pause a routine when life gets busy.',
    notes: [
      'Pause any routine for 3 days, 1 week, 2 weeks, or until you resume it. Find it under “Take a break” in the routine.',
      'Paused days are rest days: they never count as missed, never bring a nudge, and never break your chain.',
      'Paused routines wait in a quiet row on Today with a Resume button.',
      'New help article: Pausing a routine.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-11-05',
    title: 'Remember why each habit matters.',
    notes: [
      'Add an optional “Why it matters to you” line to any habit in the routine editor.',
      'Your why shows under the habit on Progress and in the weekly reflection.',
      'It’s included in backups and sync, like your other notes.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-11-05',
    title: 'Drag to reorder your chain.',
    notes: [
      'In the routine editor, drag a habit by its handle (the six dots) to move it up or down the chain.',
      'The other habits slide out of the way as you drag, so you can see where it will land.',
      'The up and down arrows are still there, and still work from a keyboard.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-11-05',
    title: 'A little celebration for every check-in.',
    notes: [
      'Tapping Done or Did 2 min now gives the habit’s ring a quick pop.',
      'Finishing the last habit in a routine brings a small “Chain complete” moment.',
      'If your device is set to reduce motion, AndThen keeps things still.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-04',
    title: 'A help guide, built in.',
    notes: [
      'New Help guide: short reads on how habits stick, and how to use every part of AndThen.',
      'Tap the “?” next to a screen or setting to open its help article.',
      'Find a topic fast with the filter box on the Help page.',
      'Help is also linked from the welcome screen and Settings → About, and works offline.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-04',
    title: 'Terms of Use, and a clearer privacy policy.',
    notes: [
      'New Terms of Use, in plain words, including a note that AndThen isn’t medical advice.',
      'The privacy policy now spells out your rights, how children’s data is handled, where synced data is stored, and how changes are announced.',
      'Links to Privacy and Terms on the welcome screen and in Settings → About, plus the open-source licenses AndThen relies on.',
      'Turning on sync now mentions that you’re agreeing to the Terms and Privacy policy.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-04',
    title: 'The first numbered release of AndThen.',
    notes: [
      'Build routines that chain small habits onto something you already do, then check them off on Today with Done, Did 2 min, or Skip.',
      'Edit a routine’s anchor and habits, reorder them, or start from a template. Add a “make it easier” note to any habit.',
      'Schedule a habit for every day, certain weekdays, or a few days a week.',
      'See your week at a glance on Progress, with an 8-week dot grid and a forgiving chain that only breaks after two missed days in a row.',
      'A short weekly reflection, and a gentle nudge when a habit is one miss away from two.',
      'Reminders, a light or dark theme, and backup and restore from a file.',
      'Optional sync across your devices: sign in with a code sent to your email, and download or delete your account any time.',
      'New: this What’s new page, the version number in Settings → About, and a banner when an update is ready.',
    ],
  },
];
