import { TestBed } from '@angular/core/testing';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from './habit-repository';
import { HabitStore } from './habit-store';

describe('HabitStore', () => {
  let repo: InMemoryHabitRepository;
  let store: HabitStore;

  beforeEach(async () => {
    repo = new InMemoryHabitRepository();
    TestBed.configureTestingModule({
      providers: [{ provide: HABIT_REPOSITORY, useValue: repo }],
    });
    store = TestBed.inject(HabitStore);
    await store.load();
  });

  it('starts empty, so new users go to the first-run flow', () => {
    expect(store.hasRoutines()).toBe(false);
    expect(store.chains()).toEqual([]);
  });

  it('creates a first chain and persists it', async () => {
    await store.createFirstChain({
      anchor: 'After I pour my coffee',
      usualTime: '07:30',
      habitName: 'Stretch',
      twoMinuteVersion: 'Touch my toes once',
    });

    expect(store.hasRoutines()).toBe(true);
    const [chain] = store.chains();
    expect(chain.routine.anchor).toBe('After I pour my coffee');
    expect(chain.links.map((l) => l.habit.name)).toEqual(['Stretch']);

    const saved = await repo.loadAll();
    expect(saved.routines).toHaveLength(1);
    expect(saved.habits).toHaveLength(1);
  });

  it('checks in, replaces, and undoes for today', async () => {
    const routine = await store.createFirstChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Put on my shoes',
    });
    await store.addLink(routine.id, 'Read', 'Read one page');
    const [walk, read] = store.chains()[0].links.map((l) => l.habit.id);

    await store.checkIn(walk, 'full');
    await store.checkIn(walk, 'mini');
    expect(store.chains()[0].links[0].status).toBe('mini');
    expect(store.chains()[0].links.find((l) => l.isNext)?.habit.id).toBe(read);

    await store.undoCheckIn(walk);
    expect(store.chains()[0].links[0].status).toBe('pending');
    expect((await repo.loadAll()).checkIns).toEqual([]);
  });

  it('rolls today over on refresh', () => {
    store.today.set('2026-01-01');
    store.refreshDay(new Date(2026, 0, 2, 0, 5));
    expect(store.today()).toBe('2026-01-02');
  });
});
