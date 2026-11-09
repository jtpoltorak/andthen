import { Injectable, isDevMode } from '@angular/core';
import { LIVE_API_ORIGIN, SyncApiClient } from '@andthen/data';

export {
  ApiError,
  OfflineError,
  signInErrorMessage,
  type Account,
  type SignedIn,
  type SignedInDevice,
} from '@andthen/data';

/** Where the sync server lives. `npm run dev -w @andthen/api` serves it on port 3000. */
export const API_ORIGIN = isDevMode() ? 'http://localhost:3000' : LIVE_API_ORIGIN;

/** The sync API client, for Angular's injector. */
@Injectable({ providedIn: 'root' })
export class SyncApi extends SyncApiClient {
  constructor() {
    super(API_ORIGIN);
  }
}
