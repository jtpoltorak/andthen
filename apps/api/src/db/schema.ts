import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** One person who turned on sync. Sign-in is by email, so there's no password column. */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Stored lower-cased and trimmed. */
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /** Sync is free at launch. Kept so a paid plan can be added without a migration. */
  plan: text('plan').notNull().default('free'),
  /** Last successful sync from any device. Drives the inactive-account cleanup. */
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  /** When the "your account will be deleted" email went out. Cleared by the next sync. */
  inactiveWarnedAt: timestamp('inactive_warned_at', { withTimezone: true }),
});

/** A signed-in device. Only a hash of its token is stored. */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    deviceName: text('device_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessions_account_idx').on(t.accountId)],
);

/** A sign-in code waiting to be typed. Only its hash is stored. */
export const loginCodes = pgTable('login_codes', {
  email: text('email').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
});

/**
 * The deli ticket: every stored change takes the next number, so "everything
 * since ticket 812" is never ambiguous, whatever the devices' clocks say.
 */
export const recordSeq = pgSequence('record_seq');

/**
 * Every synced routine, habit, check-in and reflection, one row each, as JSON.
 * A tombstone keeps its row with `deleted` set, so other devices learn about it.
 */
export const records = pgTable(
  'records',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    collection: text('collection').notNull(),
    key: text('key').notNull(),
    data: jsonb('data'),
    /** The editing device's clock, in ms. Decides which edit wins. */
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    deviceId: text('device_id').notNull(),
    deleted: boolean('deleted').notNull().default(false),
    seq: bigint('seq', { mode: 'number' })
      .notNull()
      .default(sql`nextval('record_seq')`),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.collection, t.key] }),
    index('records_account_seq_idx').on(t.accountId, t.seq),
  ],
);
