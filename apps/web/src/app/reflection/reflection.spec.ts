import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type CheckIn, type Habit, type Routine, addDays } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Today } from '../today/today';
import { Reflection } from './reflection';
import { REFLECTION_DISMISSED_KEY } from './reflection-prompt';

// 2026-10-26 is a Monday; 2026-11-01 is a Sunday.
const MON = '2026-10-26';
const SUN = '2026-11-01';

const routines: Routine[] = [
  { id: 'am', anchor: 'After I pour my coffee', order: 0, createdOn: '2026-10-01' },
  { id: 'pm', anchor: 'After I get home', order: 1, createdOn: '2026-10-01' },
];
const habits: Habit[] = [
  {
    id: 'water',
    routineId: 'am',
    name: 'Drink water',
    twoMinuteVersion: 'One sip',
    order: 0,
    createdOn: '2026-10-01',
  },
  {
    id: 'read',
    routineId: 'am',
    name: 'Read 20 pages',
    twoMinuteVersion: 'Read one page',
    order: 1,
    createdOn: '2026-10-01',
  },
];
// Water every day; reading only on Monday.
const checkIns: CheckIn[] = [
  ...Array.from({ length: 7 }, (_, i) => ({
    habitId: 'water',
    date: addDays(MON, i),
    kind: 'full' as const,
  })),
  { habitId: 'read', date: MON, kind: 'full' },
];

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

describe('Weekly reflection', () => {
  let repo: InMemoryHabitRepository;

  async function setup<T>(component: Type<T>, today = SUN) {
    localStorage.removeItem(REFLECTION_DISMISSED_KEY);
    repo = new InMemoryHabitRepository({ routines, habits, checkIns });
    TestBed.configureTestingModule({
      imports: [component],
      providers: [provideRouter([]), { provide: HABIT_REPOSITORY, useValue: repo }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    store.today.set(today);
    const fixture = TestBed.createComponent(component);
    await fixture.whenStable();
    return { fixture, store, root: fixture.nativeElement as HTMLElement };
  }

  it('shows how each habit went, and offers easier versions only for a hard week', async () => {
    const { root } = await setup(Reflection);
    expect(root.textContent).toContain('Every day so far (7 days)');
    expect(root.textContent).toContain('1 of 6 days'); // Today isn't counted until it's answered.
    expect(buttonsByText(root, 'Shrink it to “Read one page”')).toHaveLength(1);
    expect(buttonsByText(root, 'Move it to “After I get home”')).toHaveLength(1);
    expect(buttonsByText(root, 'Do it first in its chain')).toHaveLength(1);
    // Water had a great week: nothing to change.
    expect(root.querySelectorAll('.tweaks')).toHaveLength(1);
  });

  it('shrinks a habit in one tap, and undoes it', async () => {
    const { fixture, store, root } = await setup(Reflection);
    buttonsByText(root, 'Shrink it')[0].click();
    await fixture.whenStable();
    expect(store.habits().find((h) => h.id === 'read')?.name).toBe('Read one page');
    expect(root.textContent).toContain('Now “Read one page”.');

    buttonsByText(root, 'Undo')[0].click();
    await fixture.whenStable();
    expect(store.habits().find((h) => h.id === 'read')?.name).toBe('Read 20 pages');
    expect((await repo.loadAll()).habits.find((h) => h.id === 'read')?.name).toBe('Read 20 pages');
  });

  it('moves a habit to another anchor, keeping its check-ins, and undoes it', async () => {
    const { fixture, store, root } = await setup(Reflection);
    buttonsByText(root, 'Move it to')[0].click();
    await fixture.whenStable();
    expect(store.habitsOf('pm').map((h) => h.name)).toEqual(['Read 20 pages']);
    expect(store.habitsOf('am').map((h) => h.name)).toEqual(['Drink water']);
    expect(store.checkIns().filter((c) => c.habitId === 'read')).toHaveLength(1);

    buttonsByText(root, 'Undo')[0].click();
    await fixture.whenStable();
    expect(store.habitsOf('am').map((h) => h.name)).toEqual(['Drink water', 'Read 20 pages']);
    expect(store.habitsOf('pm')).toEqual([]);
  });

  it('moves a habit to the front of its chain, and undo puts the order back', async () => {
    const { fixture, store, root } = await setup(Reflection);
    buttonsByText(root, 'Do it first')[0].click();
    await fixture.whenStable();
    expect(store.habitsOf('am').map((h) => h.id)).toEqual(['read', 'water']);

    buttonsByText(root, 'Undo')[0].click();
    await fixture.whenStable();
    expect(store.habitsOf('am').map((h) => h.id)).toEqual(['water', 'read']);
  });

  it('saves the notes for the week and goes back to Today', async () => {
    const { fixture, store, root } = await setup(Reflection);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const wentWell = root.querySelector<HTMLTextAreaElement>('#went-well')!;
    wentWell.value = '  Water every day  ';
    wentWell.dispatchEvent(new Event('input'));
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.reflections()).toEqual([{ week: MON, wentWell: 'Water every day', savedOn: SUN }]);
    expect((await repo.loadAll()).reflections).toHaveLength(1);
    expect(navigate).toHaveBeenCalledWith('/today');
  });

  it('reminds you of last week’s plan', async () => {
    const { fixture, store, root } = await setup(Reflection);
    await store.saveReflection(addDays(MON, -7), { tweak: 'Book on the pillow' });
    await fixture.whenStable();
    expect(root.textContent).toContain('Last week you planned: “Book on the pillow”');
  });

  describe('on Today', () => {
    it('asks on Sunday, and stops once the week is reflected on', async () => {
      const { fixture, store, root } = await setup(Today);
      expect(root.textContent).toContain('Weekly reflection');
      expect(root.querySelector('a[href="/reflect"]')).not.toBeNull();

      await store.saveReflection(MON, {});
      await fixture.whenStable();
      expect(root.textContent).not.toContain('Weekly reflection');
    });

    it('still asks on Monday, about the week that just ended', async () => {
      const { root } = await setup(Today, addDays(SUN, 1));
      expect(root.textContent).toContain('Weekly reflection');
    });

    it('does not ask midweek', async () => {
      const { root } = await setup(Today, '2026-10-29');
      expect(root.textContent).not.toContain('Weekly reflection');
    });

    it('can be put away for the week', async () => {
      const { fixture, root } = await setup(Today);
      buttonsByText(root, 'Not this week')[0].click();
      await fixture.whenStable();
      expect(root.textContent).not.toContain('Weekly reflection');
      expect(localStorage.getItem(REFLECTION_DISMISSED_KEY)).toBe(JSON.stringify(MON));
      localStorage.removeItem(REFLECTION_DISMISSED_KEY);
    });
  });
});
