import { TestBed } from '@angular/core/testing';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Notifier, type NotifyPermission } from './notifier';
import { Reminders } from './reminders';

class FakeNotifier {
  current: NotifyPermission = 'default';
  answer: NotifyPermission = 'granted';
  shown: { title: string; body: string; tag: string }[] = [];
  permission() {
    return this.current;
  }
  async requestPermission() {
    this.current = this.answer;
    return this.current;
  }
  async show(title: string, body: string, tag: string) {
    if (this.current !== 'granted') return false;
    this.shown.push({ title, body, tag });
    return true;
  }
}

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe('Reminders', () => {
  beforeEach(() => localStorage.clear());

  async function setup(answer: NotifyPermission = 'granted') {
    const notifier = new FakeNotifier();
    notifier.answer = answer;
    TestBed.configureTestingModule({
      providers: [
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
        { provide: Notifier, useValue: notifier },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    const routine = await store.createChain({
      anchor: 'After I pour my coffee',
      usualTime: '07:30',
      habitName: 'Stretch',
      twoMinuteVersion: 'One stretch',
    });
    return { notifier, store, routine, reminders: TestBed.inject(Reminders) };
  }

  it('is off by default and sends nothing', async () => {
    const { reminders, notifier } = await setup();
    expect(reminders.active()).toBe(false);
    expect(await reminders.check(at(7, 30))).toEqual([]);
    expect(notifier.shown).toEqual([]);
  });

  it('asks for permission when turned on, then nudges once at the usual time', async () => {
    const { reminders, notifier } = await setup();
    expect(await reminders.enable()).toBe('granted');
    expect(reminders.active()).toBe(true);

    expect(await reminders.check(at(7, 29))).toEqual([]);
    await reminders.check(at(7, 31));
    expect(notifier.shown).toEqual([
      {
        title: 'After I pour my coffee',
        body: 'And then: Stretch. Even the 2-minute version counts.',
        tag: expect.stringMatching(/^andthen-/),
      },
    ]);

    await reminders.check(at(7, 40));
    expect(notifier.shown.length).toBe(1); // only once a day
  });

  it('stays off when permission is refused', async () => {
    const { reminders } = await setup('denied');
    expect(await reminders.enable()).toBe('denied');
    expect(reminders.active()).toBe(false);
    expect(reminders.prefs().enabled).toBe(false);
  });

  it('skips a routine once it is done or muted', async () => {
    const { reminders, notifier, store, routine } = await setup();
    await reminders.enable();

    reminders.setRoutineMuted(routine.id, true);
    expect(await reminders.check(at(7, 35))).toEqual([]);

    reminders.setRoutineMuted(routine.id, false);
    await store.checkIn(store.habitsOf(routine.id)[0].id, 'mini');
    expect(await reminders.check(at(7, 35))).toEqual([]);
    expect(notifier.shown).toEqual([]);
  });

  it('remembers its preferences on this device', async () => {
    const { reminders } = await setup();
    await reminders.enable();
    reminders.setLead(15);
    expect(JSON.parse(localStorage.getItem('andthen.reminders')!)).toEqual({
      enabled: true,
      leadMinutes: 15,
      mutedRoutineIds: [],
    });
  });
});
