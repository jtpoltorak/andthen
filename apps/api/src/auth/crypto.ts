import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** Six digits, leading zeros kept, from a cryptographic source. */
export function newCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** A session token: 32 random bytes, URL-safe. Only its hash is ever stored. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** The stored form of a sign-in code. The email is mixed in so equal codes hash differently. */
export function hashCode(email: string, code: string): string {
  return sha256(`${email}:${code}`);
}

/** Compares two hex hashes without leaking where they differ through timing. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-cased and trimmed, or undefined when it doesn't look like an email address. */
export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : undefined;
}
