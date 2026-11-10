import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Routines } from './routines';

const button = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
  ) as HTMLButtonElement;

describe('Routines', () => {
  async function setup() {
    const repo = new InMemoryHabitRepository();
    TestBed.configureTestingModule({
      imports: [Routines],
      providers: [provideRouter([]), { provide: HABIT_REPOSITORY, useValue: repo }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    for (const anchor of ['After I pour my coffee', 'After I get home', 'After I brush my teeth']) {
      await store.createChain({ anchor, habitName: 'Stretch', twoMinuteVersion: 'One stretch' });
    }
    const fixture = TestBed.createComponent(Routines);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const order = () => store.activeRoutines().map((r) => r.anchor);
    return { fixture, root, store, repo, order };
  }

  it('shows the cards until Reorder is tapped, then slim rows until Done', async () => {
    const { fixture, root } = await setup();
    expect(root.querySelectorAll('.routine-card').length).toBe(3);
    expect(root.querySelector('.reorder-row')).toBeNull();

    button(root, 'Reorder').click();
    await fixture.whenStable();
    expect(root.querySelector('.routine-card')).toBeNull();
    expect(root.querySelectorAll('.reorder-row').length).toBe(3);

    button(root, 'Done').click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.routine-card').length).toBe(3);
  });

  it('moves a routine with the arrows and saves the new order', async () => {
    const { fixture, root, repo, order } = await setup();
    button(root, 'Reorder').click();
    await fixture.whenStable();
    expect(button(root, 'Move After I pour my coffee up').disabled).toBe(true);

    button(root, 'Move After I brush my teeth up').click();
    await fixture.whenStable();
    expect(order()).toEqual([
      'After I pour my coffee',
      'After I brush my teeth',
      'After I get home',
    ]);

    const saved = (await repo.loadAll()).routines.sort((a, b) => a.order - b.order);
    expect(saved.map((r) => r.anchor)).toEqual(order());
  });

  it('reorders by dragging a routine by its handle', async () => {
    const { fixture, root, order } = await setup();
    button(root, 'Reorder').click();
    await fixture.whenStable();

    // Rows are 50px tall, stacked from the top.
    root.querySelectorAll<HTMLElement>('.reorder-row').forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 50, height: 50 }) as DOMRect;
    });
    const pointer = (type: string, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      return event;
    };
    const grip = root.querySelectorAll<HTMLElement>('.grip')[0];
    grip.dispatchEvent(pointer('pointerdown', 25));
    grip.dispatchEvent(pointer('pointermove', 140));
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).not.toBeNull();

    grip.dispatchEvent(pointer('pointerup', 140));
    await fixture.whenStable();
    expect(order()).toEqual([
      'After I get home',
      'After I brush my teeth',
      'After I pour my coffee',
    ]);
    expect(root.querySelector('.dragging')).toBeNull();
  });

  it('hides Reorder when there is only one routine', async () => {
    TestBed.configureTestingModule({
      imports: [Routines],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    await store.createChain({
      anchor: 'After I wake',
      habitName: 'Water',
      twoMinuteVersion: 'Sip',
    });
    const fixture = TestBed.createComponent(Routines);
    await fixture.whenStable();
    expect(button(fixture.nativeElement, 'Reorder')).toBeUndefined();
  });
});
