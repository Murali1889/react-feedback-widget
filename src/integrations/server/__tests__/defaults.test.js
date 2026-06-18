import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  defaultOriginValidator,
  defaultRateLimiter,
  defaultErrorNormalizer,
  isServerlessRuntime,
} from '../defaults.js';

const reqWith = (origin, host, ip = '1.1.1.1') => ({ origin, headers: { host }, ip });

describe('defaultOriginValidator', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.FEEDBACK_ALLOWED_ORIGINS;
  });

  it('accepts same-origin', () => {
    expect(defaultOriginValidator(reqWith('https://app.example.com', 'app.example.com'))).toBe(true);
  });

  it('accepts localhost in development', () => {
    process.env.NODE_ENV = 'development';
    expect(defaultOriginValidator(reqWith('http://localhost:3000', 'localhost:3000'))).toBe(true);
  });

  it('rejects different origin without env allowlist', () => {
    expect(defaultOriginValidator(reqWith('https://evil.com', 'app.example.com'))).toBe(false);
  });

  it('accepts env allowlist match', () => {
    process.env.FEEDBACK_ALLOWED_ORIGINS = 'https://partner.com,https://app.example.com';
    expect(defaultOriginValidator(reqWith('https://partner.com', 'app.example.com'))).toBe(true);
  });

  it('returns true when origin missing (same-origin form post)', () => {
    expect(defaultOriginValidator({ origin: null, headers: { host: 'app.example.com' } })).toBe(true);
  });
});

describe('defaultRateLimiter', () => {
  it('allows under the limit', async () => {
    const limiter = defaultRateLimiter.create({ limit: 3, windowMs: 60_000 });
    await limiter({ ip: '1.1.1.1', headers: {} }, {});
    await limiter({ ip: '1.1.1.1', headers: {} }, {});
    await expect(limiter({ ip: '1.1.1.1', headers: {} }, {})).resolves.toBeUndefined();
  });

  it('throws once over the limit', async () => {
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '2.2.2.2', headers: {} }, {});
    await expect(limiter({ ip: '2.2.2.2', headers: {} }, {})).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('keys by IP + user separately', async () => {
    const limiter = defaultRateLimiter.create({ limit: 1, windowMs: 60_000 });
    await limiter({ ip: '3.3.3.3', headers: {} }, { userId: 'u1' });
    await expect(
      limiter({ ip: '3.3.3.3', headers: {} }, { userId: 'u2' })
    ).resolves.toBeUndefined();
  });
});

describe('isServerlessRuntime', () => {
  const SENTINELS = [
    'VERCEL', 'AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV',
    'NETLIFY', 'K_SERVICE', 'FUNCTION_TARGET',
    'CF_PAGES', 'CF_WORKER', 'DENO_DEPLOYMENT_ID',
  ];
  const original = {};

  beforeEach(() => {
    SENTINELS.forEach((k) => { original[k] = process.env[k]; delete process.env[k]; });
  });
  afterEach(() => {
    SENTINELS.forEach((k) => {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    });
  });

  it('returns false in a clean Node environment', () => {
    expect(isServerlessRuntime()).toBe(false);
  });

  for (const sentinel of ['VERCEL', 'AWS_LAMBDA_FUNCTION_NAME', 'NETLIFY', 'K_SERVICE', 'DENO_DEPLOYMENT_ID']) {
    it(`detects ${sentinel}`, () => {
      process.env[sentinel] = '1';
      expect(isServerlessRuntime()).toBe(true);
    });
  }
});

describe('defaultErrorNormalizer', () => {
  it('translates known error codes to safe responses', () => {
    const r = defaultErrorNormalizer({ code: 'unauthorized', message: 'token expired' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('unauthorized');
  });

  it('opaque server_error for unknown errors with request id', () => {
    const r = defaultErrorNormalizer(new Error('postgres connection lost'));
    expect(r.status).toBe(500);
    expect(r.body.error).toBe('server_error');
    expect(r.body.message).not.toContain('postgres');
    expect(r.body.message).toMatch(/req=/);
  });

  it('rate_limited includes Retry-After header', () => {
    const r = defaultErrorNormalizer({ code: 'rate_limited', retryAfter: 60 });
    expect(r.status).toBe(429);
    expect(r.headers['Retry-After']).toBe('60');
  });
});
