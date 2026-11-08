import { TestBed } from '@angular/core/testing';
import { addDays } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { DayGlance, GLANCE_KEPT_KEY } from './day-glance';

describe('DayGlance', () => {
  beforeEach(() => localStorage.removeItem(GLANCE_KEPT_KEY));

  async function setup(usualTime?: string) {
    const repo = new InMemoryHabitRepository();
    TestBed.configureTestingModule({
      imports: [DayGlance],
      providers: [{ provide: HABIT_REPOSITORY, useValue: repo }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createChain({
      anchor: 'After I pour my coffee',
      habitName: 'Drink water',
      twoMinuteVersion: 'One sip',
      usualTime,
    });
    const [water] = store.habitsOf(routine.id);
    const fixture = TestBed.createComponent(DayGlance);
    await fixture.whenStable();
    return { fixture, store, repo, routine, water, root: fixture.nativeElement as HTMLElement };
  }

  /** Five past days checked in at 7:25, as if from an older week. */
  async function morningsAt(repo: InMemoryHabitRepository, store: HabitStore, habitId: string) {
    for (let d = 1; d <= 5; d++) {
      await repo.putCheckIn({
        habitId,
        date: addDays(store.today(), -d),
        kind: 'full',
        at: '07:25',
      });
    }
    await store.reload();
  }

  it('stays hidden when no routine has a time', async () => {
    const { root } = await setup();
    expect(root.querySelector('.glance')).toBeNull();
  });

  it('explains itself before any times are noted', async () => {
    const { root } = await setup('07:00');
    expect(root.querySelector('.glance')?.textContent).toContain(
      'Each check-in now notes the time',
    );
    expect(root.querySelector('.visually-hidden')?.textContent).toContain('planned for');
  });

  it('notes the time on a check-in and shows it as today', async () => {
    const { fixture, store, water, root } = await setup('07:00');
    await store.checkIn(water.id, 'full');
    await fixture.whenStable();
    expect(store.todaysCheckIn(water.id)?.at).toMatch(/^\d\d:\d\d$/);
    expect(root.querySelectorAll('.today-dot').length).toBe(1);
    expect(root.querySelector('.visually-hidden')?.textContent).toContain('today at');
  });

  it('offers to move a routine that drifted, and moves it', async () => {
    const { fixture, store, repo, routine, water, root } = await setup('07:00');
    await morningsAt(repo, store, water.id);
    await fixture.whenStable();
    const move = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Move'));
    expect(root.querySelector('.suggest')?.textContent).toContain('usually starts around');
    move!.click();
    await fixture.whenStable();
    expect(store.routine(routine.id)?.usualTime).toBe('07:30');
    expect(root.querySelector('.suggest')).toBeNull();
  });

  it('remembers when you keep the planned time', async () => {
    const { fixture, store, repo, routine, water, root } = await setup('07:00');
    await morningsAt(repo, store, water.id);
    await fixture.whenStable();
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Keep'))!.click();
    await fixture.whenStable();
    expect(root.querySelector('.suggest')).toBeNull();
    expect(store.routine(routine.id)?.usualTime).toBe('07:00');
    expect(JSON.parse(localStorage.getItem(GLANCE_KEPT_KEY)!)).toEqual({ [routine.id]: '07:30' });
  });
});
