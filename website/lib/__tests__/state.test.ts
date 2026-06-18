/**
 * State HMAC tests — protect against state-tampering CSRF + replay.
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
    expect(typeof decoded?.iat).toBe('number');
  });

  it('rejects state with a tampered body', async () => {
    const { encodeState, decodeState } = await import('../state');
    const encoded = encodeState({ callback: 'http://127.0.0.1:5555/handoff' });
    const [body, sig] = encoded.split('.');
    const tamperedBody = Buffer.from('{"nonce":"00","iat":1,"callback":"http://evil.example"}').toString('base64url');
    expect(decodeState(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it('rejects malformed state strings', async () => {
    const { decodeState } = await import('../state');
    expect(decodeState('')).toBeNull();
    expect(decodeState('only-one-part')).toBeNull();
    expect(decodeState('not-base64!!.deadbeef')).toBeNull();
  });

  it('rejects state older than 10 minutes (replay protection)', async () => {
    const { encodeState, decodeState } = await import('../state');
    const t0 = 1_700_000_000_000;
    const encoded = encodeState({ callback: 'http://127.0.0.1:5555/handoff' }, () => t0);
    // 9 min 59s later — still accepted
    expect(decodeState(encoded, () => t0 + 9 * 60_000 + 59_000)).not.toBeNull();
    // 10 min 1s later — rejected
    expect(decodeState(encoded, () => t0 + 10 * 60_000 + 1_000)).toBeNull();
  });

  it('refuses to encode/decode when OAUTH_STATE_SECRET is short', async () => {
    const { vi } = await import('vitest');
    const prev = process.env.OAUTH_STATE_SECRET;
    vi.resetModules();
    process.env.OAUTH_STATE_SECRET = 'tooshort';
    try {
      const { encodeState, decodeState } = await import('../state');
      expect(() => encodeState({ callback: 'http://127.0.0.1:5555/handoff' }))
        .toThrow(/at least 32/);
      expect(() => decodeState('anything.atall'))
        .toThrow(/at least 32/);
    } finally {
      process.env.OAUTH_STATE_SECRET = prev;
      vi.resetModules();
    }
  });

  it('credentialsConfigured flags a short OAUTH_STATE_SECRET as weak (not missing)', async () => {
    const { vi } = await import('vitest');
    const prev = process.env.OAUTH_STATE_SECRET;
    vi.resetModules();
    process.env.OAUTH_STATE_SECRET = 'shortsecret';
    process.env.GITHUB_OAUTH_CLIENT_ID = 'cid';
    process.env.GITHUB_OAUTH_CLIENT_SECRET = 'csecret';
    try {
      const { credentialsConfigured } = await import('../credentials/github');
      const r = credentialsConfigured();
      expect(r.ok).toBe(false);
      expect(r.weak).toContain('OAUTH_STATE_SECRET');
      expect(r.missing).not.toContain('OAUTH_STATE_SECRET');
    } finally {
      process.env.OAUTH_STATE_SECRET = prev;
      delete process.env.GITHUB_OAUTH_CLIENT_ID;
      delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
      vi.resetModules();
    }
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
