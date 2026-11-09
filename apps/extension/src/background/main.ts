/**
 * The background worker: keeps the toolbar badge current, sends reminders at each
 * routine's usual time, and syncs now and then so the badge reflects check-ins
 * made on other devices.
 *
 * It wakes on alarms (once a minute, and every 15 minutes to sync) and when the
 * popup says something changed, does its work, and goes back to sleep. No Angular:
 * just the shared core and data packages.
 */
import { checkInTime, toDayKey, type CheckInKind } from '@andthen/core';
import { LIVE_API_ORIGIN, SyncApiClient, SyncEngine, SyncingHabitRepository } from '@andthen/data';
import {
  extensionApi,
  loadExtSettings,
  loadSentToday,
  saveSentToday,
} from '../shared/ext-settings';
import { notificationId, routineFromNotification, todayStatus } from './today-status';
import { hasSyncConsent } from '../shared/data-consent';

/** Firefox's `browser` where there is one (its promise-based API), otherwise Chrome's `chrome`. */
const ext = extensionApi()!;

const TICK = 'andthen-tick';
const SYNC = 'andthen-sync';
const SYNC_EVERY_MINUTES = 15;
const BADGE_COLOR = '#F2B544';
const BADGE_TEXT_COLOR = '#3D2B04';

const repo = new SyncingHabitRepository();
const engine = new SyncEngine({
  repo,
  api: new SyncApiClient(LIVE_API_ORIGIN),
  // Alarms wake the worker instead; its timers stop when it sleeps.
  pollMs: 0,
});
let engineStarted = false;

/** Works out today's status, updates the badge and sends any reminders due. */
async function refresh(now = new Date()): Promise<void> {
  const day = toDayKey(now);
  const [snapshot, settings, sent] = await Promise.all([
    repo.loadAll(),
    loadExtSettings(),
    loadSentToday(day),
  ]);
  const status = todayStatus(snapshot, settings, sent, now);
  await ext.action.setBadgeText({ text: status.badge });
  await ext.action.setTitle({ title: status.title });
  if (status.due.length === 0) return;
  await saveSentToday({ day, routineIds: [...sent, ...status.due.map((d) => d.routineId)] });
  for (const reminder of status.due) {
    await showReminder(notificationId(reminder.routineId), reminder.title, reminder.body);
  }
}

/** Chrome and Edge add Done and Did 2 min buttons. Firefox has no buttons, so it gets none. */
async function showReminder(id: string, title: string, message: string): Promise<void> {
  const options: chrome.notifications.Options = {
    type: 'basic',
    iconUrl: ext.runtime.getURL('icons/icon-128.png'),
    title,
    message,
  };
  try {
    await ext.notifications.create(id, {
      ...options,
      buttons: [{ title: 'Done' }, { title: 'Did 2 min' }],
    });
  } catch {
    await ext.notifications.create(id, options);
  }
}

/** Syncs if sync is on. Starting the engine the first time also syncs. */
async function sync(): Promise<void> {
  // In Firefox, someone can take back sync's data consent in the add-on settings.
  if (!(await hasSyncConsent())) return;
  if (!engineStarted) {
    engineStarted = true;
    await engine.start();
  } else {
    await engine.syncNow();
  }
}

/** A Done or Did 2 min from a reminder: answers the routine's next habit, as the popup would. */
async function answerFromReminder(routineId: string, kind: CheckInKind): Promise<void> {
  const now = new Date();
  const [snapshot, settings] = await Promise.all([repo.loadAll(), loadExtSettings()]);
  const chain = todayStatus(snapshot, settings, [], now).chains.find(
    (c) => c.routine.id === routineId,
  );
  const next = chain?.links.find((l) => l.isNext);
  if (!next) return;
  await repo.putCheckIn({
    habitId: next.habit.id,
    date: toDayKey(now),
    kind,
    at: checkInTime(now),
  });
  await refresh(now);
  await sync();
}

async function ensureAlarms(): Promise<void> {
  if (!(await ext.alarms.get(TICK))) await ext.alarms.create(TICK, { periodInMinutes: 1 });
  if (!(await ext.alarms.get(SYNC)))
    await ext.alarms.create(SYNC, { periodInMinutes: SYNC_EVERY_MINUTES });
}

async function setUp(): Promise<void> {
  await ext.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await ext.action.setBadgeTextColor?.({ color: BADGE_TEXT_COLOR });
  await ensureAlarms();
  await refresh();
}

const quietly = (work: Promise<unknown>) => void work.catch((e) => console.warn('AndThen:', e));

ext.runtime.onInstalled.addListener(() => quietly(setUp()));
ext.runtime.onStartup.addListener(() =>
  quietly(
    setUp()
      .then(sync)
      .then(() => refresh()),
  ),
);

ext.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK) quietly(refresh());
  if (alarm.name === SYNC) quietly(sync().then(() => refresh()));
});

ext.runtime.onMessage.addListener((message) => {
  if ((message as { type?: string } | null)?.type === 'andthen:changed') quietly(refresh());
});

ext.storage.onChanged.addListener((_changes, area) => {
  if (area === 'local') quietly(refresh());
});

ext.notifications.onClicked.addListener((id) => {
  quietly(ext.notifications.clear(id));
  // Opening the popup from here works in recent Chrome; elsewhere the click just clears it.
  quietly(ext.action.openPopup?.() ?? Promise.resolve());
});

ext.notifications.onButtonClicked?.addListener((id, index) => {
  const routineId = routineFromNotification(id);
  quietly(ext.notifications.clear(id));
  if (routineId) quietly(answerFromReminder(routineId, index === 0 ? 'full' : 'mini'));
});

// Firefox doesn't keep alarms across restarts, and a worker can wake for any event,
// so make sure they exist whenever this script runs.
quietly(ensureAlarms());
