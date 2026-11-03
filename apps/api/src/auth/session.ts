import { and, eq, gt } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from '../db/client';
import { sessions } from '../db/schema';
import { sha256 } from './crypto';

/** Sessions last 90 days and renew whenever the device is used. */
export const SESSION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SessionInfo {
  id: string;
  accountId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireSession` on signed-in routes. */
    session?: SessionInfo;
  }
}

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * DAY_MS);
}

function bearer(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

/**
 * A preHandler for signed-in routes: checks the Bearer token, sets
 * `req.session`, and slides the expiry forward (at most once a day, to keep
 * writes rare).
 */
export function requireSession(db: Db, now: () => Date = () => new Date()) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = bearer(req);
    if (!token) return reply.code(401).send({ error: 'signed_out' });
    const at = now();
    const [row] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, at)))
      .limit(1);
    if (!row) return reply.code(401).send({ error: 'signed_out' });

    if (at.getTime() - row.lastSeenAt.getTime() > DAY_MS) {
      await db
        .update(sessions)
        .set({ lastSeenAt: at, expiresAt: sessionExpiry(at) })
        .where(eq(sessions.id, row.id));
    }
    req.session = { id: row.id, accountId: row.accountId };
  };
}
