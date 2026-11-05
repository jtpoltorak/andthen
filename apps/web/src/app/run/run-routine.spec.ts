import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { RunRoutine } from './run-routine';

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

describe('RunRoutine', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [RunRoutine],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createChain({
      anchor: 'After I pour my coffee',
      habitName: 'Drink water',
      twoMinuteVersion: 'Take one sip of water',
    });
    await store.addLink(routine.id, 'Stretch', 'Touch my toes once');
    const fixture = TestBed.createComponent(RunRoutine);
    fixture.componentRef.setInput('id', routine.id);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const heading = () => root.querySelector('h1')?.textContent?.trim();
    return { fixture, root, store, routine, heading };
  }

  it('asks one habit at a time, in chain order, then finishes', async () => {
    const { fixture, root, heading } = await setup();
    expect(root.querySelector('.cue')?.textContent).toContain('After I pour my coffee, and then');
    expect(heading()).toBe('Drink water');
    expect(root.textContent).toContain('1 of 2');

    buttonsByText(root, 'Did 2 min')[0].click();
    await fixture.whenStable();
    expect(root.querySelector('.cue')?.textContent?.trim()).toBe('And then…');
    expect(heading()).toBe('Stretch');
    expect(root.querySelector('.dot-mini')).not.toBeNull();

    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(heading()).toBe('Chain complete');
    expect(root.textContent).toContain('2 of 2 done');
    expect(root.querySelectorAll('.spark')).toHaveLength(8);
    expect(document.activeElement?.id).toBe('run-focus');
  });

  it('shows the why and make-it-easy notes, and undoes the last answer', async () => {
    const { fixture, root, store, routine, heading } = await setup();
    const [water] = store.habitsOf(routine.id);
    await store.updateHabit(water.id, { why: 'Clear head', makeItEasier: 'Glass by the sink' });
    await fixture.whenStable();
    expect(root.textContent).toContain('Why: Clear head');
    expect(root.textContent).toContain('Make it easy: Glass by the sink');

    buttonsByText(root, 'Skip today')[0].click();
    await fixture.whenStable();
    expect(heading()).toBe('Stretch');

    buttonsByText(root, 'Undo')[0].click();
    await fixture.whenStable();
    expect(heading()).toBe('Drink water');
    expect(buttonsByText(root, 'Undo')).toHaveLength(0);
  });

  it('says so when the routine is paused', async () => {
    const { fixture, store, routine, heading } = await setup();
    await store.pauseRoutine(routine.id);
    await fixture.whenStable();
    expect(heading()).toBe('This routine is paused');
  });
});
