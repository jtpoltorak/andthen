import { extensionApi } from './ext-settings';

/**
 * What sync sends to AndThen's server, in Firefox's data-consent terms: the email you
 * sign in with, and the sign-in code and device token. (Your habits go too; Firefox has
 * no category for them, and the privacy policy says so.)
 */
export const SYNC_DATA_COLLECTION = ['personallyIdentifyingInfo', 'authenticationInfo'] as const;

/**
 * True in a Firefox build, which declares sync's data collection as optional
 * (scripts/build.mjs), so it needs the person's OK before sending anything.
 * Chrome and Edge have no such consent; their store listing discloses it instead.
 */
export function needsDataConsent(): boolean {
  const manifest = extensionApi()?.runtime.getManifest?.();
  return !!manifest?.browser_specific_settings?.gecko?.data_collection_permissions?.optional;
}

/**
 * Asks Firefox for sync's data collection. Call it first thing in a click handler, before
 * any other await: Firefox only shows the prompt for a click. Resolves true where no
 * consent is needed, or once given (Firefox doesn't ask again).
 */
export async function askForSyncConsent(): Promise<boolean> {
  if (!needsDataConsent()) return true;
  const permissions = extensionApi()?.permissions;
  if (!permissions) return true;
  try {
    return await permissions.request({ data_collection: [...SYNC_DATA_COLLECTION] });
  } catch {
    return false;
  }
}

/** False once someone took back sync's data consent in Firefox's add-on settings. */
export async function hasSyncConsent(): Promise<boolean> {
  if (!needsDataConsent()) return true;
  const granted = (await extensionApi()?.permissions?.getAll())?.data_collection ?? [];
  return SYNC_DATA_COLLECTION.every((d) => granted.includes(d));
}
