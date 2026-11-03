import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { PreferencesStore } from '../data/preferences';
import { Notifier } from '../reminders/notifier';
import { Reminders } from '../reminders/reminders';
import { signal } from '@angular/core';
import { SyncService } from '../sync/sync.service';
import { ResetData } from './reset-data';

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

const fakeNotifier = {
  permission: () => 'granted' as const,
  requestPermission: async () => 'granted' as const,
  show: async () => true,
};

describe('ResetData', () => {
  beforeEach(() => localStorage.clear());

  async function setup(syncOn = false) {
    const repo = new InMemoryHabitRepository();
    const order: string[] = [];
    const sync = {
      enabled: signal(syncOn),
      turnOff: vi.fn(async () => {
        order.push(`sync off with ${(await repo.loadAll()).routines.length} routine(s)`);
      }),
    };
    TestBed.configureTestingModule({
      imports: [ResetData],
      providers: [
        provideRouter([{ path: 'welcome', children: [] }]),
        { provide: HABIT_REPOSITORY, useValue: repo },
        { provide: Notifier, useValue: fakeNotifier },
        { provide: SyncService, useValue: sync },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    await store.checkIn(store.habitsOf(routine.id)[0].id, 'full');

    const prefs = TestBed.inject(PreferencesStore);
    prefs.setName('Sam');
    prefs.setTheme('dark');
    const reminders = TestBed.inject(Reminders);
    await reminders.enable();
    localStorage.setItem('andthen.reminders.sent', '{"day":"2026-11-02","routineIds":[]}');
    localStorage.setItem('unrelated', 'keep me');

    const fixture = TestBed.createComponent(ResetData);
    await fixture.whenStable();
    return {
      fixture,
      store,
      repo,
      prefs,
      reminders,
      sync,
      order,
      root: fixture.nativeElement as HTMLElement,
    };
  }

  async function openAndType(
    fixture: { whenStable(): Promise<unknown> },
    root: HTMLElement,
    word: string,
  ) {
    button(root, 'Reset everything…')!.click();
    await fixture.whenStable();
    const input = root.querySelector<HTMLInputElement>('#reset-word')!;
    input.value = word;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('says what will go, offers a backup, and waits for the word', async () => {
    const { fixture, store, root } = await setup();
    await openAndType(fixture, root, 'nope');

    expect(root.textContent).toContain('1 routine and 1 check-in');
    expect(button(root, 'Back up my data')).toBeTruthy();
    expect(button(root, 'Delete everything')!.disabled).toBe(true);
    expect(store.routines()).toHaveLength(1);
  });

  it('deletes everything, clears settings, and goes back to the welcome screen', async () => {
    const { fixture, store, repo, prefs, reminders, root } = await setup();
    await openAndType(fixture, root, ' Reset ');

    const confirm = button(root, 'Delete everything')!;
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await fixture.whenStable();

    expect(store.routines()).toEqual([]);
    expect(store.checkIns()).toEqual([]);
    expect(await repo.loadAll()).toEqual({
      routines: [],
      habits: [],
      checkIns: [],
      reflections: [],
    });
    expect(prefs.prefs()).toEqual({ name: '', theme: 'system', weekStartsOn: 1 });
    expect(reminders.prefs().enabled).toBe(false);
    expect(localStorage.getItem('andthen.prefs')).toBeNull();
    expect(localStorage.getItem('andthen.reminders')).toBeNull();
    expect(localStorage.getItem('andthen.reminders.sent')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep me');
    expect(TestBed.inject(Router).url).toBe('/welcome');
  });

  it('cancels without deleting anything', async () => {
    const { fixture, store, root } = await setup();
    await openAndType(fixture, root, 'reset');
    button(root, 'Cancel')!.click();
    await fixture.whenStable();

    expect(button(root, 'Reset everything…')).toBeTruthy();
    expect(store.routines()).toHaveLength(1);
  });

  it('turns sync off before deleting, so the reset never reaches other devices', async () => {
    const { fixture, store, sync, order, root } = await setup(true);
    await openAndType(fixture, root, 'reset');
    expect(root.textContent).toContain('This device will also stop syncing');

    button(root, 'Delete everything')!.click();
    await fixture.whenStable();

    expect(sync.turnOff).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['sync off with 1 routine(s)']);
    expect(store.routines()).toEqual([]);
  });
});
