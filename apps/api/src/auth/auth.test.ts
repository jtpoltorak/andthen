import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app';
import type { Db } from '../db/client';
import { accounts, loginCodes, sessions } from '../db/schema';
import { NoMailer, type Mailer } from '../mail';
import { testDb } from '../test-db';

/** Keeps the emails instead of sending them. */
class FakeMailer implements Mailer {
  sent: { to: string; code: string; link: string }[] = [];
  async sendSignInCode(to: string, code: string, link: string) {
    this.sent.push({ to, code, link });
  }
  async sendInactiveWarning() {}
  last() {
    return this.sent.at(-1)!;
  }
}

let db: Db;
let close: () => Promise<void>;
let app: FastifyInstance;
let mailer: FakeMailer;
let clock: Date;

const origin = 'https://andthenhabits.com';

beforeAll(async () => {
  ({ db, close } = await testDb());
});

beforeEach(async () => {
  await db.delete(accounts);
  await db.delete(loginCodes);
  mailer = new FakeMailer();
  clock = new Date('2026-11-03T12:00:00Z');
  app = await buildApp({ db, allowedOrigins: [origin], mailer, now: () => clock });
});

afterAll(async () => {
  await app.close();
  await close();
});

const start = (email: string, ip = '1.2.3.4') =>
  app.inject({
    method: 'POST',
    url: '/v1/auth/email/start',
    payload: { email },
    remoteAddress: ip,
  });

const verify = (email: string, code: string, deviceName?: string) =>
  app.inject({
    method: 'POST',
    url: '/v1/auth/email/verify',
    payload: { email, code, deviceName },
  });

async function signIn(email = 'sam@example.com', deviceName = 'Phone') {
  await start(email);
  const res = await verify(email, mailer.last().code, deviceName);
  return res.json() as { token: string; account: { id: string; email: string } };
}

const authed = (token: string) => ({ authorization: `Bearer ${token}` });

describe('sign-in by emailed code', () => {
  it('emails a 6-digit code and a one-tap link', async () => {
    const res = await start('  Sam@Example.com ');
    expect(res.statusCode).toBe(204);
    const mail = mailer.last();
    expect(mail.to).toBe('sam@example.com');
    expect(mail.code).toMatch(/^\d{6}$/);
    expect(mail.link).toBe(`${origin}/sign-in?email=sam%40example.com&code=${mail.code}`);
  });

  it('stores only a hash of the code', async () => {
    await start('sam@example.com');
    const [row] = await db.select().from(loginCodes);
    expect(row.codeHash).not.toContain(mailer.last().code);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses something that is not an email', async () => {
    expect((await start('not-an-email')).statusCode).toBe(400);
    expect(mailer.sent).toEqual([]);
  });

  it('signs in with the right code, creating the account once', async () => {
    const first = await signIn();
    expect(first.token).toMatch(/^[\w-]{43}$/);
    expect(first.account.email).toBe('sam@example.com');

    const second = await signIn();
    expect(second.account.id).toBe(first.account.id);
    expect(second.token).not.toBe(first.token);
    expect(await db.select().from(accounts)).toHaveLength(1);
  });

  it('accepts the code typed with a space, as the email shows it', async () => {
    await start('sam@example.com');
    const { code } = mailer.last();
    const res = await verify('sam@example.com', `${code.slice(0, 3)} ${code.slice(3)}`);
    expect(res.statusCode).toBe(200);
  });

  it('a code works only once', async () => {
    await start('sam@example.com');
    const { code } = mailer.last();
    expect((await verify('sam@example.com', code)).statusCode).toBe(200);
    expect((await verify('sam@example.com', code)).json()).toEqual({ error: 'code_expired' });
  });

  it('a code expires after 10 minutes', async () => {
    await start('sam@example.com');
    clock = new Date(clock.getTime() + 10 * 60 * 1000 + 1);
    expect((await verify('sam@example.com', mailer.last().code)).json()).toEqual({
      error: 'code_expired',
    });
  });

  it('allows 5 wrong tries, then the code stops working', async () => {
    await start('sam@example.com');
    const { code } = mailer.last();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) {
      expect((await verify('sam@example.com', wrong)).json()).toEqual({ error: 'wrong_code' });
    }
    expect((await verify('sam@example.com', wrong)).json()).toEqual({ error: 'code_expired' });
    expect((await verify('sam@example.com', code)).json()).toEqual({ error: 'code_expired' });
  });

  it('asking again replaces the old code', async () => {
    await start('sam@example.com');
    const old = mailer.last().code;
    await start('sam@example.com');
    const fresh = mailer.last().code;
    if (old !== fresh) {
      expect((await verify('sam@example.com', old)).statusCode).toBe(400);
    }
    expect((await verify('sam@example.com', fresh)).statusCode).toBe(200);
  });

  it('limits codes to 5 an hour per email and 20 an hour per address', async () => {
    for (let i = 0; i < 5; i++) expect((await start('sam@example.com')).statusCode).toBe(204);
    expect((await start('sam@example.com')).statusCode).toBe(429);
    clock = new Date(clock.getTime() + 60 * 60 * 1000);
    expect((await start('sam@example.com')).statusCode).toBe(204);

    for (let i = 0; i < 20; i++) await start(`p${i}@example.com`, '9.9.9.9');
    expect((await start('another@example.com', '9.9.9.9')).statusCode).toBe(429);
  });

  it('answers 503 until email sending is set up', async () => {
    const noMail = await buildApp({ db, allowedOrigins: [origin], mailer: new NoMailer() });
    const res = await noMail.inject({
      method: 'POST',
      url: '/v1/auth/email/start',
      payload: { email: 'sam@example.com' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: 'email_not_set_up' });
    await noMail.close();
  });
});

describe('sessions', () => {
  it('stores only a hash of the token', async () => {
    const { token } = await signIn();
    const [row] = await db.select().from(sessions);
    expect(row.tokenHash).not.toBe(token);
    expect(row.deviceName).toBe('Phone');
  });

  it('GET /v1/me needs a valid token', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
    const bad = await app.inject({ method: 'GET', url: '/v1/me', headers: authed('nope') });
    expect(bad.statusCode).toBe(401);
  });

  it('GET /v1/me lists the signed-in devices', async () => {
    await signIn('sam@example.com', 'Phone');
    const { token } = await signIn('sam@example.com', 'Laptop');
    const me = (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(token) })).json();
    expect(me).toMatchObject({ email: 'sam@example.com', plan: 'free' });
    expect(
      me.sessions.map((s: { deviceName: string; current: boolean }) => [s.deviceName, s.current]),
    ).toEqual([
      ['Phone', false],
      ['Laptop', true],
    ]);
  });

  it('expires after 90 days unused, and using it slides the expiry forward', async () => {
    const { token } = await signIn();
    clock = new Date(clock.getTime() + 89 * 24 * 60 * 60 * 1000);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(token) })).statusCode,
    ).toBe(200);
    clock = new Date(clock.getTime() + 89 * 24 * 60 * 60 * 1000);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(token) })).statusCode,
    ).toBe(200);
    clock = new Date(clock.getTime() + 91 * 24 * 60 * 60 * 1000);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(token) })).statusCode,
    ).toBe(401);
  });

  it('logout ends only this device', async () => {
    const phone = await signIn('sam@example.com', 'Phone');
    const laptop = await signIn('sam@example.com', 'Laptop');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: authed(phone.token),
    });
    expect(res.statusCode).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(phone.token) })).statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(laptop.token) }))
        .statusCode,
    ).toBe(200);
  });

  it("signs out another device, but never someone else's", async () => {
    const phone = await signIn('sam@example.com', 'Phone');
    const laptop = await signIn('sam@example.com', 'Laptop');
    const other = await signIn('alex@example.com', 'Tablet');
    const [phoneRow] = await db.select().from(sessions).where(eq(sessions.deviceName, 'Phone'));

    const denied = await app.inject({
      method: 'DELETE',
      url: `/v1/me/sessions/${phoneRow.id}`,
      headers: authed(other.token),
    });
    expect(denied.statusCode).toBe(404);

    const ok = await app.inject({
      method: 'DELETE',
      url: `/v1/me/sessions/${phoneRow.id}`,
      headers: authed(laptop.token),
    });
    expect(ok.statusCode).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: '/v1/me', headers: authed(phone.token) })).statusCode,
    ).toBe(401);
  });
});
