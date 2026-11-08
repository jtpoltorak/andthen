import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CheckIn, Habit, Routine } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { YearView } from './year-view';

const TODAY = '2026-11-08';

const routine = (id: string, name: string, order: number): Routine => ({
  id,
  name,
  anchor: `Anchor ${id}`,
  order,
  createdOn: '2026-10-01',
});

const habit = (id: string, routineId: string): Habit => ({
  id,
  routineId,
  name: id,
  twoMinuteVersion: 'tiny',
  order: 0,
  createdOn: '2026-10-01',
});

const done = (habitId: string, date: string): CheckIn => ({ habitId, date, kind: 'full' });

describe('YearView', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [YearView],
      providers: [
        provideRouter([]),
        {
          provide: HABIT_REPOSITORY,
          useValue: new InMemoryHabitRepository({
            routines: [routine('am', 'Morning', 0), routine('pm', 'Evening', 1)],
            habits: [habit('water', 'am'), habit('read', 'pm')],
            checkIns: [
              done('water', '2026-11-02'),
              done('read', '2026-11-02'),
              done('water', '2026-11-03'),
            ],
          }),
        },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    store.today.set(TODAY);
    const fixture = TestBed.createComponent(YearView);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('shows twelve months, shades days, and filters by routine', async () => {
    const { fixture, root } = await setup();
    expect(root.querySelectorAll('.month')).toHaveLength(12);
    expect(root.textContent).toContain('Showed up 2 days');
    expect(root.textContent).toContain('3 check-ins');
    expect(root.textContent).toContain('November 2026: showed up 2 of');
    expect(root.querySelectorAll('.months .level-3')).toHaveLength(1); // Nov 2: both done.
    expect(root.querySelectorAll('.months .level-2')).toHaveLength(1); // Nov 3: half done.

    const evening = [...root.querySelectorAll<HTMLLabelElement>('.pill')].find((p) =>
      p.textContent?.includes('Evening'),
    )!;
    evening.querySelector('input')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Showed up 1 day');
    expect(root.querySelectorAll('.months .level-3')).toHaveLength(1);
  });
});
