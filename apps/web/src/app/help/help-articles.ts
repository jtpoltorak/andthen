/**
 * Every help article, in reading order. The help home, article pages, search filter
 * and the "?" links around the app all read from this list.
 *
 * No Angular imports here: the "?" links load this into the main bundle, so it stays
 * small. Article bodies live in ./articles and load only when Help is opened.
 */
export type HelpPart = 'habits' | 'using' | 'questions';

export interface HelpArticleInfo {
  slug: string;
  part: HelpPart;
  title: string;
  /** One line for the help home. */
  summary: string;
  /** Extra words the filter box matches. */
  keywords: string;
  minutes: number;
  related: readonly string[];
}

export const HELP_PARTS: readonly { id: HelpPart; title: string; intro: string }[] = [
  {
    id: 'habits',
    title: 'How habits stick',
    intro: 'The ideas AndThen is built on, in a few short reads.',
  },
  {
    id: 'using',
    title: 'Using AndThen',
    intro: 'What each screen does, and how to get the most from it.',
  },
  {
    id: 'questions',
    title: 'Questions and fixes',
    intro: 'Quick answers when something isn’t working the way you expect.',
  },
];

export const HELP_ARTICLES = [
  // How habits stick
  {
    slug: 'start-small',
    part: 'habits',
    title: 'Start smaller than feels useful',
    summary: 'Why a 2-minute version beats willpower.',
    keywords: 'tiny two minute motivation willpower easy',
    minutes: 2,
    related: ['showing-up', 'today'],
  },
  {
    slug: 'anchors',
    part: 'habits',
    title: 'Anchor it to something you already do',
    summary: 'A new habit needs a reliable cue. Your existing routine is full of them.',
    keywords: 'cue trigger after I when then stacking implementation intention',
    minutes: 2,
    related: ['chains', 'routines'],
  },
  {
    slug: 'chains',
    part: 'habits',
    title: 'Chain it: one habit cues the next',
    summary: 'The idea behind the name AndThen.',
    keywords: 'stacking sequence routine and then order',
    minutes: 2,
    related: ['anchors', 'routines'],
  },
  {
    slug: 'make-it-easy',
    part: 'habits',
    title: 'Make the good choice the easy one',
    summary: 'Arrange your space so starting takes no effort.',
    keywords: 'environment friction obstacle setup prepare easier',
    minutes: 2,
    related: ['easier-notes', 'start-small'],
  },
  {
    slug: 'feel-finished',
    part: 'habits',
    title: 'Make it feel finished',
    summary: 'Why checking something off matters more than it seems.',
    keywords: 'reward satisfaction done check off progress',
    minutes: 2,
    related: ['today', 'progress'],
  },
  {
    slug: 'showing-up',
    part: 'habits',
    title: 'Showing up beats perfect',
    summary: 'A 2-minute day still counts. Here’s why.',
    keywords: 'consistency identity repetition mini busy',
    minutes: 2,
    related: ['start-small', 'never-miss-twice'],
  },
  {
    slug: 'never-miss-twice',
    part: 'habits',
    title: 'Never miss twice',
    summary: 'Slips are normal. Two in a row is where habits fade.',
    keywords: 'miss slip streak lapse forgive restart',
    minutes: 2,
    related: ['nudges', 'progress'],
  },
  {
    slug: 'how-long',
    part: 'habits',
    title: 'How long it really takes',
    summary: 'Weeks to months, not 21 days, and that’s fine.',
    keywords: '21 days 66 days automatic time research',
    minutes: 2,
    related: ['showing-up', 'reflect-adjust'],
  },
  {
    slug: 'reflect-adjust',
    part: 'habits',
    title: 'Reflect and adjust',
    summary: 'When a habit keeps slipping, change the habit, not your opinion of yourself.',
    keywords: 'review weekly tweak change struggle',
    minutes: 2,
    related: ['reflection', 'make-it-easy'],
  },
  {
    slug: 'further-reading',
    part: 'habits',
    title: 'Further reading and credits',
    summary: 'Books and research on building habits, and what each is good for.',
    keywords:
      'atomic habits james clear tiny habits bj fogg wendy wood good habits bad habits power of habit duhigg how to change milkman better than before rubin research study studies papers books sources further reading lally gollwitzer',
    minutes: 3,
    related: ['start-small', 'anchors'],
  },

  // Using AndThen
  {
    slug: 'getting-started',
    part: 'using',
    title: 'Getting started',
    summary: 'Your first routine in about a minute.',
    keywords: 'welcome first setup begin new onboarding',
    minutes: 2,
    related: ['today', 'templates'],
  },
  {
    slug: 'today',
    part: 'using',
    title: 'Today: Done, Did 2 min, Skip, and Run',
    summary: 'What each answer means, how to undo one, and running a routine step by step.',
    keywords:
      'check in done mini skip undo today screen run focus one at a time step by step journal note mood feel ring progress',
    minutes: 2,
    related: ['nudges', 'progress'],
  },
  {
    slug: 'routines',
    part: 'using',
    title: 'Routines and the chain editor',
    summary: 'Change an anchor, pick an icon, add, reorder and remove habits.',
    keywords: 'edit routine anchor icon picture habit reorder remove usual time chain editor',
    minutes: 3,
    related: ['schedules', 'easier-notes', 'share'],
  },
  {
    slug: 'templates',
    part: 'using',
    title: 'Ready-made routines',
    summary: 'Start from a template and make it yours.',
    keywords: 'template starter morning desk home wind-down',
    minutes: 1,
    related: ['routines', 'getting-started'],
  },
  {
    slug: 'easier-notes',
    part: 'using',
    title: 'Habit notes: your why, and make it easier',
    summary: 'Remember why it matters, and plan for what gets in the way.',
    keywords: 'why reason motivation obstacle easier note make it easy plan',
    minutes: 1,
    related: ['make-it-easy', 'routines'],
  },
  {
    slug: 'schedules',
    part: 'using',
    title: 'Flexible schedules',
    summary: 'Every day, some days, or a few times a week.',
    keywords: 'schedule weekdays days times a week rest day',
    minutes: 2,
    related: ['routines', 'progress'],
  },
  {
    slug: 'pause',
    part: 'using',
    title: 'Pausing a routine',
    summary: 'Take a break for travel, illness or a busy stretch, without losing your chain.',
    keywords: 'pause break vacation holiday travel sick ill resume skip days',
    minutes: 1,
    related: ['never-miss-twice', 'routines'],
  },
  {
    slug: 'share',
    part: 'using',
    title: 'Sharing a routine',
    summary: 'Send a friend a link that sets up the same chain.',
    keywords: 'share send friend link copy routine together accountability',
    minutes: 1,
    related: ['routines', 'templates'],
  },
  {
    slug: 'reminders',
    part: 'using',
    title: 'Reminders',
    summary: 'A quiet nudge around a routine’s usual time.',
    keywords: 'notification remind alert iphone android usual time',
    minutes: 2,
    related: ['install', 'no-reminders'],
  },
  {
    slug: 'progress',
    part: 'using',
    title: 'Reading your Progress',
    summary:
      'Your garden, the weekly recap, the dot grid, the forgiving chain, and the trend line.',
    keywords:
      'progress dots grid chain streak recap week stats trend line steadier garden plant grow seed sprout bloom share instagram story post social year calendar month heatmap',
    minutes: 3,
    related: ['never-miss-twice', 'reflection'],
  },
  {
    slug: 'reflection',
    part: 'using',
    title: 'Weekly reflection',
    summary: 'Two minutes at the end of the week.',
    keywords: 'reflect review week went well tweak',
    minutes: 2,
    related: ['reflect-adjust', 'progress'],
  },
  {
    slug: 'nudges',
    part: 'using',
    title: 'The “don’t miss twice” nudge',
    summary: 'What the gentle badges on Today mean.',
    keywords: 'nudge badge missed welcome back',
    minutes: 1,
    related: ['never-miss-twice', 'today'],
  },
  {
    slug: 'make-it-yours',
    part: 'using',
    title: 'Make it yours: name, look and color',
    summary: 'A hello by name, light or dark, an accent color, larger text, and when weeks start.',
    keywords:
      'name theme dark mode light color colour accent blue plum clay slate week start sunday larger bigger text font size zoom contrast accessibility',
    minutes: 1,
    related: ['progress', 'install'],
  },
  {
    slug: 'install',
    part: 'using',
    title: 'Install AndThen as an app',
    summary: 'Put it on your home screen or desktop.',
    keywords: 'install home screen pwa app iphone android desktop offline',
    minutes: 2,
    related: ['reminders', 'updates'],
  },
  {
    slug: 'backup',
    part: 'using',
    title: 'Backup and restore',
    summary: 'Save a copy of everything, and bring it back.',
    keywords: 'backup restore file export import download',
    minutes: 2,
    related: ['sync', 'new-device'],
  },
  {
    slug: 'sync',
    part: 'using',
    title: 'Sync across devices',
    summary: 'Sign in with an email code to share your habits between devices.',
    keywords: 'sync account email code sign in devices delete export sign out lost phone',
    minutes: 3,
    related: ['backup', 'where-data'],
  },
  {
    slug: 'start-over',
    part: 'using',
    title: 'Starting over',
    summary: 'Clear this device and begin again.',
    keywords: 'reset delete clear start over',
    minutes: 1,
    related: ['backup', 'sync'],
  },

  // Questions and fixes
  {
    slug: 'where-data',
    part: 'questions',
    title: 'Where is my data?',
    summary: 'On your device, unless you turn on sync.',
    keywords: 'privacy storage data where safe',
    minutes: 1,
    related: ['sync', 'backup'],
  },
  {
    slug: 'no-reminders',
    part: 'questions',
    title: 'My reminders didn’t arrive',
    summary: 'The usual reasons, and what to check.',
    keywords: 'reminder notification not working blocked',
    minutes: 2,
    related: ['reminders', 'install'],
  },
  {
    slug: 'updates',
    part: 'questions',
    title: 'I don’t see the latest version',
    summary: 'How updates arrive, and how to hurry one along.',
    keywords: 'update version new old stale reload cache',
    minutes: 1,
    related: ['install', 'contact'],
  },
  {
    slug: 'new-device',
    part: 'questions',
    title: 'I lost or replaced my phone',
    summary: 'Getting your habits onto a new device.',
    keywords: 'new phone lost device move transfer',
    minutes: 1,
    related: ['sync', 'backup'],
  },
  {
    slug: 'contact',
    part: 'questions',
    title: 'Something’s wrong, or I have an idea',
    summary: 'How to reach us, and our accessibility commitment.',
    keywords: 'contact email bug feedback accessibility screen reader keyboard',
    minutes: 1,
    related: ['updates', 'where-data'],
  },
] as const satisfies readonly HelpArticleInfo[];

export type HelpSlug = (typeof HELP_ARTICLES)[number]['slug'];

export function helpArticle(slug: string): HelpArticleInfo | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}
