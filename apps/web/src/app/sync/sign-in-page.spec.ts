import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HABIT_REPOSITORY, InMemoryHabitRepository } from '../data/habit-repository';
import { ApiError } from './sync-api';
import { SignInPage } from './sign-in-page';
import { SyncService } from './sync.service';

describe('SignInPage', () => {
  async function setup(signIn: (email: string, code: string) => Promise<void>) {
    const repo = new InMemoryHabitRepository();
    const sync = { signIn: vi.fn(signIn), sendCode: vi.fn(async () => {}), enabled: signal(false) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'sign-in', component: SignInPage },
            { path: 'welcome', children: [] },
            { path: 'today', children: [] },
          ],
          withComponentInputBinding(),
        ),
        { provide: HABIT_REPOSITORY, useValue: repo },
        { provide: SyncService, useValue: sync },
      ],
    });
    const harness = await RouterTestingHarness.create();
    return { harness, sync, repo };
  }

  it('signs in straight from the link in the email, then opens the app', async () => {
    const { harness, sync, repo } = await setup(async () => {
      // The first sync brought a routine down from the account.
      await repo.putRoutine({
        id: 'r1',
        anchor: 'After coffee',
        order: 0,
        createdOn: '2026-11-01',
      });
    });
    await harness.navigateByUrl('/sign-in?email=sam%40example.com&code=123456');
    await harness.fixture.whenStable();

    expect(sync.signIn).toHaveBeenCalledWith('sam@example.com', '123456');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/today'));
  });

  it('shows the form with the problem when the link has expired', async () => {
    const { harness } = await setup(async () => {
      throw new ApiError(400, 'code_expired');
    });
    await harness.navigateByUrl('/sign-in?email=sam%40example.com&code=123456');
    await harness.fixture.whenStable();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('That code has expired');
    expect(root.querySelector<HTMLInputElement>('#sync-email')!.value).toBe('sam@example.com');
  });

  it('says that signing in means agreeing to the Terms and Privacy policy', async () => {
    const { harness } = await setup(async () => {});
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('By continuing, you agree to the');
    expect(root.querySelector('a[href="/terms"]')).toBeTruthy();
  });

  it('without a link, asks for an email and sends a code', async () => {
    const { harness, sync } = await setup(async () => {});
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('#sync-email')!;
    input.value = 'sam@example.com';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    root.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await harness.fixture.whenStable();

    expect(sync.sendCode).toHaveBeenCalledWith('sam@example.com');
    expect(root.querySelector('#sync-code')).toBeTruthy();
  });
});
