import { TestBed } from '@angular/core/testing';
import { addDays, routineTemplate } from '@andthen/core';
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
    await store.createChain({
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

  it('starts a whole routine from a template', async () => {
    const template = routineTemplate('morning-reset')!;
    const routine = await store.createFromTemplate(template);

    expect(routine.name).toBe('Morning reset');
    expect(routine.usualTime).toBe(template.usualTime);
    const [chain] = store.chains();
    expect(chain.routine.anchor).toBe(template.anchor);
    expect(chain.links.map((l) => l.habit.name)).toEqual(template.habits.map((h) => h.name));

    const saved = await repo.loadAll();
    expect(saved.routines).toHaveLength(1);
    expect(saved.habits).toHaveLength(template.habits.length);
  });

  it('checks in, replaces, and undoes for today', async () => {
    const routine = await store.createChain({
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

  describe('editing a chain', () => {
    async function chain() {
      const routine = await store.createChain({
        anchor: 'After I pour my coffee',
        habitName: 'Water',
        twoMinuteVersion: 'One sip',
      });
      await store.addLink(routine.id, 'Stretch', 'Touch my toes');
      await store.addLink(routine.id, 'Plan', 'Write one task');
      return routine;
    }
    const names = (routineId: string) => store.habitsOf(routineId).map((h) => h.name);

    it('reorders habits and saves the new order', async () => {
      const routine = await chain();
      const plan = store.habitsOf(routine.id)[2];

      await store.moveHabit(plan.id, -1);
      expect(names(routine.id)).toEqual(['Water', 'Plan', 'Stretch']);
      await store.moveHabit(plan.id, -1);
      expect(names(routine.id)).toEqual(['Plan', 'Water', 'Stretch']);
      await store.moveHabit(plan.id, -1); // already first: no-op
      expect(names(routine.id)).toEqual(['Plan', 'Water', 'Stretch']);

      const saved = (await repo.loadAll()).habits.sort((a, b) => a.order - b.order);
      expect(saved.map((h) => h.name)).toEqual(['Plan', 'Water', 'Stretch']);
      expect(store.chains()[0].links[0].habit.name).toBe('Plan');
    });

    it('edits a habit, trimming text and refusing a blank name', async () => {
      const routine = await chain();
      const water = store.habitsOf(routine.id)[0];

      await store.updateHabit(water.id, { name: '  Drink water ', twoMinuteVersion: 'Sip' });
      await store.updateHabit(water.id, { name: '   ' });
      expect(store.habitsOf(routine.id)[0]).toMatchObject({
        name: 'Drink water',
        twoMinuteVersion: 'Sip',
      });
    });

    it('removes a habit from today on but keeps its history', async () => {
      const routine = await chain();
      const stretch = store.habitsOf(routine.id)[1];
      // Remove it on a later day, so the habit existed before it was removed.
      const later = addDays(store.today(), 1);
      store.today.set(later);
      await store.archiveHabit(stretch.id);

      expect(names(routine.id)).toEqual(['Water', 'Plan']);
      const saved = (await repo.loadAll()).habits.find((h) => h.id === stretch.id);
      expect(saved?.archivedOn).toBe(later);
    });

    it('edits the anchor and clears the usual time', async () => {
      const routine = await chain();
      await store.updateRoutine(routine.id, { anchor: 'After I wake up', usualTime: '07:00' });
      await store.updateRoutine(routine.id, { usualTime: undefined });
      await store.updateRoutine(routine.id, { anchor: ' ' });
      const saved = (await repo.loadAll()).routines[0];
      expect(saved.anchor).toBe('After I wake up');
      expect(saved.usualTime).toBeUndefined();
    });

    it('removes a routine from today', async () => {
      const routine = await chain();
      await store.archiveRoutine(routine.id);
      expect(store.activeRoutines()).toEqual([]);
      expect(store.chains()).toEqual([]);
    });
  });

  it('backs up and restores everything, replacing what was there', async () => {
    await store.createChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    await store.checkIn(store.chains()[0].links[0].habit.id, 'full');
    const backup = store.backup(new Date('2026-11-02T12:00:00Z'));
    expect(backup).toMatchObject({ app: 'andthen', version: 1 });
    expect(backup.data.checkIns).toHaveLength(1);

    await store.createChain({
      anchor: 'After dinner',
      habitName: 'Read',
      twoMinuteVersion: 'One page',
    });
    await store.restore(backup.data);

    expect(store.routines().map((r) => r.anchor)).toEqual(['After lunch']);
    expect(store.checkIns()).toHaveLength(1);
    const saved = await repo.loadAll();
    expect(saved.routines.map((r) => r.anchor)).toEqual(['After lunch']);
    expect(saved.habits).toHaveLength(1);
  });

  it('rolls today over on refresh', () => {
    store.today.set('2026-01-01');
    store.refreshDay(new Date(2026, 0, 2, 0, 5));
    expect(store.today()).toBe('2026-01-02');
  });
});
