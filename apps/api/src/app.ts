import cors from '@fastify/cors';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Db } from './db/client';

export interface AppOptions {
  db: Db;
  allowedOrigins: string[];
  logger?: boolean;
}

/** Builds the API without starting it, so tests can call it directly. */
export async function buildApp({
  db,
  allowedOrigins,
  logger = false,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger, trustProxy: true });

  await app.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  });

  // Railway's health check. It also proves the database answers.
  app.get('/health', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true };
    } catch (err) {
      app.log.error(err, 'Health check could not reach the database');
      return reply.code(503).send({ ok: false });
    }
  });

  return app;
}
