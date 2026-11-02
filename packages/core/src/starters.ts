/** Suggested first habits, each with a ready-made 2-minute version. */
export const STARTER_HABITS: readonly { name: string; twoMinuteVersion: string }[] = [
  { name: 'Drink water', twoMinuteVersion: 'Take one sip of water' },
  { name: 'Stretch', twoMinuteVersion: 'Touch my toes once' },
  { name: 'Read', twoMinuteVersion: 'Read one page' },
  { name: 'Walk', twoMinuteVersion: 'Put on my walking shoes' },
  { name: 'Journal', twoMinuteVersion: 'Write one sentence' },
  { name: 'Meditate', twoMinuteVersion: 'Take three slow breaths' },
];

/** Common daily anchors, with a typical time used only to order routines. */
export const STARTER_ANCHORS: readonly { anchor: string; usualTime: string }[] = [
  { anchor: 'After I wake up', usualTime: '07:00' },
  { anchor: 'After I pour my coffee', usualTime: '07:30' },
  { anchor: 'After lunch', usualTime: '12:30' },
  { anchor: 'After I get home', usualTime: '17:30' },
  { anchor: 'After I brush my teeth at night', usualTime: '22:00' },
];

/** A default 2-minute version for a habit the person typed themselves. */
export function suggestTwoMinuteVersion(habitName: string): string {
  const name = habitName.trim();
  if (!name) return '';
  const preset = STARTER_HABITS.find((h) => h.name.toLowerCase() === name.toLowerCase());
  if (preset) return preset.twoMinuteVersion;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} for 2 minutes`;
}
