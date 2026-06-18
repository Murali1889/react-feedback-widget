/**
 * Production refusal — createSheetsHandler must refuse unwrapped calls
 * in production, since the legacy path exposes `getAuthUrl`/`exchangeCode`
 * actions without authentication.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSheetsHandler } from '../sheets.js';

const origEnv = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'CID';
  process.env.GOOGLE_CLIENT_SECRET = 'CS';
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = 'RT';
  process.env.GOOGLE_SPREADSHEET_ID = 'SP-1';
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...origEnv };
  global.fetch = undefined;
});

describe('createSheetsHandler production refusal', () => {
  it('refuses unwrapped POST in production with a 403', async () => {
    process.env.NODE_ENV = 'production';
    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    const res = await handler(
      { body: { action: 'append', feedbackData: { feedback: 'hi' } } },
      null
    );
    expect(res.status).toBe(403);
    const body = JSON.parse(await res.text());
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/unwrapped/);
  });

  it('refuses the high-risk exchangeCode action in production', async () => {
    process.env.NODE_ENV = 'production';
    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    const res = await handler(
      { body: { action: 'exchangeCode', code: 'attacker-code' } },
      null
    );
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows unwrapped POST when __allowUnwrappedInProd is set (explicit opt-in)', async () => {
    process.env.NODE_ENV = 'production';
    global.fetch.mockResolvedValue({
      ok: true, status: 200,
      headers: new Map(),
      json: async () => ({ values: [['hdr']] }),
      text: async () => '{}',
    });
    const handler = createSheetsHandler({ __allowUnwrappedInProd: true, __suppressInsecureWarning: true });
    const res = await handler(
      { body: { action: 'append', feedbackData: { feedback: 'hi' } } },
      null
    );
    expect(res.status).not.toBe(403);
  });

  it('allows wrapped path in production (withSecureDefaults injected authContext)', async () => {
    process.env.NODE_ENV = 'production';
    global.fetch.mockResolvedValue({
      ok: true, status: 200,
      headers: new Map(),
      json: async () => ({ access_token: 'AT', expires_in: 3600 }),
      text: async () => '{}',
    });
    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    // withSecureDefaults invocation shape — feedbackData + ctx with authContext
    await expect(
      handler({ feedback: 'hi' }, { authContext: { userId: 'u1' } })
    ).resolves.toBeDefined();
  });

  it('allows unwrapped POST in development (no refusal)', async () => {
    process.env.NODE_ENV = 'development';
    global.fetch.mockResolvedValue({
      ok: true, status: 200,
      headers: new Map(),
      json: async () => ({ values: [['hdr']] }),
      text: async () => '{}',
    });
    const handler = createSheetsHandler({ __suppressInsecureWarning: true });
    const res = await handler(
      { body: { action: 'append', feedbackData: { feedback: 'hi' } } },
      null
    );
    expect(res.status).not.toBe(403);
  });
});
