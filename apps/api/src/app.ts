import cors from '@fastify/cors';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import { accountRoutes } from './account/routes';
import { authRoutes } from './auth/routes';
import type { Db } from './db/client';
import type { Mailer } from './mail';
import { syncRoutes } from './sync/routes';
import { APP_VERSION } from './version';

export interface AppOptions {
  db: Db;
  allowedOrigins: string[];
  mailer: Mailer;
  logger?: boolean;
  /** For tests: a fixed clock. */
  now?: () => Date;
  /** For tests: a small page size, to exercise paging. */
  syncPageSize?: number;
}

/** Builds the API without starting it, so tests can call it directly. */
export async function buildApp({
  db,
  allowedOrigins,
  mailer,
  logger = false,
  now,
  syncPageSize,
}: AppOptions): Promise<FastifyInstance> {
  // Behind Railway's proxy (and Cloudflare), the client address arrives in
  // X-Forwarded-For. It can be spoofed by a direct caller, so the per-IP sign-in
  // limit is a soft one; the per-email limit is what really protects inboxes.
  const app = Fastify({ logger, trustProxy: true });

  await app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });

  // Railway's health check. It also proves the database answers, and says which
  // version is running so a deploy can be matched against the web app.
  app.get('/health', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true, version: APP_VERSION };
    } catch (err) {
      app.log.error(err, 'Health check could not reach the database');
      return reply.code(503).send({ ok: false, version: APP_VERSION });
    }
  });

  await app.register(authRoutes, {
    db,
    mailer,
    appOrigin: allowedOrigins[0] ?? 'https://andthenhabits.com',
    now,
  });
  await app.register(syncRoutes, { db, now, pageSize: syncPageSize });
  await app.register(accountRoutes, { db, now });

  return app;
}
