import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdates } from './app-updates';
import { APP_VERSION } from './version.generated';

const KEY = 'andthen.lastSeenVersion';

describe('AppUpdates', () => {
  beforeEach(() => localStorage.clear());

  function setup(sw?: Partial<SwUpdate>) {
    TestBed.configureTestingModule({
      providers: sw ? [{ provide: SwUpdate, useValue: sw }] : [],
    });
    return TestBed.inject(AppUpdates);
  }

  it('says nothing on a first visit, and remembers the version', () => {
    const updates = setup();
    expect(updates.justUpdatedTo()).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toBe(APP_VERSION);
  });

  it('announces the new version once after an update, until dismissed', () => {
    localStorage.setItem(KEY, JSON.stringify('0.9.0'));
    const updates = setup();
    expect(updates.justUpdatedTo()).toBe(APP_VERSION);
    updates.dismissUpdated();
    expect(updates.justUpdatedTo()).toBeNull();
  });

  it('says nothing when the version has not changed', () => {
    localStorage.setItem(KEY, JSON.stringify(APP_VERSION));
    expect(setup().justUpdatedTo()).toBeNull();
  });

  it('is ready to reload once the service worker has the new version', () => {
    const versionUpdates = new Subject<VersionEvent>();
    const updates = setup({
      isEnabled: true,
      versionUpdates,
      unrecoverable: new Subject(),
    } as unknown as SwUpdate);
    expect(updates.ready()).toBe(false);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    });
    expect(updates.ready()).toBe(true);
  });

  it('reports whether a check found anything', async () => {
    const checkForUpdate = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const updates = setup({
      isEnabled: true,
      versionUpdates: new Subject(),
      unrecoverable: new Subject(),
      checkForUpdate,
    } as unknown as SwUpdate);
    expect(await updates.check()).toBe('found');
    expect(await updates.check()).toBe('none');
    checkForUpdate.mockRejectedValueOnce(new Error('offline'));
    expect(await updates.check()).toBe('failed');
  });

  it('skips checks where there is no service worker', async () => {
    const updates = setup();
    expect(updates.supported).toBe(false);
    expect(await updates.check()).toBe('failed');
  });
});
