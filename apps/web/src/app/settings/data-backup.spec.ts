import { TestBed } from '@angular/core/testing';
import { createBackup } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { DataBackup } from './data-backup';

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

const backupFile = (content: string) =>
  new File([content], 'andthen-backup-2026-11-01.json', { type: 'application/json' });

const goodBackup = () =>
  JSON.stringify(
    createBackup({
      routines: [{ id: 'r1', anchor: 'After I wake up', order: 0, createdOn: '2026-10-01' }],
      habits: [
        {
          id: 'h1',
          routineId: 'r1',
          name: 'Make the bed',
          twoMinuteVersion: 'Pull up the covers',
          order: 0,
          createdOn: '2026-10-01',
        },
      ],
      checkIns: [
        { habitId: 'h1', date: '2026-10-02', kind: 'full' },
        { habitId: 'h1', date: '2026-10-05', kind: 'mini' },
      ],
    }),
  );

describe('DataBackup', () => {
  async function setup() {
    const repo = new InMemoryHabitRepository();
    TestBed.configureTestingModule({
      imports: [DataBackup],
      providers: [{ provide: HABIT_REPOSITORY, useValue: repo }],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    await store.createChain({
      anchor: 'After lunch',
      habitName: 'Walk',
      twoMinuteVersion: 'Shoes on',
    });
    const fixture = TestBed.createComponent(DataBackup);
    await fixture.whenStable();
    return { fixture, store, repo, root: fixture.nativeElement as HTMLElement };
  }

  it('shows what a backup holds and only restores after confirming', async () => {
    const { fixture, store, repo, root } = await setup();
    await fixture.componentInstance.readFile(backupFile(goodBackup()));
    await fixture.whenStable();

    expect(root.textContent).toContain('1 routine, 1 habit, and 2 check-ins');
    expect(root.textContent).toContain('This replaces everything on this device');
    expect(store.routines()[0].anchor).toBe('After lunch'); // nothing changed yet

    button(root, 'Replace my data')!.click();
    await fixture.whenStable();

    expect(root.textContent).toContain('Your data is back');
    expect(store.routines().map((r) => r.anchor)).toEqual(['After I wake up']);
    expect((await repo.loadAll()).checkIns).toHaveLength(2);
  });

  it('cancels without changing anything', async () => {
    const { fixture, store, root } = await setup();
    await fixture.componentInstance.readFile(backupFile(goodBackup()));
    await fixture.whenStable();
    button(root, 'Cancel')!.click();
    await fixture.whenStable();

    expect(button(root, 'Restore from a backup')).toBeTruthy();
    expect(store.routines()[0].anchor).toBe('After lunch');
  });

  it('explains why a file was rejected', async () => {
    const { fixture, store, root } = await setup();
    await fixture.componentInstance.readFile(backupFile('{"hello": "world"}'));
    await fixture.whenStable();

    expect(root.querySelector('[role=alert]')?.textContent).toContain("isn't an AndThen backup");
    expect(button(root, 'Replace my data')).toBeUndefined();
    expect(store.routines()[0].anchor).toBe('After lunch');
  });
});
