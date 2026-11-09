import { askForSyncConsent, hasSyncConsent, needsDataConsent } from './data-consent';
import { fakeBrowser } from './fake-browser.testing';

describe('sync data consent', () => {
  afterEach(() => delete (globalThis as { browser?: unknown }).browser);

  it('needs nothing outside an extension, or in Chrome and Edge', async () => {
    expect(needsDataConsent()).toBe(false);
    expect(await askForSyncConsent()).toBe(true);
    const { request } = fakeBrowser({ firefox: false });
    expect(await askForSyncConsent()).toBe(true);
    expect(await hasSyncConsent()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('asks Firefox for the email and sign-in data, and respects a no', async () => {
    const { request } = fakeBrowser({ firefox: true, allow: false });
    expect(await askForSyncConsent()).toBe(false);
    expect(request).toHaveBeenCalledWith({
      data_collection: ['personallyIdentifyingInfo', 'authenticationInfo'],
    });
  });

  it('notices when Firefox consent was taken back', async () => {
    fakeBrowser({ firefox: true, granted: ['personallyIdentifyingInfo'] });
    expect(await hasSyncConsent()).toBe(false);
    fakeBrowser({ firefox: true, granted: ['personallyIdentifyingInfo', 'authenticationInfo'] });
    expect(await hasSyncConsent()).toBe(true);
  });
});
