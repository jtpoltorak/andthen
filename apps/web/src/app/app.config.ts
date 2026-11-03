import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { SyncingHabitRepository } from './data/syncing-habit-repository';
import { HABIT_REPOSITORY } from './data/habit-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Each screen opens at the top; Back returns to where you were.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: HABIT_REPOSITORY, useFactory: () => new SyncingHabitRepository() },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
