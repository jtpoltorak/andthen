import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { ChainEditor } from './chain-editor';

const button = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
  ) as HTMLButtonElement;

const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('ChainEditor', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [ChainEditor],
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
    const fixture = TestBed.createComponent(ChainEditor);
    fixture.componentRef.setInput('id', routine.id);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const names = () => [...root.querySelectorAll('.habit-name')].map((n) => n.textContent?.trim());
    return { fixture, root, store, routine, names };
  }

  it('shows the anchor and the chain in order', async () => {
    const { root, names } = await setup();
    expect(root.textContent).toContain('After I pour my coffee');
    expect(names()).toEqual(['Drink water', 'Stretch']);
    expect(button(root, 'Move Drink water up').disabled).toBe(true);
    expect(button(root, 'Move Stretch down').disabled).toBe(true);
  });

  it('reorders with the move buttons', async () => {
    const { fixture, root, names } = await setup();
    button(root, 'Move Stretch up').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Stretch', 'Drink water']);
  });

  it('adds a habit and fills in a 2-minute version when left blank', async () => {
    const { fixture, root, store, routine, names } = await setup();
    button(root, '+ and then...').click();
    await fixture.whenStable();

    type(root.querySelector<HTMLInputElement>('#add-name')!, 'Read');
    await fixture.whenStable();
    button(root, 'Add').click();
    await fixture.whenStable();

    expect(names()).toEqual(['Drink water', 'Stretch', 'Read']);
    expect(store.habitsOf(routine.id)[2].twoMinuteVersion).toBe('Read one page');
  });

  it('edits and removes a habit', async () => {
    const { fixture, root, names } = await setup();
    button(root, 'Edit Stretch').click();
    await fixture.whenStable();
    type(root.querySelector<HTMLInputElement>('input[id^="name-"]')!, 'Stretch my back');
    await fixture.whenStable();
    button(root, 'Save').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Drink water', 'Stretch my back']);

    button(root, 'Edit Drink water').click();
    await fixture.whenStable();
    button(root, 'Remove').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Stretch my back']);
  });

  it('focuses the form when editing, and returns focus to Edit on Escape', async () => {
    const { fixture, root } = await setup();
    const edit = () =>
      [...root.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Edit Stretch',
      ) as HTMLButtonElement;

    edit().click();
    await fixture.whenStable();
    const input = document.activeElement as HTMLInputElement;
    expect(input.value).toBe('Stretch');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(edit());
  });

  it('keeps focus on a habit as it moves, even when it reaches the top', async () => {
    const { fixture, root, names } = await setup();
    button(root, 'Move Stretch up').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Stretch', 'Drink water']);
    // "Up" is now disabled, so focus moves to its "down" arrow.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Move Stretch down');
  });
});
