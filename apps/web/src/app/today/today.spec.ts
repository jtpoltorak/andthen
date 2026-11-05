import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Today } from './today';

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

describe('Today', () => {
  async function setup(opts: { startedYesterday?: boolean; empty?: boolean } = {}) {
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    if (!opts.empty) {
      const now = new Date();
      if (opts.startedYesterday) store.refreshDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const routine = await store.createChain({
        anchor: 'After I pour my coffee',
        habitName: 'Drink water',
        twoMinuteVersion: 'Take one sip of water',
      });
      await store.addLink(routine.id, 'Stretch', 'Touch my toes once');
      store.refreshDay(now);
    }
    const fixture = TestBed.createComponent(Today);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('shows the anchor and asks about the first link', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('After I pour my coffee');
    expect(root.textContent).toContain('Tiny version: take one sip of water');
    expect(buttonsByText(root, 'Done')).toHaveLength(1);
  });

  it('shows the "make it easy" note only for the habit that is up next', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const [water, stretch] = store.habitsOf(store.activeRoutines()[0].id);
    await store.updateHabit(stretch.id, { makeItEasier: 'Keep the mat out' });
    await fixture.whenStable();
    expect(root.textContent).not.toContain('Make it easy');

    await store.checkIn(water.id, 'full');
    await fixture.whenStable();
    expect(root.textContent).toContain('Make it easy: Keep the mat out');
  });

  it('moves to the next link after "Did 2 min", then completes after a skip', async () => {
    const { fixture, root } = await setup();

    buttonsByText(root, 'Did 2 min')[0].click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Did the 2-minute version');
    expect(root.textContent).toContain('Tiny version: touch my toes once');

    buttonsByText(root, 'Skip')[0].click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Chain complete');
    expect(root.textContent).toContain('1 of 2');
  });

  it('pops the ring on a check-in and celebrates a finished chain, but not on a skip', async () => {
    const { fixture, root } = await setup();

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.ring-pop')).toHaveLength(1);
    expect(root.querySelector('.complete-celebrate')).toBeNull();

    buttonsByText(root, 'Skip')[0].click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.ring-pop')).toHaveLength(0);
    expect(root.querySelector('.complete-celebrate')).not.toBeNull();
    expect(root.querySelectorAll('.spark')).toHaveLength(8);
  });

  it('does not celebrate a chain that was already complete when the page opened', async () => {
    const { root } = await setup();
    const store = TestBed.inject(HabitStore);
    for (const habit of store.habitsOf(store.activeRoutines()[0].id)) {
      await store.checkIn(habit.id, 'full');
    }
    const fixture = TestBed.createComponent(Today);
    await fixture.whenStable();
    const fresh = fixture.nativeElement as HTMLElement;
    expect(fresh.textContent).toContain('Chain complete');
    expect(fresh.querySelector('.complete-celebrate')).toBeNull();
    expect(root).toBeTruthy();
  });

  it('lists a paused routine apart, and brings it back on Resume', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const id = store.activeRoutines()[0].id;
    await store.pauseRoutine(id, 7);
    await fixture.whenStable();
    expect(buttonsByText(root, 'Done')).toHaveLength(0);
    expect(root.querySelector('.paused')?.textContent).toContain('After I pour my coffee');
    expect(root.querySelector('.paused-note')?.textContent).toContain('Paused through');
    expect(root.textContent).toContain('Taking a break');

    buttonsByText(root, 'Resume')[0].click();
    await fixture.whenStable();
    expect(root.querySelector('.paused')).toBeNull();
    expect(buttonsByText(root, 'Done')).toHaveLength(1);
  });

  it('moves focus to the next habit after a check-in, then to "Chain complete"', async () => {
    const { fixture, root } = await setup();

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(document.activeElement?.textContent?.trim()).toBe('Done Stretch');

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(document.activeElement?.classList).toContain('complete');
  });

  it('after a missed day, offers the 2-minute version first in tab order too', async () => {
    const { root } = await setup({ startedYesterday: true });
    expect(root.textContent).toContain("don't miss twice");
    const actions = [...root.querySelectorAll('.actions button')].map((b) => b.textContent?.trim());
    expect(actions[0]).toMatch(/^Did 2 min/);
  });

  it('highlights every habit missed yesterday, not just the next one', async () => {
    const { root } = await setup({ startedYesterday: true });
    expect(root.querySelectorAll('.badge')).toHaveLength(2);
    expect(root.querySelectorAll('.ring-nudge')).toHaveLength(2);
  });

  it('drops the nudge once the habit is answered today', async () => {
    const { fixture, root } = await setup({ startedYesterday: true });
    buttonsByText(root, 'Did 2 min')[0].click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.badge')).toHaveLength(1);
  });

  it('shows a collapsed routine has a habit to keep alive', async () => {
    const { fixture, root } = await setup({ startedYesterday: true });
    const store = TestBed.inject(HabitStore);
    // A second routine, also started yesterday, shows collapsed below the open one.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    store.refreshDay(yesterday);
    await store.createChain({
      anchor: 'After I get home',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    store.refreshDay(new Date());
    await fixture.whenStable();
    const collapsed = root.querySelector('.collapsed');
    expect(collapsed?.textContent).toContain('1 habit to keep alive today');
  });

  it('closes "+ and then..." with Escape and returns focus to it', async () => {
    const { fixture, root } = await setup();
    buttonsByText(root, '+ and then')[0].click();
    await fixture.whenStable();
    const input = root.querySelector<HTMLInputElement>('#next-link')!;
    expect(document.activeElement).toBe(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(root.querySelector('#next-link')).toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('+ and then...');
  });

  it('points to a new routine when nothing is on today', async () => {
    const { root } = await setup({ empty: true });
    expect(root.textContent).toContain("Nothing on today's list");
    expect(root.querySelector('a.empty-action')?.textContent?.trim()).toBe('Start a routine');
  });

  describe('with schedules', () => {
    it('leaves a resting habit off the list, and says when a whole routine rests', async () => {
      const { fixture, root } = await setup();
      const store = TestBed.inject(HabitStore);
      const [water, stretch] = store.habitsOf(store.activeRoutines()[0].id);
      const today = new Date(store.today() + 'T12:00:00').getDay();
      const notToday = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== today);
      await store.updateHabit(water.id, { schedule: { kind: 'days', days: notToday } });
      await fixture.whenStable();
      expect(root.textContent).not.toContain('Drink water');
      expect(root.textContent).toContain('Stretch');

      await store.updateHabit(stretch.id, { schedule: { kind: 'days', days: notToday } });
      await fixture.whenStable();
      expect(root.textContent).toContain('A rest day');
      expect(root.textContent).toContain('Resting today: After I pour my coffee');
    });

    it('shows the week’s count for a times-a-week habit', async () => {
      const { fixture, root } = await setup();
      const store = TestBed.inject(HabitStore);
      const [water] = store.habitsOf(store.activeRoutines()[0].id);
      await store.updateHabit(water.id, { schedule: { kind: 'weekly', times: 3 } });
      await fixture.whenStable();
      expect(root.textContent).toContain('0 of 3 this week');
      buttonsByText(root, 'Done')[0].click();
      await fixture.whenStable();
      expect(root.textContent).toContain('1 of 3 this week');
    });
  });
});
