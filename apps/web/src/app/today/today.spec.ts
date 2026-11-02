import { TestBed } from '@angular/core/testing';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Today } from './today';

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

describe('Today', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [{ provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createFirstChain({
      anchor: 'After I pour my coffee',
      habitName: 'Drink water',
      twoMinuteVersion: 'Take one sip of water',
    });
    await store.addLink(routine.id, 'Stretch', 'Touch my toes once');
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
});
