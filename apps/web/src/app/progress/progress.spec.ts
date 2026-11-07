import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { addDays, type CheckIn, type Habit, type Routine } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Progress } from './progress';

// A Friday, so "this week" is Monday 2026-11-02 to today.
const TODAY = '2026-11-06';

const routine = (id: string, over: Partial<Routine> = {}): Routine => ({
  id,
  anchor: `Anchor ${id}`,
  order: 0,
  createdOn: '2026-10-20',
  ...over,
});

const habit = (id: string, routineId: string, over: Partial<Habit> = {}): Habit => ({
  id,
  routineId,
  name: `Habit ${id}`,
  twoMinuteVersion: 'tiny',
  order: 0,
  createdOn: '2026-10-20',
  ...over,
});

const days = (from: string, count: number, habitId: string, kind: CheckIn['kind']): CheckIn[] =>
  Array.from({ length: count }, (_, i) => ({ habitId, date: addDays(from, i), kind }));

describe('Progress', () => {
  async function setup(seed: ConstructorParameters<typeof InMemoryHabitRepository>[0]) {
    TestBed.configureTestingModule({
      imports: [Progress],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository(seed) },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    store.today.set(TODAY);
    const fixture = TestBed.createComponent(Progress);
    await fixture.whenStable();
    return { root: fixture.nativeElement as HTMLElement };
  }

  it('recaps the week and shows a forgiving chain per habit', async () => {
    const { root } = await setup({
      routines: [routine('am')],
      habits: [habit('water', 'am')],
      checkIns: [
        // Done Oct 30 to Nov 3, missed Nov 4, 2-minute version Nov 5. Today still open.
        ...days('2026-10-30', 5, 'water', 'full'),
        { habitId: 'water', date: '2026-11-05', kind: 'mini' },
      ],
    });
    const text = root.textContent ?? '';
    expect(text).toContain('Showed up 3 of 5 days');
    expect(text).toContain('2 done');
    expect(text).toContain('1 as 2 min');
    expect(text).toContain('Habit water');
    expect(text).toContain('7 days'); // The single miss doesn't break the chain.
    expect(text).toMatch(/Done\s+6\s+times\s+1 as the 2-minute version/);
    // Started Oct 20, so the grid starts that week: three columns, not eight.
    expect(root.querySelectorAll('.week')).toHaveLength(3);
    expect(root.querySelectorAll('.dot-full').length).toBeGreaterThanOrEqual(5);
    expect(root.querySelector('.dot-open')?.getAttribute('title')).toContain('not checked in yet');
    // Saturday and Sunday are still to come.
    expect(root.querySelectorAll('.dot-upcoming')).toHaveLength(2);
    expect(root.querySelector('.grid')?.getAttribute('aria-label')).toContain('Since Oct 19');
    expect(
      Array.from(root.querySelectorAll('.weekdays span')).map((s) => s.textContent?.trim()),
    ).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });

  it('shows 8 weeks once a habit is older than that', async () => {
    const { root } = await setup({
      routines: [routine('am', { createdOn: '2026-08-01' })],
      habits: [habit('water', 'am', { createdOn: '2026-08-01' })],
      checkIns: [],
    });
    expect(root.querySelectorAll('.week')).toHaveLength(8);
    expect(root.querySelector('.grid')?.getAttribute('aria-label')).toContain('Last 8 weeks');
  });

  it('draws a trend line once there are three weeks to compare', async () => {
    const { root } = await setup({
      routines: [routine('am', { createdOn: '2026-08-01' })],
      habits: [
        // Done only on Mondays at first, then every day for the last four weeks.
        habit('water', 'am', { createdOn: '2026-09-14' }),
        // Too new for a trend.
        habit('floss', 'am', { createdOn: '2026-11-02', order: 1 }),
      ],
      checkIns: [
        ...['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].flatMap((d) =>
          days(d, 1, 'water', 'full'),
        ),
        ...days('2026-10-12', 26, 'water', 'full'),
      ],
    });
    const trends = root.querySelectorAll('.trend');
    expect(trends.length).toBe(1);
    expect(trends[0].classList).toContain('trend-up');
    expect(trends[0].textContent).toContain('Getting steadier');
    const line = trends[0].querySelector('svg')!;
    expect(line.getAttribute('aria-label')).toMatch(/^Weekly trend, share of days done: 14%, /);
    expect(line.querySelectorAll('path').length).toBe(1);
  });

  it('starts a brand-new habit with one week of rings to fill', async () => {
    const { root } = await setup({
      routines: [routine('am', { createdOn: TODAY })],
      habits: [
        habit('water', 'am', {
          createdOn: TODAY,
          schedule: { kind: 'days', days: [1, 2, 3, 4, 5, 6] },
        }),
      ],
      checkIns: [],
    });
    expect(root.querySelectorAll('.week')).toHaveLength(1);
    expect(root.querySelectorAll('.dot-open')).toHaveLength(1);
    // Saturday is planned; Sunday is a rest day.
    expect(root.querySelectorAll('.dot-upcoming')).toHaveLength(1);
    expect(root.querySelectorAll('.grid .dot-rest')).toHaveLength(1);
  });

  it('shows a habit\'s "why" under its name', async () => {
    const { root } = await setup({
      routines: [routine('am')],
      habits: [habit('water', 'am', { why: 'So I stop getting headaches' }), habit('floss', 'am')],
      checkIns: [],
    });
    const notes = [...root.querySelectorAll('.why-note')].map((n) => n.textContent?.trim());
    expect(notes).toEqual(['So I stop getting headaches']);
  });

  it('keeps retired habits and routines in history', async () => {
    const { root } = await setup({
      routines: [routine('am'), routine('old', { archivedOn: '2026-11-01' })],
      habits: [
        habit('water', 'am'),
        habit('floss', 'am', { archivedOn: '2026-11-03' }),
        habit('read', 'old'),
      ],
      checkIns: [
        ...days('2026-10-25', 4, 'floss', 'full'),
        ...days('2026-10-26', 3, 'read', 'mini'),
      ],
    });
    const text = root.textContent ?? '';
    expect(text).toContain('Retired habits (1)');
    expect(text).toContain('Habit floss');
    expect(text).toContain('Retired routines (1)');
    expect(text).toContain('Anchor old');
    expect(text).toContain('Habit read');
    expect(text).toContain('Best chain: 4 days');
    expect(text).toContain('Starts with one check-in');
  });

  it('grows a plant per routine in the garden, and rests a paused one', async () => {
    const { root } = await setup({
      routines: [
        routine('am', { name: 'Morning' }),
        routine('pm', { order: 1, pauses: [{ from: '2026-11-04' }] }),
      ],
      habits: [habit('water', 'am'), habit('read', 'pm')],
      checkIns: [
        ...days('2026-10-30', 5, 'water', 'full'),
        { habitId: 'water', date: '2026-11-05', kind: 'mini' },
        { habitId: 'water', date: '2026-11-04', kind: 'skip' },
        ...days('2026-10-28', 2, 'read', 'full'),
      ],
    });
    const plots = [...root.querySelectorAll('.plot')].map((p) => p.textContent ?? '');
    expect(plots).toHaveLength(2);
    // Five Done and one 2 min; the skip doesn't count.
    expect(plots[0]).toMatch(/Morning[\s\S]*Seedling · 6[\s\S]*9 more to a young plant/);
    expect(plots[1]).toMatch(/Sprout · 2[\s\S]*Resting while paused/);
    expect(root.querySelectorAll('.plot-resting')).toHaveLength(1);
  });
});
