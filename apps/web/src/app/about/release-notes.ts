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
