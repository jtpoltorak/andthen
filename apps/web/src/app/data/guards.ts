import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { HabitStore } from './habit-store';

// Note: inject() must run before the first await, while the injection context is active.

/** Sends people with no routines yet to the first-run flow. */
export const requireRoutines: CanActivateFn = async () => {
  const store = inject(HabitStore);
  const router = inject(Router);
  await store.load();
  return store.hasRoutines() || router.createUrlTree(['/welcome']);
};

/** Keeps people who already have a routine out of the first-run flow. */
export const onlyNewUsers: CanActivateFn = async () => {
  const store = inject(HabitStore);
  const router = inject(Router);
  await store.load();
  return !store.hasRoutines() || router.createUrlTree(['/today']);
};
