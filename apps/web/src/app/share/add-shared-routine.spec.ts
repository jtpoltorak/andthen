import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { encodeSharedRoutine } from '@andthen/core';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { AddSharedRoutine } from './add-shared-routine';

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

describe('AddSharedRoutine', () => {
  async function setup(fragment: string) {
    TestBed.configureTestingModule({
      imports: [AddSharedRoutine],
      providers: [
        provideRouter([]),
        { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AddSharedRoutine);
    await fixture.whenStable();
    return { fixture, navigate, root: fixture.nativeElement as HTMLElement };
  }

  it('shows the shared chain and adds it as a new routine', async () => {
    const code = encodeSharedRoutine({
      name: 'Evening',
      anchor: 'After dinner',
      usualTime: '19:00',
      habits: [
        { name: 'Wash up', twoMinuteVersion: 'Rinse one plate' },
        { name: 'Read', twoMinuteVersion: 'One page', schedule: { kind: 'weekly', times: 3 } },
      ],
    });
    const { fixture, navigate, root } = await setup(code);
    expect(root.textContent).toContain('After dinner');
    expect(root.textContent).toContain('Tiny version: rinse one plate');

    button(root, 'Add to my routines')!.click();
    await fixture.whenStable();

    const store = TestBed.inject(HabitStore);
    const [routine] = store.activeRoutines();
    expect(routine).toMatchObject({ name: 'Evening', anchor: 'After dinner', usualTime: '19:00' });
    expect(store.habitsOf(routine.id).map((h) => [h.name, h.schedule?.kind])).toEqual([
      ['Wash up', undefined],
      ['Read', 'weekly'],
    ]);
    expect(navigate).toHaveBeenCalledWith('/today');
  });

  it('says so when the link is broken', async () => {
    const { root } = await setup('not-a-routine');
    expect(root.textContent).toContain("This link doesn't work");
    expect(button(root, 'Add to my routines')).toBeUndefined();
  });
});
