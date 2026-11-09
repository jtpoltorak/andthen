import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { SyncingHabitRepository } from '@andthen/data';
import { HABIT_REPOSITORY } from './data/habit-repository';
import { onViewTransitionCreated } from './shared/view-transitions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Each screen opens at the top; Back returns to where you were.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      // Smooth screen changes where the browser supports them; off for reduced motion.
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated }),
    ),
    // One repository, reachable two ways: screens see the plain interface, sync sees the rest.
    { provide: SyncingHabitRepository, useFactory: () => new SyncingHabitRepository() },
    { provide: HABIT_REPOSITORY, useExisting: SyncingHabitRepository },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
