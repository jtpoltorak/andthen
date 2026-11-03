import { Injectable, isDevMode } from '@angular/core';
import type { BackupFile, SyncRequest, SyncResponse } from '@andthen/core';

/** Where the sync server lives. `npm run dev -w @andthen/api` serves it on port 3000. */
export const API_ORIGIN = isDevMode() ? 'http://localhost:3000' : 'https://api.andthenhabits.com';

/** The server said no. `code` is its error code, such as `wrong_code`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`The sync server answered ${status} ${code}`);
  }
}

/** The request never got an answer: offline, or the server is down. */
export class OfflineError extends Error {
  constructor() {
    super("Couldn't reach the sync server");
  }
}

export interface SignedIn {
  token: string;
  account: { id: string; email: string };
}

/** A thin fetch wrapper for the sync API. Nothing here touches the device's data. */
@Injectable({ providedIn: 'root' })
export class SyncApi {
  /** Overridable for tests. */
  fetch: typeof fetch = (...args) => fetch(...args);

  /** Emails a sign-in code (and link) to the address. */
  async startEmail(email: string): Promise<void> {
    await this.call('POST', '/v1/auth/email/start', { email });
  }

  /** Swaps the emailed code for a session token. */
  async verifyEmail(email: string, code: string, deviceName?: string): Promise<SignedIn> {
    return (await this.call('POST', '/v1/auth/email/verify', {
      email,
      code,
      ...(deviceName ? { deviceName } : {}),
    })) as SignedIn;
  }

  async logout(token: string): Promise<void> {
    await this.call('POST', '/v1/auth/logout', undefined, token);
  }

  /** Everything the account has synced, as a backup file. */
  async exportData(token: string): Promise<BackupFile> {
    return (await this.call('GET', '/v1/export', undefined, token)) as BackupFile;
  }

  /** Deletes the account, its synced data and every signed-in device. */
  async deleteAccount(token: string): Promise<void> {
    await this.call('DELETE', '/v1/me', undefined, token);
  }

  async sync(token: string, body: SyncRequest): Promise<SyncResponse> {
    return (await this.call('POST', '/v1/sync', body, token)) as SyncResponse;
  }

  private async call(method: string, path: string, body?: unknown, token?: string) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers['authorization'] = `Bearer ${token}`;
    let res: Response;
    try {
      res = await this.fetch(API_ORIGIN + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new OfflineError();
    }
    if (res.status === 204) return undefined;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, String(json?.error ?? 'unknown'));
    return json;
  }
}

/** Words for an error from signing in, for showing to the person. */
export function signInErrorMessage(error: unknown): string {
  if (error instanceof OfflineError)
    return "Couldn't reach AndThen. Check your connection and try again.";
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'bad_email':
        return "That email address doesn't look right.";
      case 'too_many_requests':
        return 'Too many tries. Wait a little while, then try again.';
      case 'wrong_code':
        return "That code isn't right. Check the email and try again.";
      case 'code_expired':
        return 'That code has expired. Ask for a new one.';
      case 'email_not_set_up':
      case 'email_failed':
        return "We couldn't send the email just now. Try again later.";
    }
  }
  return 'Something went wrong. Try again.';
}
