/**
 * OAuth state helpers — HMAC-signed payload that round-trips through
 * the provider's authorize URL and back into our callback handler.
 *
 * The payload carries:
 *   - nonce     (random — prevents CSRF / replay)
 *   - iat       (issued-at — lets decodeState reject stale state)
 *   - callback  (optional CLI loopback URL the post-OAuth client should POST to)
 *
 * Encoded as base64url(JSON):HEX_HMAC so a 3-line decode + verify is
 * enough on the callback side. No server-side session storage needed.
 *
 * Refuses to operate if OAUTH_STATE_SECRET is short or empty — a short
 * HMAC secret is functionally equivalent to no secret (the signature
 * becomes attacker-guessable).
 */
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { OAUTH_STATE_SECRET } from './credentials/github';

export type StatePayload = {
  nonce: string;
  iat: number;
  callback?: string;
};

const MIN_SECRET_LEN = 32;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — OAuth flow is rarely longer

function assertSecret(): void {
  if (!OAUTH_STATE_SECRET || OAUTH_STATE_SECRET.length < MIN_SECRET_LEN) {
    throw new Error(
      `OAUTH_STATE_SECRET must be at least ${MIN_SECRET_LEN} characters. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
}

export function encodeState(payload: Omit<StatePayload, 'nonce' | 'iat'>, now: () => number = Date.now): string {
  assertSecret();
  const fullPayload: StatePayload = {
    ...payload,
    nonce: randomBytes(16).toString('hex'),
    iat: now(),
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function decodeState(state: string, now: () => number = Date.now): StatePayload | null {
  assertSecret();
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;

  const expectedSig = sign(body);
  if (!constantTimeEqual(sig, expectedSig)) return null;

  let parsed: StatePayload;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof parsed.iat !== 'number' || parsed.iat <= 0) return null;
  if (now() - parsed.iat > MAX_AGE_MS) return null;
  return parsed;
}

function sign(body: string): string {
  return createHmac('sha256', OAUTH_STATE_SECRET).update(body).digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Loopback URLs must point at 127.0.0.1 / localhost so we never POST a
 * token to an arbitrary public host even if a hijacker rewrote the
 * callback query param.
 */
export function isAllowedLoopback(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:') return false;
    if (!['127.0.0.1', 'localhost'].includes(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
