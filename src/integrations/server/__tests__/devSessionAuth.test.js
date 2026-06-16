import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { devSessionAuth, signSession } from '../devSessionAuth.js';

let origEnv;
beforeEach(() => { origEnv = process.env.NODE_ENV; });
afterEach(() => { process.env.NODE_ENV = origEnv; });

describe('devSessionAuth — dev mode', () => {
  it('returns a stub session when NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'development';
    const authorize = devSessionAuth();
    const result = await authorize({});
    expect(result).toMatchObject({ userId: 'dev-user', role: 'developer' });
  });

  it('does not warn more than once across N calls (no log spam)', async () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const authorize = devSessionAuth();
    await authorize({});
    await authorize({});
    await authorize({});
    // The module-level flag means we warn AT MOST once across the test's
    // process. Just assert we didn't warn 3 times.
    const matching = warn.mock.calls.filter((c) => /stub session/.test(c[0]));
    expect(matching.length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});

describe('devSessionAuth — production refusal', () => {
  it('throws in production without secret + without allowProductionStub', async () => {
    process.env.NODE_ENV = 'production';
    const authorize = devSessionAuth();
    await expect(authorize({})).rejects.toThrow(/NODE_ENV=production/);
  });

  it('error message points to the real-auth alternatives', async () => {
    process.env.NODE_ENV = 'production';
    const authorize = devSessionAuth();
    try {
      await authorize({});
    } catch (e) {
      expect(e.message).toMatch(/NextAuth/);
      expect(e.message).toMatch(/signSession/);
      expect(e.message).toMatch(/allowProductionStub/);
    }
  });

  it('honors explicit { allowProductionStub: true }', async () => {
    process.env.NODE_ENV = 'production';
    const authorize = devSessionAuth({ allowProductionStub: true });
    const result = await authorize({});
    expect(result.userId).toBe('dev-user');
  });
});

describe('devSessionAuth — signed-cookie production mode', () => {
  const SECRET = 'test-secret-XXXX';

  it('returns null when no cookie present', async () => {
    process.env.NODE_ENV = 'production';
    const authorize = devSessionAuth({ secret: SECRET });
    const result = await authorize({ headers: { get: () => null } });
    expect(result).toBeNull();
  });

  it('returns null when cookie signature is invalid', async () => {
    process.env.NODE_ENV = 'production';
    const authorize = devSessionAuth({ secret: SECRET });
    const req = {
      headers: { get: (k) => k === 'cookie' ? 'rvf_session=tampered.deadbeef' : null },
    };
    expect(await authorize(req)).toBeNull();
  });

  it('returns the session when cookie is valid', async () => {
    process.env.NODE_ENV = 'production';
    const cookieValue = signSession({ userId: 'alice', projectId: 'acme', role: 'admin' }, SECRET);
    const authorize = devSessionAuth({ secret: SECRET });
    const req = {
      headers: { get: (k) => k === 'cookie' ? `rvf_session=${encodeURIComponent(cookieValue)}` : null },
    };
    const result = await authorize(req);
    expect(result).toMatchObject({ userId: 'alice', projectId: 'acme', role: 'admin' });
  });

  it('rejects expired sessions (maxAgeSeconds = 1)', async () => {
    process.env.NODE_ENV = 'production';
    const cookieValue = signSession({ userId: 'alice' }, SECRET);
    // Wait past the 1-second expiry window
    await new Promise((r) => setTimeout(r, 1100));
    const authorize = devSessionAuth({ secret: SECRET, maxAgeSeconds: 1 });
    const req = {
      headers: { get: (k) => k === 'cookie' ? `rvf_session=${encodeURIComponent(cookieValue)}` : null },
    };
    expect(await authorize(req)).toBeNull();
  });

  it('reads cookies from Express-shape req.cookies too', async () => {
    process.env.NODE_ENV = 'production';
    const cookieValue = signSession({ userId: 'alice' }, SECRET);
    const authorize = devSessionAuth({ secret: SECRET });
    const req = { cookies: { rvf_session: cookieValue } };
    const result = await authorize(req);
    expect(result.userId).toBe('alice');
  });

  it('reads cookies from Next.js Pages-shape req.headers.cookie too', async () => {
    process.env.NODE_ENV = 'production';
    const cookieValue = signSession({ userId: 'alice' }, SECRET);
    const authorize = devSessionAuth({ secret: SECRET });
    const req = { headers: { cookie: `rvf_session=${encodeURIComponent(cookieValue)}` } };
    const result = await authorize(req);
    expect(result.userId).toBe('alice');
  });
});

describe('signSession', () => {
  it('throws when secret is missing', () => {
    expect(() => signSession({ userId: 'u' }, '')).toThrow(/secret/);
    expect(() => signSession({ userId: 'u' })).toThrow(/secret/);
  });

  it('produces a payload.sig formatted string', () => {
    const value = signSession({ userId: 'u' }, 'secret');
    expect(value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('different secrets produce different signatures', () => {
    const a = signSession({ userId: 'u' }, 'secret-a');
    const b = signSession({ userId: 'u' }, 'secret-b');
    expect(a).not.toBe(b);
  });
});
