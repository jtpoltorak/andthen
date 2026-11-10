import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Habit, Routine } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { PROGRESS_VIEW_KEY, Progress } from './progress';

// A Tuesday.
const TODAY = '2026-11-10';

const routine = (id: string, over: Partial<Routine> = {}): Routine => ({
  id,
  anchor: `After ${id}`,
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

const habit = (id: string, routineId: string, over: Partial<Habit> = {}): Habit => ({
  id,
  routineId,
  name: `Habit ${id}`,
  twoMinuteVersion: 'tiny',
  order: 0,
  createdOn: '2026-10-01',
  ...over,
});

describe('Progress grid view', () => {
  beforeEach(() => localStorage.removeItem(PROGRESS_VIEW_KEY));
  afterEach(() => localStorage.removeItem(PROGRESS_VIEW_KEY));

  async function setup(seed: ConstructorParameters<typeof InMemoryHabitRepository>[0]) {
    const repo = new InMemoryHabitRepository(seed);
    TestBed.configureTestingModule({
      imports: [Progress],
      providers: [provideRouter([]), { provide: HABIT_REPOSITORY, useValue: repo }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    store.today.set(TODAY);
    const fixture = TestBed.createComponent(Progress);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const click = async (el: Element | null | undefined) => {
      (el as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      // Let the store's writes finish, then draw again.
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { root, store, repo, click };
  }

  const seed = () => ({
    routines: [routine('am'), routine('pm', { order: 1 })],
    habits: [habit('water', 'am'), habit('stretch', 'am', { order: 1 }), habit('read', 'pm')],
    checkIns: [
      { habitId: 'water', date: '2026-11-09', kind: 'full' as const },
      { habitId: 'water', date: '2026-11-08', kind: 'mini' as const, note: 'Busy day' },
    ],
  });

  const switchButton = (root: HTMLElement, name: string) =>
    Array.from(root.querySelectorAll('.view-switch button')).find(
      (b) => b.textContent?.trim() === name,
    );

  it('switches to the grid and remembers it, grouped by routine with 7 days', async () => {
    const { root, click } = await setup(seed());
    expect(root.querySelector('app-habit-grid')).toBeNull();
    expect(switchButton(root, 'Overview')?.getAttribute('aria-pressed')).toBe('true');

    await click(switchButton(root, 'Grid'));
    expect(root.querySelector('app-habit-grid')).not.toBeNull();
    expect(root.querySelector('.recap')).toBeNull();
    expect(localStorage.getItem(PROGRESS_VIEW_KEY)).toBe('"grid"');

    const anchors = Array.from(root.querySelectorAll('.hg-anchor')).map((a) =>
      a.textContent?.trim(),
    );
    expect(anchors).toEqual(['After am', 'After pm']);
    const names = Array.from(root.querySelectorAll('.hg-habit-name')).map((n) =>
      n.textContent?.trim(),
    );
    expect(names).toEqual(['Habit water', 'Habit stretch', 'Habit read']);
    const water = root.querySelectorAll('.hg-habit')[0];
    const marks = Array.from(water.querySelectorAll('.hg-mark')).map((m) =>
      Array.from(m.classList).find(
        (c) => c !== 'hg-mark' && c.startsWith('hg-') && c !== 'hg-noted',
      ),
    );
    // Nov 4 to Nov 10.
    expect(marks).toEqual([
      'hg-missed',
      'hg-missed',
      'hg-missed',
      'hg-missed',
      'hg-mini',
      'hg-full',
      'hg-open',
    ]);
    expect(water.querySelectorAll('.hg-noted')).toHaveLength(1);
    expect(root.textContent).toContain('The last 7 days can be changed');
  });

  it('opens on the grid when it was the last view used', async () => {
    localStorage.setItem(PROGRESS_VIEW_KEY, '"grid"');
    const { root } = await setup(seed());
    expect(root.querySelector('app-habit-grid')).not.toBeNull();
  });

  it('changes a recent day, and clears it again', async () => {
    localStorage.setItem(PROGRESS_VIEW_KEY, '"grid"');
    const { root, store, repo, click } = await setup(seed());
    const stretch = root.querySelectorAll('.hg-habit')[1];
    const yesterday = stretch.querySelectorAll('button.hg-cell')[5];
    expect(yesterday.getAttribute('aria-label')).toContain('No check-in');

    await click(yesterday);
    const dialog = root.querySelector('dialog.hg-editor') as HTMLElement;
    expect(dialog.textContent).toContain('Yesterday');
    expect(dialog.textContent).toContain('Habit stretch');
    const choice = (name: string) =>
      Array.from(dialog.querySelectorAll('button')).find((b) =>
        b.textContent?.trim().startsWith(name),
      );
    await click(choice('Did 2 min'));
    expect(store.checkIns().find((c) => c.habitId === 'stretch')).toEqual({
      habitId: 'stretch',
      date: '2026-11-09',
      kind: 'mini',
    });
    expect((await repo.loadAll()).checkIns).toHaveLength(3);
    expect(
      root.querySelectorAll('.hg-habit')[1].querySelectorAll('.hg-mark')[5].classList,
    ).toContain('hg-mini');

    await click(root.querySelectorAll('.hg-habit')[1].querySelectorAll('button.hg-cell')[5]);
    await click(choice('Clear this day'));
    expect(store.checkIns().some((c) => c.habitId === 'stretch')).toBe(false);
  });

  it('keeps older weeks view-only', async () => {
    localStorage.setItem(PROGRESS_VIEW_KEY, '"grid"');
    const { root, click } = await setup(seed());
    await click(root.querySelector('[aria-label="Earlier week"]'));
    expect(root.textContent).toContain('Oct 28');
    expect(root.querySelectorAll('.hg-habit button.hg-cell')).toHaveLength(0);
    expect(root.querySelector('.hg-habit .hg-cell')?.getAttribute('aria-label')).toContain(
      'view only',
    );
    expect(root.textContent).toContain('Older days are view-only');
  });

  it('opens a week from the 30-day glance', async () => {
    localStorage.setItem(PROGRESS_VIEW_KEY, '"grid"');
    const { root, click } = await setup(seed());
    const thirty = Array.from(root.querySelectorAll('.hg-chip')).find(
      (b) => b.textContent?.trim() === '30 days',
    );
    await click(thirty);
    const cells = root.querySelectorAll('.hg-habit')[0].querySelectorAll('button.hg-cell');
    expect(cells).toHaveLength(30);
    // Oct 21, 20 days back: its rolling week is Oct 21 to Oct 27.
    await click(cells[9]);
    expect(root.querySelectorAll('.hg-habit')[0].querySelectorAll('.hg-cell')).toHaveLength(7);
    expect(root.textContent).toContain('Oct 21 – Oct 27');
  });
});
