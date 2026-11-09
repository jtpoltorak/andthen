import { InjectionToken } from '@angular/core';
import type { HabitRepository } from '@andthen/data';

export { InMemoryHabitRepository, type HabitRepository, type HabitSnapshot } from '@andthen/data';

export const HABIT_REPOSITORY = new InjectionToken<HabitRepository>('HabitRepository');
