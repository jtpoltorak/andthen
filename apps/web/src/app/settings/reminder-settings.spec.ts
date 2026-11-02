import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Notifier, type NotifyPermission } from '../reminders/notifier';
import { ReminderSettings } from './reminder-settings';

function notifier(current: NotifyPermission, answer: NotifyPermission = 'granted') {
  return {
    current,
    permission() {
      return this.current;
    },
    async requestPermission() {
      this.current = answer;
      return answer;
    },
    async show() {
      return true;
    },
  };
}

describe('ReminderSettings', () => {
  beforeEach(() => localStorage.clear());

  async function setup(fake: ReturnType<typeof notifier>) {
    TestBed.configureTestingModule({
      imports: [ReminderSettings],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
        { provide: Notifier, useValue: fake },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    await store.createChain({
      anchor: 'After I pour my coffee',
      usualTime: '07:30',
      habitName: 'Stretch',
      twoMinuteVersion: 'One stretch',
    });
    await store.createChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes',
    });
    const fixture = TestBed.createComponent(ReminderSettings);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('explains when the browser has no notifications', async () => {
    const { root } = await setup(notifier('unsupported'));
    expect(root.textContent).toContain("This browser can't show notifications");
    expect(root.querySelector('[role="switch"]')).toBeNull();
  });

  it('turns on after permission and lists routines with a usual time', async () => {
    const { fixture, root } = await setup(notifier('default'));
    expect(root.textContent).toContain('only while AndThen is open');
    const toggle = root.querySelector<HTMLInputElement>('[role="switch"]')!;
    expect(toggle.checked).toBe(false);

    toggle.click();
    await fixture.whenStable();

    expect(toggle.checked).toBe(true);
    expect(root.textContent).toContain('Reminders are on.');
    expect(root.textContent).toContain('After I pour my coffee');
    expect(root.textContent).toContain('One routine has no usual time');
  });

  it('says how to unblock notifications when they are denied', async () => {
    const { fixture, root } = await setup(notifier('default', 'denied'));
    const toggle = root.querySelector<HTMLInputElement>('[role="switch"]')!;
    toggle.click();
    await fixture.whenStable();

    expect(toggle.checked).toBe(false);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('blocked');
  });
});
