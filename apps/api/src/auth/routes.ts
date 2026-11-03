import { and, asc, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/client';
import { accounts, loginCodes, sessions } from '../db/schema';
import { MailNotConfiguredError, type Mailer } from '../mail';
import { RateLimiter } from '../rate-limit';
import { hashCode, newCode, newToken, normalizeEmail, sameHash, sha256 } from './crypto';
import { requireSession, sessionExpiry } from './session';

/** A code works for 10 minutes and allows 5 wrong tries. */
export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
const HOUR_MS = 60 * 60 * 1000;

export interface AuthOptions {
  db: Db;
  mailer: Mailer;
  /** Where the web app lives; the email's one-tap link points here. */
  appOrigin: string;
  now?: () => Date;
}

const emailBody = {
  type: 'object',
  required: ['email'],
  additionalProperties: false,
  properties: { email: { type: 'string', maxLength: 254 } },
} as const;

const verifyBody = {
  type: 'object',
  required: ['email', 'code'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', maxLength: 254 },
    code: { type: 'string', maxLength: 16 },
    deviceName: { type: 'string', maxLength: 80 },
  },
} as const;

/** Sign-in by emailed code (and the same code as a one-tap link), plus account and device basics. */
export async function authRoutes(app: FastifyInstance, opts: AuthOptions): Promise<void> {
  const { db, mailer, appOrigin } = opts;
  const now = opts.now ?? (() => new Date());
  const perEmail = new RateLimiter(5, HOUR_MS, () => now().getTime());
  const perIp = new RateLimiter(20, HOUR_MS, () => now().getTime());
  const signedIn = requireSession(db, now);

  /**
   * Emails a sign-in code. Answers 204 whether or not an account exists, so it
   * can't be used to find out who uses AndThen.
   */
  app.post<{ Body: { email: string } }>(
    '/v1/auth/email/start',
    { schema: { body: emailBody } },
    async (req, reply) => {
      const email = normalizeEmail(req.body.email);
      if (!email) return reply.code(400).send({ error: 'bad_email' });
      if (!perIp.take(req.ip) || !perEmail.take(email)) {
        return reply.code(429).send({ error: 'too_many_requests' });
      }

      const code = newCode();
      const expiresAt = new Date(now().getTime() + CODE_MINUTES * 60 * 1000);
      await db
        .insert(loginCodes)
        .values({ email, codeHash: hashCode(email, code), expiresAt, attempts: 0 })
        .onConflictDoUpdate({
          target: loginCodes.email,
          set: { codeHash: hashCode(email, code), expiresAt, attempts: 0 },
        });

      const link = `${appOrigin}/sign-in?${new URLSearchParams({ email, code })}`;
      try {
        await mailer.sendSignInCode(email, code, link);
      } catch (err) {
        req.log.error(err, 'Could not send a sign-in email');
        const notSetUp = err instanceof MailNotConfiguredError;
        return reply.code(503).send({ error: notSetUp ? 'email_not_set_up' : 'email_failed' });
      }
      return reply.code(204).send();
    },
  );

  /** Swaps a correct code for a session token. Creates the account on first sign-in. */
  app.post<{ Body: { email: string; code: string; deviceName?: string } }>(
    '/v1/auth/email/verify',
    { schema: { body: verifyBody } },
    async (req, reply) => {
      const email = normalizeEmail(req.body.email);
      const code = req.body.code.replace(/\s/g, '');
      if (!email) return reply.code(400).send({ error: 'bad_email' });

      const at = now();
      const [pending] = await db.select().from(loginCodes).where(eq(loginCodes.email, email));
      if (!pending || pending.expiresAt <= at || pending.attempts >= MAX_ATTEMPTS) {
        if (pending) await db.delete(loginCodes).where(eq(loginCodes.email, email));
        return reply.code(400).send({ error: 'code_expired' });
      }
      if (!sameHash(pending.codeHash, hashCode(email, code))) {
        await db
          .update(loginCodes)
          .set({ attempts: pending.attempts + 1 })
          .where(eq(loginCodes.email, email));
        const left = MAX_ATTEMPTS - pending.attempts - 1;
        return reply.code(400).send({ error: left > 0 ? 'wrong_code' : 'code_expired' });
      }

      await db.delete(loginCodes).where(eq(loginCodes.email, email));
      await db.insert(accounts).values({ email }).onConflictDoNothing({ target: accounts.email });
      const [account] = await db.select().from(accounts).where(eq(accounts.email, email));

      const token = newToken();
      await db.insert(sessions).values({
        accountId: account.id,
        tokenHash: sha256(token),
        deviceName: req.body.deviceName?.trim() || null,
        createdAt: at,
        lastSeenAt: at,
        expiresAt: sessionExpiry(at),
      });
      return {
        token,
        account: { id: account.id, email: account.email, createdAt: account.createdAt },
      };
    },
  );

  /** Signs this device out. */
  app.post('/v1/auth/logout', { preHandler: signedIn }, async (req, reply) => {
    await db.delete(sessions).where(eq(sessions.id, req.session!.id));
    return reply.code(204).send();
  });

  /** The account and its signed-in devices. */
  app.get('/v1/me', { preHandler: signedIn }, async (req) => {
    const { id, accountId } = req.session!;
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    const devices = await db
      .select()
      .from(sessions)
      .where(eq(sessions.accountId, accountId))
      .orderBy(asc(sessions.createdAt));
    return {
      id: account.id,
      email: account.email,
      createdAt: account.createdAt,
      plan: account.plan,
      sessions: devices.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        current: s.id === id,
      })),
    };
  });

  /** Signs out another device (or this one). */
  app.delete<{ Params: { id: string } }>(
    '/v1/me/sessions/:id',
    {
      preHandler: signedIn,
      schema: {
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
      },
    },
    async (req, reply) => {
      const removed = await db
        .delete(sessions)
        .where(and(eq(sessions.id, req.params.id), eq(sessions.accountId, req.session!.accountId)))
        .returning({ id: sessions.id });
      return reply.code(removed.length ? 204 : 404).send();
    },
  );
}
