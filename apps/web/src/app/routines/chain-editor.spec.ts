import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { decodeSharedRoutine } from '@andthen/core';
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

  it('copies a share link that sets up the same chain', async () => {
    const { fixture, root } = await setup();
    const writeText = vi.fn(async (_text: string) => {});
    const nav = navigator as Navigator & { share?: unknown };
    const share = nav.share;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    button(root, 'Share a link…').click();
    await fixture.whenStable();

    const url = writeText.mock.calls[0][0];
    expect(url).toMatch(/\/add#[A-Za-z0-9_-]+$/);
    expect(decodeSharedRoutine(url.split('#')[1])).toMatchObject({
      anchor: 'After I pour my coffee',
      habits: [{ name: 'Drink water' }, { name: 'Stretch' }],
    });
    expect(root.textContent).toContain('Link copied');
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  });

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

  it('reorders by dragging a habit by its handle', async () => {
    const { fixture, root, store, routine, names } = await setup();
    await store.addLink(routine.id, 'Journal', 'Write one line');
    await fixture.whenStable();
    expect(names()).toEqual(['Drink water', 'Stretch', 'Journal']);

    // Rows are 60px tall, stacked from the top.
    root.querySelectorAll<HTMLElement>('.habit-row').forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 60, height: 60 }) as DOMRect;
    });
    const pointer = (type: string, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      return event;
    };
    const grip = root.querySelectorAll<HTMLElement>('.grip')[0];
    grip.dispatchEvent(pointer('pointerdown', 30));
    grip.dispatchEvent(pointer('pointermove', 160));
    await fixture.whenStable();
    expect(root.querySelector('.dragging')).not.toBeNull();

    grip.dispatchEvent(pointer('pointerup', 160));
    await fixture.whenStable();
    expect(names()).toEqual(['Stretch', 'Journal', 'Drink water']);
    expect(root.querySelector('.dragging')).toBeNull();
  });

  it('saves and clears a habit\'s "why"', async () => {
    const { fixture, root, store, routine } = await setup();
    button(root, 'Edit Drink water').click();
    await fixture.whenStable();
    const why = root.querySelector<HTMLInputElement>('input[id^="why-"]')!;
    type(why, '  So I wake up properly  ');
    button(root, 'Save').click();
    await fixture.whenStable();
    expect(store.habitsOf(routine.id)[0].why).toBe('So I wake up properly');
    expect(root.textContent).toContain('Why: So I wake up properly');

    button(root, 'Edit Drink water').click();
    await fixture.whenStable();
    type(root.querySelector<HTMLInputElement>('input[id^="why-"]')!, '');
    button(root, 'Save').click();
    await fixture.whenStable();
    expect('why' in store.habitsOf(routine.id)[0]).toBe(false);
  });

  it('pauses the routine until resumed, then resumes it', async () => {
    const { fixture, root, store, routine } = await setup();
    button(root, 'Pause this routine…').click();
    await fixture.whenStable();
    button(root, 'Until I resume').click();
    await fixture.whenStable();
    expect(store.routine(routine.id)?.pauses).toEqual([{ from: store.today() }]);
    expect(root.textContent).toContain('Paused until you resume');

    button(root, 'Resume now').click();
    await fixture.whenStable();
    // A pause that started today leaves no trace.
    expect('pauses' in store.routine(routine.id)!).toBe(false);
    expect(button(root, 'Pause this routine…')).toBeTruthy();
  });

  it('leaves the order alone when a drag is cancelled', async () => {
    const { fixture, root, names } = await setup();
    root.querySelectorAll<HTMLElement>('.habit-row').forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 60, height: 60 }) as DOMRect;
    });
    const pointer = (type: string, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      return event;
    };
    const grip = root.querySelectorAll<HTMLElement>('.grip')[0];
    grip.dispatchEvent(pointer('pointerdown', 30));
    grip.dispatchEvent(pointer('pointermove', 100));
    grip.dispatchEvent(pointer('pointercancel', 100));
    await fixture.whenStable();
    expect(names()).toEqual(['Drink water', 'Stretch']);
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

  it('adds and clears "make it easier" notes on a habit', async () => {
    const { fixture, root, store, routine } = await setup();
    button(root, 'Edit Stretch').click();
    await fixture.whenStable();
    type(root.querySelector<HTMLInputElement>('input[id^="easier-"]')!, 'Keep the mat out');
    type(root.querySelector<HTMLInputElement>('input[id^="obstacle-"]')!, 'Running late');
    button(root, 'Save').click();
    await fixture.whenStable();

    expect(store.habitsOf(routine.id)[1]).toMatchObject({
      makeItEasier: 'Keep the mat out',
      obstacle: 'Running late',
    });
    expect(root.textContent).toContain('Easier: Keep the mat out');
    expect(root.textContent).toContain('Gets in the way: Running late');

    button(root, 'Edit Stretch').click();
    await fixture.whenStable();
    expect(root.querySelector('details.easier')?.hasAttribute('open')).toBe(true);
    type(root.querySelector<HTMLInputElement>('input[id^="easier-"]')!, '');
    type(root.querySelector<HTMLInputElement>('input[id^="obstacle-"]')!, ' ');
    button(root, 'Save').click();
    await fixture.whenStable();
    expect(store.habitsOf(routine.id)[1].makeItEasier).toBeUndefined();
    expect(root.textContent).not.toContain('Easier:');
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

  describe('how often', () => {
    async function openEdit() {
      const ctx = await setup();
      const water = ctx.store.habitsOf(ctx.routine.id)[0];
      (ctx.root.querySelector(`#edit-${water.id}`) as HTMLButtonElement).click();
      await ctx.fixture.whenStable();
      const radio = (label: string) =>
        [...ctx.root.querySelectorAll<HTMLLabelElement>('.segment')]
          .find((l) => l.textContent?.trim() === label)!
          .querySelector('input')!;
      const save = () => button(ctx.root, 'Save');
      return { ...ctx, water, radio, save };
    }

    it('saves weekdays only, and shows it in the chain', async () => {
      const { fixture, root, store, water, radio, save } = await openEdit();
      radio('Some days').click();
      await fixture.whenStable();
      // Weekdays are picked to start with.
      const pressed = [...root.querySelectorAll('.day[aria-pressed="true"]')];
      expect(pressed.map((b) => b.getAttribute('aria-label'))).toEqual([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      save().click();
      await fixture.whenStable();
      expect(store.habits().find((h) => h.id === water.id)?.schedule).toEqual({
        kind: 'days',
        days: [1, 2, 3, 4, 5],
      });
      expect(root.textContent).toContain('Weekdays');
    });

    it('needs at least one day picked', async () => {
      const { fixture, root, radio, save } = await openEdit();
      radio('Some days').click();
      await fixture.whenStable();
      for (const day of root.querySelectorAll<HTMLButtonElement>('.day[aria-pressed="true"]')) {
        day.click();
      }
      await fixture.whenStable();
      expect(save().disabled).toBe(true);
      expect(root.textContent).toContain('Pick at least one day.');
    });

    it('saves N times a week, and goes back to every day', async () => {
      const { fixture, root, store, water, radio, save } = await openEdit();
      radio('Times a week').click();
      await fixture.whenStable();
      const select = root.querySelector('select')!;
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      save().click();
      await fixture.whenStable();
      expect(store.habits().find((h) => h.id === water.id)?.schedule).toEqual({
        kind: 'weekly',
        times: 2,
      });
      expect(root.textContent).toContain('2 times a week');

      (root.querySelector(`#edit-${water.id}`) as HTMLButtonElement).click();
      await fixture.whenStable();
      radio('Every day').click();
      await fixture.whenStable();
      save().click();
      await fixture.whenStable();
      expect('schedule' in store.habits().find((h) => h.id === water.id)!).toBe(false);
    });
  });
});
