import { TestBed } from '@angular/core/testing';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '@web/data/habit-repository';
import { HabitStore } from '@web/data/habit-store';
import { Popup, WEB_APP_URL } from './popup';

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

describe('Popup', () => {
  async function setup(opts: { empty?: boolean } = {}) {
    TestBed.configureTestingModule({
      imports: [Popup],
      providers: [{ provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    if (!opts.empty) {
      const routine = await store.createChain({
        anchor: 'After I pour my coffee',
        habitName: 'Drink water',
        twoMinuteVersion: 'Take one sip of water',
      });
      await store.addLink(routine.id, 'Stretch', 'Touch my toes once');
    }
    const fixture = TestBed.createComponent(Popup);
    await fixture.whenStable();
    return { fixture, store, root: fixture.nativeElement as HTMLElement };
  }

  it('asks about the next habit, with the same three answers as the app', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('After I pour my coffee');
    expect(root.textContent).toContain('Drink water');
    expect(root.textContent).toContain('Tiny version: take one sip of water');
    expect(buttonsByText(root, 'Done')).toHaveLength(1);
    expect(buttonsByText(root, 'Did 2 min')).toHaveLength(1);
    expect(buttonsByText(root, 'Skip')).toHaveLength(1);
  });

  it('moves along the chain on Done, and Undo takes it back', async () => {
    const { fixture, store, root } = await setup();
    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Stretch');
    expect(root.textContent).toContain('Saved Drink water');
    expect(store.checkIns()).toHaveLength(1);

    buttonsByText(root, 'Undo')[0].click();
    await fixture.whenStable();
    expect(store.checkIns()).toHaveLength(0);
    expect(root.textContent).toContain('Tiny version: take one sip of water');
  });

  it('records a 2-minute answer', async () => {
    const { fixture, store, root } = await setup();
    buttonsByText(root, 'Did 2 min')[0].click();
    await fixture.whenStable();
    expect(store.checkIns()[0].kind).toBe('mini');
  });

  it('says so once everything is answered', async () => {
    const { fixture, root } = await setup();
    buttonsByText(root, 'Done')[0].click();
    await fixture.whenStable();
    buttonsByText(root, 'Skip')[0].click();
    await fixture.whenStable();
    expect(root.textContent).toContain("That's everything for today.");
    expect(root.querySelector('app-day-ring [role="img"]')?.getAttribute('aria-label')).toBe(
      '1 of 2 habits done today, 1 skipped',
    );
  });

  it('offers starter routines when there are none, and starts one in a tap', async () => {
    const { fixture, store, root } = await setup({ empty: true });
    expect(root.textContent).toContain('Start with a routine');
    const morning = buttonsByText(root, 'Morning reset')[0];
    morning.click();
    await fixture.whenStable();
    expect(store.hasRoutines()).toBe(true);
    expect(root.textContent).toContain('After I wake up');
    expect(buttonsByText(root, 'Done')).toHaveLength(1);
  });

  it('links to the full app', async () => {
    const { root } = await setup();
    const link = root.querySelector<HTMLAnchorElement>('.foot a');
    expect(link?.href).toBe(WEB_APP_URL + '/');
    expect(link?.target).toBe('_blank');
  });
});
