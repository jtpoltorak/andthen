import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { SyncingHabitRepository, guessDeviceName } from '@andthen/data';
import { HABIT_REPOSITORY } from '@web/data/habit-repository';
import { SYNC_DEVICE_NAME } from '@web/sync/sync.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The same on-device database as the web app, but this one belongs to the extension:
    // a browser keeps an extension's storage apart from every website's, andthenhabits.com's included.
    // Sync is what keeps the two in step.
    { provide: SyncingHabitRepository, useFactory: () => new SyncingHabitRepository() },
    { provide: HABIT_REPOSITORY, useExisting: SyncingHabitRepository },
    // In the account's device list, so it's clear which entry is the extension.
    { provide: SYNC_DEVICE_NAME, useFactory: () => extensionDeviceName() },
  ],
};

/** Such as "AndThen extension in Chrome on Mac". */
export function extensionDeviceName(userAgent?: string): string {
  const browser = guessDeviceName(userAgent ?? globalThis.navigator?.userAgent);
  return browser ? `AndThen extension in ${browser}` : 'AndThen extension';
}
