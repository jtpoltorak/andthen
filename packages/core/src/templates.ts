/** One habit in a starter routine, with its ready-made 2-minute version. */
export interface TemplateHabit {
  name: string;
  twoMinuteVersion: string;
  /** A starting idea for making it easier. The person can change or clear it. */
  makeItEasier?: string;
}

/**
 * A ready-made routine: a common anchor and a short chain of tiny habits.
 * Picking one creates a normal routine the person can edit like any other.
 */
export interface RoutineTemplate {
  id: string;
  name: string;
  /** One line on what the routine is for. */
  blurb: string;
  anchor: string;
  usualTime: string;
  habits: readonly TemplateHabit[];
}

export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  {
    id: 'morning-reset',
    name: 'Morning reset',
    blurb: 'Wake up your body before you pick up your phone.',
    anchor: 'After I wake up',
    usualTime: '07:00',
    habits: [
      {
        name: 'Drink a glass of water',
        twoMinuteVersion: 'Take one sip of water',
        makeItEasier: 'Leave a glass by the sink the night before',
      },
      { name: 'Make my bed', twoMinuteVersion: 'Straighten my pillow' },
      { name: 'Stretch', twoMinuteVersion: 'Touch my toes once' },
    ],
  },
  {
    id: 'desk-breaks',
    name: 'Desk breaks',
    blurb: 'Give your eyes and back a quick break in the middle of the day.',
    anchor: 'After lunch',
    usualTime: '12:30',
    habits: [
      {
        name: 'Take a short walk',
        twoMinuteVersion: 'Stand up and walk to the window',
        makeItEasier: 'Keep comfortable shoes under my desk',
      },
      { name: 'Rest my eyes', twoMinuteVersion: 'Look at something far away for 20 seconds' },
      { name: 'Refill my water', twoMinuteVersion: 'Fill my glass once' },
    ],
  },
  {
    id: 'home-reset',
    name: 'Home reset',
    blurb: 'Switch out of work mode when you walk in the door.',
    anchor: 'After I get home',
    usualTime: '17:30',
    habits: [
      { name: 'Put my keys and bag in their spot', twoMinuteVersion: 'Hang up my keys' },
      { name: 'Tidy for 10 minutes', twoMinuteVersion: 'Put away one thing' },
      {
        name: 'Go for a walk',
        twoMinuteVersion: 'Put on my walking shoes',
        makeItEasier: 'Leave my shoes by the door',
      },
    ],
  },
  {
    id: 'wind-down',
    name: 'Wind-down',
    blurb: 'Make it easier to fall asleep and start tomorrow well.',
    anchor: 'After I brush my teeth at night',
    usualTime: '22:00',
    habits: [
      {
        name: 'Charge my phone outside the bedroom',
        twoMinuteVersion: 'Put my phone across the room',
        makeItEasier: 'Keep the charger outside the bedroom',
      },
      { name: "Plan tomorrow's first task", twoMinuteVersion: 'Write down one word for tomorrow' },
      {
        name: 'Read',
        twoMinuteVersion: 'Read one page',
        makeItEasier: 'Leave a book on my pillow',
      },
    ],
  },
];

/** Finds a template by id. */
export function routineTemplate(id: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find((t) => t.id === id);
}
