/**
 * State HMAC tests — protect against state-tampering CSRF.
 * Run from the repo root: `npx vitest run website/lib/__tests__`
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.OAUTH_STATE_SECRET = 'a'.repeat(64);
});

describe('state', () => {
  it('round-trips a payload through encode/decode', async () => {
    const { encodeState, decodeState } = await import('../state');
    const encoded = encodeState({ callback: 'http://127.0.0.1:5555/handoff' });
    const decoded = decodeState(encoded);
    expect(decoded?.callback).toBe('http://127.0.0.1:5555/handoff');
    expect(decoded?.nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rejects state with a tampered body', async () => {
    const { encodeState, decodeState } = await import('../state');
    const encoded = encodeState({ callback: 'http://127.0.0.1:5555/handoff' });
    const [body, sig] = encoded.split('.');
    const tamperedBody = Buffer.from('{"nonce":"00","callback":"http://evil.example"}').toString('base64url');
    expect(decodeState(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it('rejects malformed state strings', async () => {
    const { decodeState } = await import('../state');
    expect(decodeState('')).toBeNull();
    expect(decodeState('only-one-part')).toBeNull();
    expect(decodeState('not-base64!!.deadbeef')).toBeNull();
  });

  it('isAllowedLoopback only permits 127.0.0.1 / localhost http URLs', async () => {
    const { isAllowedLoopback } = await import('../state');
    expect(isAllowedLoopback('http://127.0.0.1:5555/handoff')).toBe(true);
    expect(isAllowedLoopback('http://localhost:5555/handoff')).toBe(true);
    expect(isAllowedLoopback('https://127.0.0.1:5555/handoff')).toBe(false);
    expect(isAllowedLoopback('http://rvf.dev/handoff')).toBe(false);
    expect(isAllowedLoopback('not a url')).toBe(false);
  });
});
