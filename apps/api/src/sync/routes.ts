import {
  latestPerRecord,
  parseSyncChange,
  type SyncChange,
  type SyncResponse,
} from '@andthen/core';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/session';
import type { Db } from '../db/client';
import { accounts, records } from '../db/schema';

/** Most changes one request may push. The app sends bigger first syncs in batches. */
export const MAX_PUSH = 1000;

export interface SyncOptions {
  db: Db;
  /** Most changes one response returns before saying `more: true`. */
  pageSize?: number;
  now?: () => Date;
}

const syncBody = {
  type: 'object',
  required: ['deviceId', 'cursor', 'changes'],
  properties: {
    deviceId: { type: 'string', minLength: 1, maxLength: 64 },
    cursor: { type: 'integer', minimum: 0 },
    changes: { type: 'array', maxItems: MAX_PUSH },
  },
} as const;

type SyncBody = { deviceId: string; cursor: number; changes: unknown[] };

/**
 * `POST /v1/sync`: one round trip that pushes this device's changes and pulls
 * everything other devices changed since `cursor`.
 *
 * Every stored change takes the next number from `record_seq` (the "deli
 * ticket"), and the cursor is the last number a device has seen. A per-account
 * lock makes an account's syncs take turns, so numbers are always committed in
 * order and a device can never skip past one that is still being written.
 */
export async function syncRoutes(app: FastifyInstance, opts: SyncOptions): Promise<void> {
  const { db } = opts;
  const now = opts.now ?? (() => new Date());
  const pageSize = opts.pageSize ?? 1000;
  const signedIn = requireSession(db, now);

  app.post<{ Body: SyncBody }>(
    '/v1/sync',
    { preHandler: signedIn, bodyLimit: 4 * 1024 * 1024, schema: { body: syncBody } },
    async (req, reply) => {
      const accountId = req.session!.accountId;
      const at = now();

      const incoming: SyncChange[] = [];
      for (const [i, raw] of req.body.changes.entries()) {
        const parsed = parseSyncChange(raw, at.getTime());
        if (!parsed.ok) {
          return reply.code(400).send({ error: 'bad_change', index: i, message: parsed.error });
        }
        incoming.push(parsed.change);
      }

      const response = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${accountId}))`);

        // Push: store each change unless the server already has a newer edit of that record.
        const written = new Set<number>();
        const winners = latestPerRecord(incoming);
        if (winners.length) {
          const rows = await tx
            .insert(records)
            .values(
              winners.map((c) => ({
                accountId,
                collection: c.collection,
                key: c.key,
                data: c.deleted ? null : c.data,
                updatedAt: c.updatedAt,
                deviceId: c.deviceId,
                deleted: c.deleted,
              })),
            )
            .onConflictDoUpdate({
              target: [records.accountId, records.collection, records.key],
              set: {
                data: sql`excluded.data`,
                updatedAt: sql`excluded.updated_at`,
                deviceId: sql`excluded.device_id`,
                deleted: sql`excluded.deleted`,
                seq: sql`nextval('record_seq')`,
              },
              // The newest edit wins; on a tie, the higher device id (the same rule as the app).
              setWhere: sql`(excluded.updated_at, excluded.device_id) > (${records.updatedAt}, ${records.deviceId})`,
            })
            .returning({ seq: records.seq });
          for (const r of rows) written.add(r.seq);
        }

        // Pull: everything after the cursor, oldest first, a page at a time.
        const page = await tx
          .select()
          .from(records)
          .where(and(eq(records.accountId, accountId), gt(records.seq, req.body.cursor)))
          .orderBy(asc(records.seq))
          .limit(pageSize + 1);
        const more = page.length > pageSize;
        const seen = more ? page.slice(0, pageSize) : page;

        await tx
          .update(accounts)
          .set({ lastSyncAt: at, inactiveWarnedAt: null })
          .where(eq(accounts.id, accountId));

        const result: SyncResponse = {
          cursor: seen.at(-1)?.seq ?? req.body.cursor,
          // What this request just wrote is already on the device: don't send it back.
          changes: seen
            .filter((r) => !written.has(r.seq))
            .map(
              (r) =>
                ({
                  collection: r.collection,
                  key: r.key,
                  updatedAt: r.updatedAt,
                  deviceId: r.deviceId,
                  deleted: r.deleted,
                  ...(r.deleted ? {} : { data: r.data }),
                }) as SyncChange,
            ),
          more,
        };
        return result;
      });

      return response;
    },
  );
}
