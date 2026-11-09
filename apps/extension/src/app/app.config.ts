import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { SyncingHabitRepository } from '@andthen/data';
import { HABIT_REPOSITORY } from '@web/data/habit-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The same on-device database as the web app, but this one belongs to the extension:
    // a browser keeps an extension's storage apart from every website's, andthenhabits.com's included.
    // Sync (coming next) is what keeps the two in step.
    { provide: SyncingHabitRepository, useFactory: () => new SyncingHabitRepository() },
    { provide: HABIT_REPOSITORY, useExisting: SyncingHabitRepository },
  ],
};
