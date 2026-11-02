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
    expect(root.querySelector('a')?.textContent?.trim()).toBe('Start a routine');
  });
});
