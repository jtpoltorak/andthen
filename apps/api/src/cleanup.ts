import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { accounts, loginCodes, sessions } from './db/schema';
import type { Mailer } from './mail';

const DAY_MS = 24 * 60 * 60 * 1000;
/** An account nobody has synced for this long is deleted. */
export const INACTIVE_DAYS = 730;
/** The warning email goes out this long before. */
export const WARNING_DAYS = 30;

export interface CleanupResult {
  warned: number;
  deleted: number;
  /** Warnings that couldn't be sent. Those accounts are kept and tried again next run. */
  failed: number;
}

/**
 * The daily tidy-up.
 *
 * An account counts as used when any of its devices synced (or, before the
 * first sync, when it was made). After 2 years minus 30 days unused, the owner
 * gets a warning email; 30 days after that warning, if still unused, the
 * account and its records are deleted. Syncing at any point clears the
 * warning. An account is never deleted without a warning having gone out at
 * least 30 days earlier, so a run that fails to send, or a server that was
 * down for a while, only ever delays a deletion.
 *
 * It also clears out expired sessions and sign-in codes.
 */
export async function cleanUp(db: Db, mailer: Mailer, appLink: string, now = new Date()) {
  const result: CleanupResult = { warned: 0, deleted: 0, failed: 0 };
  const lastUsed = sql`coalesce(${accounts.lastSyncAt}, ${accounts.createdAt})`;
  const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);

  const removed = await db
    .delete(accounts)
    .where(
      and(
        lt(lastUsed, ago(INACTIVE_DAYS)),
        isNotNull(accounts.inactiveWarnedAt),
        lt(accounts.inactiveWarnedAt, ago(WARNING_DAYS)),
      ),
    )
    .returning({ id: accounts.id });
  result.deleted = removed.length;

  const toWarn = await db
    .select({ id: accounts.id, email: accounts.email })
    .from(accounts)
    .where(and(lt(lastUsed, ago(INACTIVE_DAYS - WARNING_DAYS)), isNull(accounts.inactiveWarnedAt)));
  for (const account of toWarn) {
    try {
      await mailer.sendInactiveWarning(
        account.email,
        new Date(now.getTime() + WARNING_DAYS * DAY_MS),
        appLink,
      );
      await db.update(accounts).set({ inactiveWarnedAt: now }).where(eq(accounts.id, account.id));
      result.warned++;
    } catch {
      result.failed++;
    }
  }

  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(loginCodes).where(lt(loginCodes.expiresAt, now));
  return result;
}
