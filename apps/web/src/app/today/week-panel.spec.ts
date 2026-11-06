import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { WeekPanel } from './week-panel';

// A Friday; the week starts on Monday Nov 2.
const TODAY = '2026-11-06';

describe('WeekPanel', () => {
  beforeEach(() => localStorage.clear());

  it('shows the week so far, with one dot per day by its best answer', async () => {
    TestBed.configureTestingModule({
      imports: [WeekPanel],
      providers: [
        provideRouter([]),
        {
          provide: HABIT_REPOSITORY,
          useValue: new InMemoryHabitRepository({
            routines: [{ id: 'r', anchor: 'Coffee', order: 0, createdOn: '2026-10-01' }],
            habits: [
              {
                id: 'a',
                routineId: 'r',
                name: 'A',
                twoMinuteVersion: 'a',
                order: 0,
                createdOn: '2026-10-01',
              },
              {
                id: 'b',
                routineId: 'r',
                name: 'B',
                twoMinuteVersion: 'b',
                order: 1,
                createdOn: '2026-10-01',
              },
            ],
            checkIns: [
              { habitId: 'a', date: '2026-11-02', kind: 'mini' },
              { habitId: 'b', date: '2026-11-02', kind: 'full' },
              { habitId: 'a', date: '2026-11-03', kind: 'mini' },
              { habitId: 'a', date: '2026-11-04', kind: 'skip' },
              { habitId: 'a', date: '2026-10-30', kind: 'full' }, // Last week: not counted.
            ],
          }),
        },
      ],
    });
    const store = TestBed.inject(HabitStore);
    await store.load();
    store.today.set(TODAY);
    const fixture = TestBed.createComponent(WeekPanel);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toContain('Showed up 2 of 5 days');
    const dots = [...root.querySelectorAll('.dot')].map((d) => d.className.replace('dot ', ''));
    expect(dots).toEqual([
      'dot-full',
      'dot-mini',
      'dot-skip',
      'dot-none',
      'dot-none',
      'dot-future',
      'dot-future',
    ]);
    expect(root.querySelector('.today .dot')?.getAttribute('title')).toContain('no check-in');
  });
});
