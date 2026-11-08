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

  it('fills the day ring as habits are answered, and closes it with a check', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const [water, stretch] = store.habitsOf(store.activeRoutines()[0].id);
    const ring = () => root.querySelector('app-day-ring [role="img"]');
    expect(ring()?.getAttribute('aria-label')).toBe('0 of 2 habits done today');
    expect(root.querySelectorAll('app-day-ring .seg')).toHaveLength(2);

    await store.checkIn(water.id, 'mini');
    await fixture.whenStable();
    expect(ring()?.getAttribute('aria-label')).toBe('1 of 2 habits done today');
    expect(root.querySelector('app-day-ring .seg-mini')).not.toBeNull();
    expect(ring()?.classList).not.toContain('all-done');

    await store.checkIn(stretch.id, 'skip');
    await fixture.whenStable();
    expect(ring()?.getAttribute('aria-label')).toBe('1 of 2 habits done today, 1 skipped');
    expect(ring()?.classList).toContain('all-done');
  });

  it('shows no day ring when nothing is on today', async () => {
    const { root } = await setup({ empty: true });
    expect(root.querySelector('app-day-ring')).toBeNull();
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

  it('asks how it felt after Done, and keeps the mood and a few words', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const [water] = store.habitsOf(store.activeRoutines()[0].id);

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(root.textContent).toContain('How did it feel?');

    buttonsByText(root, 'Felt good')[0].click();
    await fixture.whenStable();
    const input = root.querySelector<HTMLInputElement>('.note-input')!;
    input.value = '  Before   work ';
    input.dispatchEvent(new Event('input'));
    buttonsByText(root, 'Save')[0].click();
    await fixture.whenStable();

    expect(store.todaysCheckIn(water.id)).toMatchObject({ mood: 'good', note: 'Before work' });
    expect(root.textContent).not.toContain('How did it feel?');
    expect(root.textContent).toContain('Felt good · Before work');
  });

  it('does not ask how it felt after a skip', async () => {
    const { fixture, root } = await setup();
    buttonsByText(root, 'Skip')[0].click();
    await fixture.whenStable();
    expect(root.textContent).not.toContain('How did it feel?');
  });

  it('fills in the chain link leading to each answered habit', async () => {
    const { fixture, root } = await setup();
    const fills = () => [...root.querySelectorAll('.line')].map((l) => l.getAttribute('data-fill'));
    // Anchor → water, water → stretch.
    expect(fills()).toEqual(['pending', 'pending']);

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(fills()).toEqual(['full', 'pending']);

    buttonsByText(root, 'Skip')[0].click();
    await fixture.whenStable();
    expect(fills()).toEqual(['full', 'skip']);
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

  it('groups routines by part of the day once there is more than one', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const titles = () =>
      [...root.querySelectorAll('.part-title')].map((h) => h.textContent?.trim());
    // The first routine has no usual time, so it's "anytime"; one group shows no headings.
    expect(titles()).toEqual([]);

    await store.createChain({
      anchor: 'After I brush my teeth at night',
      habitName: 'Read a page',
      twoMinuteVersion: 'Open the book',
      usualTime: '21:30',
    });
    await fixture.whenStable();
    expect(titles()).toEqual(['Evening', 'Anytime']);
  });

  it('folds a finished routine into one line with a check', async () => {
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    const first = store.activeRoutines()[0];
    await store.createChain({
      anchor: 'After I get home',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    for (const h of store.habitsOf(first.id)) await store.checkIn(h.id, 'full');
    await fixture.whenStable();
    // The open card moves on to the unfinished routine; the finished one folds.
    const done = root.querySelector('.collapsed-done');
    expect(done?.textContent).toContain('After I pour my coffee');
    expect(done?.textContent).toContain('Done');
    expect(done?.querySelector('.done-check')).not.toBeNull();
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

  it('marks the first check-in with a gentle milestone, once', async () => {
    localStorage.removeItem('andthen.milestonesSeen');
    const { fixture, root } = await setup();
    const store = TestBed.inject(HabitStore);
    expect(root.querySelector('.milestone-card')).toBeNull();
    const [water] = store.habitsOf(store.activeRoutines()[0].id);
    await store.checkIn(water.id, 'mini');
    await fixture.whenStable();
    expect(root.querySelector('.milestone-card')?.textContent).toContain('Your first check-in');
    buttonsByText(root, 'Thanks')[0].click();
    await fixture.whenStable();
    expect(root.querySelector('.milestone-card')).toBeNull();
    expect(localStorage.getItem('andthen.milestonesSeen')).toContain('checkins-1');
    localStorage.removeItem('andthen.milestonesSeen');
  });
});
