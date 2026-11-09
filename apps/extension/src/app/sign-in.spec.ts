import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ApiError } from '@web/sync/sync-api';
import { SyncService } from '@web/sync/sync.service';
import { PENDING_KEY, PENDING_MS, SignIn } from './sign-in';

const buttonsByText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].filter((b) => b.textContent?.trim().startsWith(text));

function type(root: HTMLElement, selector: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('SignIn', () => {
  let sync: { sendCode: ReturnType<typeof vi.fn>; signIn: ReturnType<typeof vi.fn> };

  beforeEach(() => localStorage.clear());

  async function setup() {
    sync = {
      sendCode: vi.fn(async () => undefined),
      signIn: vi.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [{ provide: SyncService, useValue: { ...sync, phase: signal('off') } }],
    });
    const fixture = TestBed.createComponent(SignIn);
    const signedIn = vi.fn();
    fixture.componentInstance.signedIn.subscribe(signedIn);
    await fixture.whenStable();
    return { fixture, root: fixture.nativeElement as HTMLElement, signedIn };
  }

  it('emails a code, then signs in with it', async () => {
    const { fixture, root, signedIn } = await setup();
    type(root, '#ext-email', ' sam@example.com ');
    await fixture.whenStable();
    buttonsByText(root, 'Email me a code')[0].click();
    await fixture.whenStable();
    expect(sync.sendCode).toHaveBeenCalledWith('sam@example.com');
    expect(root.textContent).toContain('We sent a 6-digit code to sam@example.com');

    type(root, '#ext-code', '123 456');
    await fixture.whenStable();
    buttonsByText(root, 'Sign in and sync')[0].click();
    await fixture.whenStable();
    expect(sync.signIn).toHaveBeenCalledWith('sam@example.com', '123456');
    expect(signedIn).toHaveBeenCalled();
    expect(localStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('remembers the code step while the popup is closed to read the email', async () => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ email: 'sam@example.com', sentAt: Date.now() }),
    );
    const { root } = await setup();
    expect(root.querySelector('#ext-code')).not.toBeNull();
    expect(root.textContent).toContain('sam@example.com');
  });

  it('starts over once the code has expired', async () => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ email: 'sam@example.com', sentAt: Date.now() - PENDING_MS - 1 }),
    );
    const { root } = await setup();
    expect(root.querySelector('#ext-email')).not.toBeNull();
  });

  it('explains a wrong code', async () => {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ email: 'sam@example.com', sentAt: Date.now() }),
    );
    const { fixture, root, signedIn } = await setup();
    sync.signIn.mockRejectedValueOnce(new ApiError(400, 'wrong_code'));
    type(root, '#ext-code', '000000');
    await fixture.whenStable();
    buttonsByText(root, 'Sign in and sync')[0].click();
    await fixture.whenStable();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain("That code isn't right");
    expect(signedIn).not.toHaveBeenCalled();
  });
});
