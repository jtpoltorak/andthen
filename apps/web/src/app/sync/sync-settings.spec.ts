import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SyncSettings } from './sync-settings';
import { SyncService, type SyncPhase } from './sync.service';

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

describe('SyncSettings', () => {
  async function setup(on = true) {
    const phase = signal<SyncPhase>(on ? 'idle' : 'off');
    const sync = {
      phase,
      enabled: () => phase() !== 'off',
      email: signal(on ? 'sam@example.com' : undefined),
      lastSyncedAt: signal<number | undefined>(undefined),
      problem: signal(''),
      signedOutNotice: signal(false),
      accountDeleted: signal(false),
      syncNow: vi.fn(async () => {}),
      turnOff: vi.fn(async () => phase.set('off')),
      exportAccount: vi.fn(async () => ({ app: 'andthen', version: 1, data: {} })),
      deleteAccount: vi.fn(async () => {
        phase.set('off');
        sync.accountDeleted.set(true);
      }),
    };
    TestBed.configureTestingModule({
      imports: [SyncSettings],
      providers: [provideRouter([]), { provide: SyncService, useValue: sync }],
    });
    const fixture = TestBed.createComponent(SyncSettings);
    await fixture.whenStable();
    return { fixture, sync, root: fixture.nativeElement as HTMLElement };
  }

  it('offers to set up sync, with a link to the privacy page', async () => {
    const { root } = await setup(false);
    expect(button(root, 'Set up sync…')).toBeTruthy();
    expect(root.querySelector('a[href="/privacy"]')).toBeTruthy();
  });

  it('shows who is syncing and offers the account controls', async () => {
    const { root } = await setup();
    expect(root.textContent).toContain('Syncing as sam@example.com');
    expect(button(root, 'Download account data')).toBeTruthy();
    expect(button(root, 'Delete account…')).toBeTruthy();
  });

  it('downloads the account data as a file', async () => {
    const { fixture, sync, root } = await setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL ??= () => 'blob:x';
    URL.revokeObjectURL ??= () => {};
    button(root, 'Download account data')!.click();
    await fixture.whenStable();

    expect(sync.exportAccount).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(root.textContent).toMatch(/Saved andthen-account-\d{4}-\d{2}-\d{2}\.json/);
    click.mockRestore();
  });

  it('asks before deleting the account, and can be cancelled', async () => {
    const { fixture, sync, root } = await setup();
    button(root, 'Delete account…')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Delete your sync account?');

    button(root, 'Cancel')!.click();
    await fixture.whenStable();
    expect(sync.deleteAccount).not.toHaveBeenCalled();
    expect(button(root, 'Delete account…')).toBeTruthy();
  });

  it('deletes the account and says the data on this device is still here', async () => {
    const { fixture, sync, root } = await setup();
    button(root, 'Delete account…')!.click();
    await fixture.whenStable();
    button(root, 'Delete my account')!.click();
    await fixture.whenStable();

    expect(sync.deleteAccount).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain('Your sync account was deleted');
    expect(button(root, 'Set up sync…')).toBeTruthy();
  });

  it('says so when deleting fails', async () => {
    const { fixture, sync, root } = await setup();
    sync.deleteAccount.mockRejectedValueOnce(new Error('offline'));
    button(root, 'Delete account…')!.click();
    await fixture.whenStable();
    button(root, 'Delete my account')!.click();
    await fixture.whenStable();

    expect(root.textContent).toContain("Couldn't delete your account just now");
    expect(button(root, 'Delete my account')).toBeTruthy();
  });
});
