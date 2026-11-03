import { createBackup, toDayKey, type BackupData } from '@andthen/core';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/session';
import type { Db } from '../db/client';
import { accounts, loginCodes, records } from '../db/schema';

export interface AccountOptions {
  db: Db;
  now?: () => Date;
}

/** The account's own controls: take a copy of everything, or delete it all. */
export async function accountRoutes(app: FastifyInstance, opts: AccountOptions): Promise<void> {
  const { db } = opts;
  const now = opts.now ?? (() => new Date());
  const signedIn = requireSession(db, now);

  /**
   * Everything the account has synced, as a backup file. It's the same format
   * as the app's own backups, so it can be restored on any device.
   */
  app.get('/v1/export', { preHandler: signedIn }, async (req, reply) => {
    const rows = await db
      .select({ collection: records.collection, data: records.data })
      .from(records)
      .where(and(eq(records.accountId, req.session!.accountId), eq(records.deleted, false)));
    const data: BackupData = { routines: [], habits: [], checkIns: [], reflections: [] };
    for (const row of rows) {
      const list = data[row.collection as keyof BackupData] as unknown[] | undefined;
      if (list && row.data) list.push(row.data);
    }
    // Normally everything lines up, but a file the app refuses would be no use,
    // so leave out anything whose routine or habit isn't there.
    const routineIds = new Set(data.routines.map((r) => r.id));
    data.habits = data.habits.filter((h) => routineIds.has(h.routineId));
    const habitIds = new Set(data.habits.map((h) => h.id));
    data.checkIns = data.checkIns.filter((c) => habitIds.has(c.habitId));

    const at = now();
    return reply
      .header('content-disposition', `attachment; filename="andthen-account-${toDayKey(at)}.json"`)
      .send(createBackup(data, at));
  });

  /**
   * Deletes the account: its synced records, every signed-in device, and any
   * sign-in code waiting for it. Data on the devices themselves is untouched.
   */
  app.delete('/v1/me', { preHandler: signedIn }, async (req, reply) => {
    await db.transaction(async (tx) => {
      const [account] = await tx
        .delete(accounts)
        .where(eq(accounts.id, req.session!.accountId))
        .returning({ email: accounts.email });
      // Sessions and records go with the account (on delete cascade).
      if (account) await tx.delete(loginCodes).where(eq(loginCodes.email, account.email));
    });
    return reply.code(204).send();
  });
}
