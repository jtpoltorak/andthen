import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { HabitStore } from '../data/habit-store';
import { Onboarding } from '../onboarding/onboarding';
import { NewRoutine } from './new-routine';

const button = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
  ) as HTMLButtonElement;

async function setup<T>(component: Type<T>) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: HABIT_REPOSITORY, useValue: new InMemoryHabitRepository() },
    ],
  });
  const store = TestBed.inject(HabitStore);
  await store.load();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return { fixture, root: fixture.nativeElement as HTMLElement, store, navigate };
}

describe('Routine templates', () => {
  it('lets a new user start a whole routine from the welcome screen', async () => {
    const { fixture, root, store, navigate } = await setup(Onboarding);
    button(root, 'Or pick a ready-made routine').click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Pick a ready-made routine');

    button(root, 'Use Morning reset').click();
    await fixture.whenStable();

    const [chain] = store.chains();
    expect(chain.routine.name).toBe('Morning reset');
    expect(chain.links.length).toBeGreaterThan(1);
    expect(navigate).toHaveBeenCalledWith(['/today']);
  });

  it('adds a template from New routine and hides ones already added', async () => {
    const { fixture, root, store, navigate } = await setup(NewRoutine);
    expect(button(root, 'Use Wind-down')).toBeTruthy();

    button(root, 'Use Wind-down').click();
    await fixture.whenStable();

    const routine = store.activeRoutines().find((r) => r.name === 'Wind-down')!;
    expect(store.habitsOf(routine.id).length).toBeGreaterThan(1);
    expect(navigate).toHaveBeenCalledWith(['/routines', routine.id]);
    expect(button(root, 'Use Wind-down')).toBeUndefined();
    expect(button(root, 'Use Morning reset')).toBeTruthy();
  });
});
