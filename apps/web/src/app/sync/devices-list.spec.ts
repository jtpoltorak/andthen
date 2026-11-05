import { TestBed } from '@angular/core/testing';
import { DevicesList, lastActive } from './devices-list';
import { OfflineError, type SignedInDevice } from './sync-api';
import { SyncService } from './sync.service';

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

const device = (over: Partial<SignedInDevice>): SignedInDevice => ({
  id: 'a',
  deviceName: 'Chrome on Mac',
  createdAt: '2026-10-01T12:00:00.000Z',
  lastSeenAt: new Date().toISOString(),
  current: false,
  ...over,
});

describe('lastActive', () => {
  const now = new Date(2026, 10, 5, 9);
  it('speaks in days', () => {
    expect(lastActive(new Date(2026, 10, 5, 1).toISOString(), now)).toBe('Active today');
    expect(lastActive(new Date(2026, 10, 4, 23).toISOString(), now)).toBe('Last active yesterday');
    expect(lastActive(new Date(2026, 10, 1).toISOString(), now)).toBe('Last active 4 days ago');
    expect(lastActive(new Date(2026, 9, 2).toISOString(), now)).toMatch(/^Last active \D*\d/);
    expect(lastActive(new Date(2025, 9, 2).toISOString(), now)).toContain('2025');
  });
});

describe('DevicesList', () => {
  async function setup(list: SignedInDevice[] | Error) {
    const sync = {
      devices: vi.fn(async () => {
        if (list instanceof Error) throw list;
        return list;
      }),
      signOutDevice: vi.fn(async (_id: string) => {}),
    };
    TestBed.configureTestingModule({
      imports: [DevicesList],
      providers: [{ provide: SyncService, useValue: sync }],
    });
    const fixture = TestBed.createComponent(DevicesList);
    await fixture.whenStable();
    return { fixture, sync, root: fixture.nativeElement as HTMLElement };
  }

  it('lists the devices and marks this one', async () => {
    const { root } = await setup([
      device({ id: 'me', deviceName: 'Safari on iPhone', current: true }),
      device({ id: 'b', deviceName: null }),
    ]);
    const items = [...root.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('Safari on iPhone');
    expect(items[0]).toContain('This device');
    expect(items[0]).toContain('Signed in');
    expect(items[1]).toContain('Unnamed device');
    expect(items[1]).toContain('Active today');
    // Only other devices can be signed out from here.
    expect(root.querySelectorAll('li')[0].querySelector('button')).toBeNull();
    expect(button(root, 'Sign out…')).toBeTruthy();
  });

  it('asks, then signs another device out', async () => {
    const { fixture, sync, root } = await setup([
      device({ id: 'me', current: true }),
      device({ id: 'old', deviceName: 'Firefox on Windows' }),
    ]);
    button(root, 'Sign out…')!.click();
    await fixture.whenStable();
    button(root, 'Keep')!.click();
    await fixture.whenStable();
    expect(sync.signOutDevice).not.toHaveBeenCalled();

    button(root, 'Sign out…')!.click();
    await fixture.whenStable();
    button(root, 'Sign out')!.click();
    await fixture.whenStable();

    expect(sync.signOutDevice).toHaveBeenCalledWith('old');
    expect(root.querySelectorAll('li').length).toBe(1);
    expect(root.textContent).toContain('Signed out Firefox on Windows');
  });

  it('says so when signing out fails, and keeps the device listed', async () => {
    const { fixture, sync, root } = await setup([
      device({ id: 'me', current: true }),
      device({ id: 'old' }),
    ]);
    sync.signOutDevice.mockRejectedValueOnce(new OfflineError());
    button(root, 'Sign out…')!.click();
    await fixture.whenStable();
    button(root, 'Sign out')!.click();
    await fixture.whenStable();

    expect(root.textContent).toContain("You're offline, so that device couldn't be signed out");
    expect(root.querySelectorAll('li').length).toBe(2);
  });

  it('can try again when the list fails to load', async () => {
    const { fixture, sync, root } = await setup(new OfflineError());
    expect(root.textContent).toContain("You're offline");

    sync.devices.mockResolvedValueOnce([device({ id: 'me', current: true })]);
    button(root, 'Try again')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('This device');
    expect(root.textContent).toContain('Only this device so far');
  });
});
